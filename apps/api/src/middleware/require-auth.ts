import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { Request, RequestHandler, Response } from "express";
import { hasPermissions, permissionsForRole } from "@oak/shared";
import { prisma, withSession, type SessionIdentity } from "../lib/prisma.js";
import { appendAudit, type AuditEvent } from "../modules/audit/audit.service.js";
import { ApiError, SessionContextError } from "./error-handler.js";
import { requirePermission } from "./require-permission.js";
import { requireOwnership } from "./require-ownership.js";

/** Scoped protected operation; no Response object so output is sent only after commit. */
export type AuthWorkContext = Readonly<{
  tx: Prisma.TransactionClient;
  user: SessionIdentity;
  req: Request;
}>;

/** Server-only route classification and owner lookup; clients cannot select either. */
export type AuthRouteOptions = Readonly<{
  activity?: "background" | "interactive";
  client?: PrismaClient;
  owner?: (context: AuthWorkContext) => string | null | Promise<string | null>;
}>;

/**
 * Parse exactly one Authorization Bearer header, rejecting duplicates and ambiguity.
 * @param req Incoming request; reads only authorization header metadata, never logs it.
 * @returns Parsed opaque token for hashing; never attach the result to request state.
 * @throws SessionContextError on missing, duplicate or malformed input. No I/O side effects.
 */
export function readBearerToken(req: Request): string {
  const count = req.rawHeaders.filter((_, i) => i % 2 === 0 && req.rawHeaders[i]?.toLowerCase() === "authorization").length;
  const header = req.headers.authorization;
  if (count !== 1 || typeof header !== "string") throw new SessionContextError();
  const match = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/i.exec(header);
  if (!match?.[1]) throw new SessionContextError();
  return match[1];
}

function runGate(gate: RequestHandler, req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    // These internal gates only call next; never give scoped work the real response.
    gate(req, {} as Response, (error?: unknown) => error ? reject(error) : resolve());
  });
}

/**
 * Build a terminal protected JSON route preserving session scope through all DB work.
 * @param required Server-configured permission bits checked before ownership and work.
 * @param work Database-only operation returning safe JSON; throw for rejected operations.
 * @param options Trusted client/owner resolver and activity classification; defaults to
 * background and self-ownership (suitable for session lookup). No request identity claims.
 * @returns Express 4 handler sending 200 only after transaction commit; errors use next.
 * @throws TypeError at construction for invalid permission configuration.
 * @remarks Denial metadata is buffered in memory, the business transaction rolls back,
 * then a fresh nonrenewing verified transaction appends/commits the audit before 403.
 * Audit failure stays closed. No raw token/hash is exposed in req.auth or responses.
 * Do not make network calls, send responses, detach work or return raw DB rows in work.
 */
export function requireAuth(
  required: number,
  work: (context: AuthWorkContext) => Promise<unknown>,
  options: AuthRouteOptions = {},
): RequestHandler {
  // Validate route configuration before serving requests, even if no denial occurs.
  if (!hasPermissions(0xffffffff, required)) throw new TypeError("Invalid permission gate configuration");
  return (req, res, next): void => {
    delete req.auth;
    void (async () => {
      const tokenHash = createHash("sha256").update(readBearerToken(req), "utf8").digest("hex");
      const client = options.client ?? prisma;
      let denial: AuditEvent | undefined;
      try {
        const result = await withSession(tokenHash, async (tx, user) => {
          req.auth = Object.freeze({ userId: user.id, permissions: permissionsForRole(user.role) });
          const context = { tx, user, req };
          await runGate(requirePermission(required, { audit: async (event) => { denial = event; } }), req);
          try {
            await runGate(requireOwnership(async () => options.owner ? options.owner(context) : user.id), req);
          } catch (error) {
            if (error instanceof ApiError && error.code === "FORBIDDEN") {
              denial = { userId: user.id, action: "OWNERSHIP_DENIED", targetEntity: "Permission",
                targetId: String(required), payload: { required } };
            }
            throw error;
          }
          return work(context);
        }, client, options.activity ?? "background");
        res.status(200).json(result);
      } catch (error) {
        if (denial) {
          const event = denial;
          // This starts only after the rejected operation's transaction has settled.
          try {
            await withSession(tokenHash, async (tx, user) => {
              if (user.id !== event.userId) throw new SessionContextError();
              await appendAudit(tx, event);
            }, client, "background");
          } catch {
            throw new ApiError("INTERNAL_ERROR");
          }
        }
        throw error;
      } finally {
        delete req.auth;
      }
    })().catch(next);
  };
}
