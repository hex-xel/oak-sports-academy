import * as SecureStore from "expo-secure-store";
import type { RegistrationStartResponse, RegistrationStudentType } from "@oak/shared";
import { parseRegistrationFlow } from "./registration-api";

const key = "oak.registration.flow";

/** Minimal encrypted recovery context; never passwords, OTPs, profile fields or files. */
export type SavedRegistration = Readonly<{ operationId: string; email: string;
  studentType: RegistrationStudentType; flow?: RegistrationStartResponse }>;

/** Safe native storage failure; contains no underlying values, cause or telemetry. */
export class RegistrationStorageError extends Error {
  /** Construct fixed recovery feedback without I/O. */
  constructor() { super("Secure registration storage could not be accessed. Please try again."); this.name = "RegistrationStorageError"; }
}

function parse(value: unknown): SavedRegistration {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new RegistrationStorageError();
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some(name => !["operationId", "email", "studentType", "flow"].includes(name)) ||
    typeof row.operationId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.operationId) ||
    typeof row.email !== "string" || row.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) ||
    (row.studentType !== "newly-white-belt" && row.studentType !== "experienced")) throw new RegistrationStorageError();
  return { operationId: row.operationId, email: row.email, studentType: row.studentType,
    ...(row.flow === undefined ? {} : { flow: parseRegistrationFlow(row.flow) }) };
}

/**
 * Read only registration recovery metadata, never the login key.
 * @returns Saved metadata or null only for a missing key.
 * @throws RegistrationStorageError on native/format failure. No fallback/logging.
 */
export async function readRegistration(): Promise<SavedRegistration | null> {
  try {
    const text = await SecureStore.getItemAsync(key);
    if (text === null) return null;
    if (text.length > 1_800) throw new RegistrationStorageError();
    return parse(JSON.parse(text));
  } catch { throw new RegistrationStorageError(); }
}

/**
 * Persist only projected registration metadata after an awaited native write.
 * @param value Operation/email/type and optional server proof; no profile or credential fields.
 * @returns Completion after secure write, without touching login storage.
 * @throws RegistrationStorageError on invalid data/native failure. No fallback/logging.
 */
export async function writeRegistration(value: SavedRegistration): Promise<void> {
  try {
    const text = JSON.stringify(parse(value));
    if (text.length > 1_800) throw new RegistrationStorageError();
    await SecureStore.setItemAsync(key, text, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch { throw new RegistrationStorageError(); }
}

/**
 * Clear only registration metadata; no remote revoke/account deletion or login mutation.
 * @returns Completion after native deletion, including an absent key.
 * @throws RegistrationStorageError on failure; callers block replacement until retry.
 */
export async function removeRegistration(): Promise<void> {
  try { await SecureStore.deleteItemAsync(key); } catch { throw new RegistrationStorageError(); }
}
