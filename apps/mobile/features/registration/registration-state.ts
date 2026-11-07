import type { RegistrationStudentType } from "@oak/shared";
import { ApiClientError } from "../../lib/api";
import type { createRegistrationApi } from "../../lib/registration-api";
import type { SavedRegistration } from "../../lib/registration-store";

/** Observable registration state; verified is confirmed server state, never a cached draft flag. */
export type RegistrationState = Readonly<{
  phase: "restoring" | "idle" | "starting" | "verifying" | "resending" | "storage";
  saved: SavedRegistration | null;
  verified: boolean;
  storageError: boolean;
  needsConfirmation: boolean;
  error: string | null;
  errorCode: string | null;
  blockedUntil: number;
  verificationLimited: boolean;
}>;

/** Trusted native/test adapters; no second persistence layer or login storage access. */
export type RegistrationDependencies = Readonly<{
  api: ReturnType<typeof createRegistrationApi>;
  storage: { read: () => Promise<SavedRegistration | null>; write: (value: SavedRegistration) => Promise<void>; remove: () => Promise<void> };
  newId: () => string;
}>;

function feedback(error: unknown): string {
  if (!(error instanceof ApiClientError)) return "Registration could not be confirmed. Please try again.";
  switch (error.code) {
    case "INVALID_VERIFICATION_CODE": return "Check the verification code and try again.";
    case "VERIFICATION_EXPIRED": return "This code has expired. Request a new code.";
    case "VERIFICATION_LIMITED": case "RATE_LIMITED": return "Too many attempts. Wait before trying again.";
    case "REGISTRATION_EXPIRED": return "Re-enter the original password to verify this flow again. If it has expired, contact the academy.";
    case "API_CONFIGURATION": return "The registration service is not configured. Please try again later.";
    case "VALIDATION_ERROR": return "Check the email and password requirements.";
    case "NETWORK_ERROR": case "TIMEOUT": return "The request was not confirmed. Check your connection and try again.";
    default: return "Registration could not be confirmed. Please try again.";
  }
}

/**
 * Construct one wizard's observable lifecycle using the existing auth-state factory pattern.
 * @param dependencies Independent registration API, SecureStore adapters and secure UUID generator.
 * @returns Subscribe/snapshot plus explicit restore/start/verify/resend/storage/reset actions.
 * @throws No intentional action errors: safe feedback is exposed in state, never raw causes.
 * @remarks Writes are serialized, stale generations cannot persist/advance, and passwords/
 * codes/profile/files are never saved. No automatic mutation replay or normal login mutation.
 */
