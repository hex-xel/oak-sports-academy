import { createHash, randomUUID } from "node:crypto";
import type { AuditLog, Prisma } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "../../middleware/error-handler.js";

const genesis = "0".repeat(64);
const hexHash = /^[0-9a-f]{64}$/;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const eventSchema = z.object({
  userId: z.string().uuid().transform((value) => value.toLowerCase()),
  action: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  targetEntity: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
  targetId: z.string().min(1),
});

/** Trusted server event; supply explicit safe metadata, never an entire request/body. */
export type AuditEvent = {
  userId: string;
  action: string;
  targetEntity: string;
  targetId: string;
  payload: unknown;
};

/** Pure verification result; invalidIndex identifies an input position, not sensitive content. */
export type AuditVerificationResult =
  | { valid: true; checkedRecords: number; headHash: string }
  | { valid: false; invalidIndex: number };

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sensitiveKey(key: string): boolean {
  return /password|passphrase|token|authorization|cookie|otp|secret|apikey/.test(key.toLowerCase().replace(/[^a-z]/g, ""));
}

function canonical(value: unknown, seen: Set<object>, depth = 0): string {
  if (depth > 32) throw new ApiError("INTERNAL_ERROR");
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (typeof value !== "object" || seen.has(value)) throw new ApiError("INTERNAL_ERROR");
  const prototype = Object.getPrototypeOf(value);
  if ((!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) ||
    Object.getOwnPropertySymbols(value).length > 0) throw new ApiError("INTERNAL_ERROR");
  seen.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value)) {
      const items: string[] = [];
      for (let i = 0; i < value.length; i++) {
        const descriptor = descriptors[String(i)];
        if (!descriptor || !("value" in descriptor)) throw new ApiError("INTERNAL_ERROR");
        items.push(canonical(descriptor.value, seen, depth + 1));
      }
      return `[${items.join(",")}]`;
    }
    const items: string[] = [];
    for (const key of Object.keys(value).sort()) {
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor)) throw new ApiError("INTERNAL_ERROR");
      const content = sensitiveKey(key) ? JSON.stringify("[REDACTED]") : canonical(descriptor.value, seen, depth + 1);
      items.push(`${JSON.stringify(key)}:${content}`);
    }
    return `{${items.join(",")}}`;
  } finally {
    seen.delete(value);
  }
}

/**
 * Hash deterministic redacted JSON metadata using UTF-8 and Node SHA-256.
 * @param payload JSON-only safe event data; matching credential-like keys are redacted recursively.
 * @returns Lowercase SHA-256 digest, never the original serialized payload.
 * @throws ApiError/INTERNAL_ERROR for non-JSON values, cycles, accessors, or depth over 32.
 * @remarks Object keys sort lexically; array order and strings are preserved. No toJSON
 * hooks/normalization/logging/storage. Key redaction is defense in depth: callers must
 * not put sensitive values under innocuous keys or into event identifiers.
 */
export function hashAuditPayload(payload: unknown): string {
  try {
    return sha256(canonical(payload, new Set()));
  } catch {
    throw new ApiError("INTERNAL_ERROR");
  }
}

function recordHash(row: Pick<AuditLog, "previousHash" | "timestamp" | "userId" | "action" | "targetEntity" | "targetId" | "payloadHash">): string {
  // Exact specifications.md §4 concatenation; id is intentionally not part of the formula.
  return sha256(row.previousHash + row.timestamp.toISOString() + row.userId + row.action +
    row.targetEntity + row.targetId + row.payloadHash);
}

/**
 * Append an audit record inside an already authorized caller transaction.
 * @param tx Restricted runtime transaction established by withSession; never the outer client.
 * @param event Server-defined actor/action/target and explicit safe JSON metadata.
 * @returns Persisted audit record for internal use, with hashes but no original payload.
 * @throws ApiError for invalid internal event data, actor mismatch, or invalid head;
 * DB failures propagate to the safe error boundary and must roll back the caller mutation.
 * @remarks oak_audit_head takes advisory lock (1935764577,1) before reading the head;
 * it stays held until caller commit/rollback. The DB insert trigger independently checks
 * links/hash. Do not catch an append failure and commit a related administrative mutation.
 * Denial events use a separate authorized transaction after rejecting the business action.
 * No logging, nested transaction, administrative endpoint, or applied-migration edits.
 */
export async function appendAudit(tx: Prisma.TransactionClient, event: AuditEvent): Promise<AuditLog> {
  // PrismaClient structurally fits TransactionClient in TypeScript; reject accidental
  // outer-client use so the head lock cannot be released between standalone queries.
  if ("$transaction" in tx || "$connect" in tx) throw new ApiError("INTERNAL_ERROR");
  const parsed = eventSchema.safeParse(event);
  if (!parsed.success) throw new ApiError("INTERNAL_ERROR");
  const payloadHash = hashAuditPayload(event.payload);
  const heads = await tx.$queryRaw<Array<{ previousHash: string; userId: string | null }>>`
    SELECT public.oak_audit_head() AS "previousHash", public.oak_current_user_id()::text AS "userId"`;
  const head = heads[0];
  if (heads.length !== 1 || !head || !hexHash.test(head.previousHash)) throw new ApiError("INTERNAL_ERROR");
  if (head.userId !== parsed.data.userId) throw new ApiError("FORBIDDEN");
  const row = {
    id: randomUUID(), timestamp: new Date(), ...parsed.data, payloadHash, previousHash: head.previousHash,
  };
  return tx.auditLog.create({ data: { ...row, currentHash: recordHash(row) } });
}

/**
 * Verify a complete genesis-to-head chain supplied in hash-link order, without DB access.
 * @param rows Snapshot of internal audit records, ordered by links rather than timestamp.
 * @returns Valid count/head hash or first invalid input index; never raw event data/errors.
 * @remarks Checks record/hash shapes, duplicate IDs/links, and exact stored-field hashes.
 * It cannot reconstruct the original payload (only payloadHash is stored), authenticate
 * a privileged full rewrite, cryptographically protect id (omitted by the approved formula),
 * or detect tail truncation without a separately trusted checkpoint. Do not verify an
 * actor-filtered subset and call it a full-chain check. Empty genesis is valid.
 * @throws No intentional errors for malformed record fields; performs no I/O/logging.
 */
export function verifyAuditChain(rows: readonly AuditLog[]): AuditVerificationResult {
  let previous = genesis;
  const ids = new Set<string>();
  const links = new Set<string>();
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (!row || typeof row.id !== "string" || !uuid.test(row.id) || ids.has(row.id) ||
      typeof row.userId !== "string" || !uuid.test(row.userId) ||
      !(row.timestamp instanceof Date) || !Number.isFinite(row.timestamp.getTime()) ||
      typeof row.action !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(row.action) ||
      typeof row.targetEntity !== "string" || !/^[A-Za-z][A-Za-z0-9_]*$/.test(row.targetEntity) ||
      typeof row.targetId !== "string" || row.targetId.length === 0 ||
      typeof row.previousHash !== "string" || !hexHash.test(row.previousHash) ||
      typeof row.currentHash !== "string" || !hexHash.test(row.currentHash) ||
      typeof row.payloadHash !== "string" || !hexHash.test(row.payloadHash) ||
      row.previousHash !== previous || links.has(row.currentHash) || recordHash(row) !== row.currentHash) {
      return { valid: false, invalidIndex: index };
    }
    ids.add(row.id);
    links.add(row.currentHash);
    previous = row.currentHash;
  }
  return { valid: true, checkedRecords: rows.length, headHash: previous };
}