export function createRegistrationState(dependencies: RegistrationDependencies) {
  let state: RegistrationState = { phase: "restoring", saved: null, verified: false,
    storageError: false, needsConfirmation: false, error: null, errorCode: null, blockedUntil: 0, verificationLimited: false };
  const listeners = new Set<() => void>();
  let generation = 0;
  let queue: Promise<unknown> = Promise.resolve();
  let storageMode: "read" | "write" | "remove" = "read";
  const publish = (change: Partial<RegistrationState>) => {
    state = Object.freeze({ ...state, ...change }); listeners.forEach(notify => notify());
  };
  function serialize<T>(current: number, work: () => Promise<T>): Promise<T | undefined> {
    const result = queue.then(() => current === generation ? work() : undefined);
    queue = result.catch(() => {}); return result;
  }
  const idle = () => state.phase === "idle" && !state.storageError && Date.now() >= state.blockedUntil;
  async function save(saved: SavedRegistration, verified: boolean, current: number): Promise<boolean> {
    if (current !== generation) return false;
    // Expose accepted credentials so the view erases password immediately, even if
    // persistence fails. Verified advancement still waits for the secure write.
    publish({ saved, verified: false }); storageMode = "write";
    try {
      await serialize(current, () => dependencies.storage.write(saved));
      if (current !== generation) return false;
      publish({ verified, storageError: false }); return true;
    } catch {
      if (current === generation) publish({ storageError: true, verified: false,
        error: "Secure registration storage could not be saved. Retry storage before continuing.", errorCode: null });
      return false;
    }
  }
  async function failed(error: unknown, current: number): Promise<void> {
    if (current !== generation) return;
    if (error instanceof ApiClientError && error.status === 401) error = new ApiClientError("REGISTRATION_EXPIRED", 401);
    if (error instanceof ApiClientError && error.status === 401 && state.saved) {
      const { operationId, email, studentType } = state.saved;
      if (!await save({ operationId, email, studentType }, false, current)) return;
    }
    if (current !== generation) return;
    const limited = error instanceof ApiClientError && error.status === 429;
    const retryAfter = error instanceof ApiClientError ? error.retryAfter : null;
    const seconds = limited && /^\d+$/.test(retryAfter ?? "") ? Math.min(900, Math.max(1, Number(retryAfter))) : 60;
    const uncertain = error instanceof ApiClientError &&
      (["NETWORK_ERROR", "TIMEOUT", "INVALID_RESPONSE"].includes(error.code) || error.status >= 500);
    publish({ verified: false, error: feedback(error), errorCode: error instanceof ApiClientError ? error.code : null,
      blockedUntil: limited ? Date.now() + seconds * 1000 : 0,
      verificationLimited: state.verificationLimited || (state.phase === "verifying" && error instanceof ApiClientError && error.code === "VERIFICATION_LIMITED"),
      needsConfirmation: uncertain && Boolean(state.saved?.flow) });
  }
  async function confirm(saved: SavedRegistration, current: number): Promise<boolean> {
    if (!saved.flow) return true;
    const response = await dependencies.api.current(saved.flow.registrationToken);
    if (current !== generation) return false;
    publish({ verified: response.verified, needsConfirmation: false }); return true;
  }
  const actions = {
    /** Read/confirm only; restoration never sends credentials, code or an automatic resend. */
    async restore(): Promise<boolean> {
      if (!["idle", "restoring"].includes(state.phase) && !state.storageError) return false;
      const current = ++generation;
      publish({ phase: "restoring", verified: false, error: null, errorCode: null, needsConfirmation: false }); storageMode = "read";
      try {
        const saved = await serialize(current, dependencies.storage.read);
        if (current !== generation) return false;
        publish({ saved: saved ?? null, storageError: false });
        if (saved) return await confirm(saved, current);
        return true;
      } catch (error) {
        if (current !== generation) return false;
        if (error instanceof ApiClientError) await failed(error, current);
        else publish({ storageError: true, error: "Secure registration storage could not be read. Retry or clear this registration." });
        return false;
      } finally { if (current === generation) publish({ phase: "idle" }); }
    },
    /** Save original operation before sending; retry never replaces another account's password. */
    async start(email: string, studentType: RegistrationStudentType, password: string): Promise<boolean> {
      if (!idle()) return false;
      const current = ++generation;
      const normalized = email.trim().toLowerCase();
      const same = state.saved?.email === normalized && state.saved.studentType === studentType;
      publish({ phase: "starting", verified: false, error: null, errorCode: null, needsConfirmation: false, verificationLimited: false });
      try {
        const saved: SavedRegistration = { operationId: same ? state.saved!.operationId : dependencies.newId(), email: normalized, studentType };
        if (!await save(saved, false, current) || current !== generation) return false;
        const flow = await dependencies.api.start({ ...saved, password });
        if (current !== generation) return false;
        return await save({ ...saved, flow }, false, current);
      } catch (error) { await failed(error, current); return false; }
      finally { if (current === generation) publish({ phase: "idle" }); }
    },
    /** Verify once; only a validated server response plus secure write permits advancement. */
    async verify(code: string): Promise<boolean> {
      const saved = state.saved;
      if (!idle() || !saved?.flow || state.needsConfirmation) return false;
      const current = ++generation; publish({ phase: "verifying", error: null, errorCode: null });
      try {
        const response = await dependencies.api.verify(saved.flow.registrationToken, saved.flow.challengeId, code);
        if (current !== generation) return false;
        return await save({ ...saved, flow: { ...saved.flow, registrationToken: response.registrationToken,
          registrationExpiresAt: response.registrationExpiresAt } }, true, current);
      } catch (error) { await failed(error, current); return false; }
      finally { if (current === generation) publish({ phase: "idle" }); }
    },
    /** Resend only on explicit action, with fresh UUID and rotated proof; no request replay. */
    async resend(): Promise<boolean> {
      const saved = state.saved;
      if (!idle() || !saved?.flow || state.needsConfirmation || state.verified) return false;
      const current = ++generation; publish({ phase: "resending", error: null, errorCode: null });
      try {
        const flow = await dependencies.api.resend(saved.flow.registrationToken, saved.flow.challengeId, dependencies.newId());
        if (current !== generation) return false;
        publish({ verificationLimited: false });
        return await save({ ...saved, flow }, false, current);
      } catch (error) { await failed(error, current); return false; }
      finally { if (current === generation) publish({ phase: "idle" }); }
    },
    /** Clear only registration state; pending deletes block replacement until explicit retry. */
    async reset(): Promise<boolean> {
      const current = ++generation; storageMode = "remove";
      publish({ phase: "storage", saved: null, verified: false, storageError: false,
        needsConfirmation: false, error: null, errorCode: null, blockedUntil: 0, verificationLimited: false });
      try {
        await serialize(current, dependencies.storage.remove);
        return current === generation;
      } catch {
        if (current === generation) publish({ storageError: true, error: "Previous registration storage could not be cleared. Retry before starting another flow." });
        return false;
      } finally { if (current === generation) publish({ phase: "idle" }); }
    },
    /** Retry secure I/O only; any cached proof is reconfirmed before verified advancement. */
    async retryStorage(): Promise<boolean> {
      if (state.phase !== "idle") return false;
      if (storageMode === "read") return actions.restore();
      if (storageMode === "remove") return actions.reset();
      const saved = state.saved;
      if (!saved) return actions.restore();
      const current = ++generation; publish({ phase: "storage", error: null, errorCode: null });
      try {
        if (!await save(saved, false, current)) return false;
        return await confirm(saved, current);
      } catch (error) { await failed(error, current); return false; }
      finally { if (current === generation) publish({ phase: "idle" }); }
    },
    /** Cancel obsolete callbacks on unmount; queued stale writes cannot resurrect proof. */
    cancel(): void { generation++; publish({ phase: "idle", verified: false }); },
    /** Clear correctable code feedback without resetting quotas or hiding storage failures. */
    clearCodeError(): void {
      if (!state.storageError && state.errorCode === "INVALID_VERIFICATION_CODE") publish({ error: null, errorCode: null });
    },
    /** Return stable immutable snapshot for useSyncExternalStore. */
    getSnapshot: () => state,
    /** Subscribe one view; cleanup removes only that subscriber. */
    subscribe: (notify: () => void) => { listeners.add(notify); return () => { listeners.delete(notify); }; },
  };
  return actions;
}
