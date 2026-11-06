import React, { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import type { UserSummary } from "@oak/shared";
import { parseLoginResponse, parseSessionResponse } from "./auth-response";
import { api, ApiClientError } from "./api";
import { deleteSessionToken, getSessionToken, setSessionToken, TokenStorageError } from "./token-store";

/** Local navigation state only; a signedIn client never substitutes for API authorization. */
export type AuthState = Readonly<{
  status: "restoring" | "signedOut" | "signedIn";
  user: UserSummary | null;
  storageError: boolean;
  restoreError?: boolean;
  sessionEnded?: boolean;
  logoutPending?: boolean;
  logoutCleanupFailed?: boolean;
  logoutRemoteFailed?: boolean;
}>;

/** Secure storage adapters, optionally injected by tests; never a second persistence layer. */
export type AuthStorage = Readonly<{
  read: typeof getSessionToken; write: typeof setSessionToken; remove: typeof deleteSessionToken;
}>;

/**
 * Creates one provider's local session lifecycle, with serialized secure storage operations.
 * @param storage SecureStore adapters; default native implementation never logs or falls back.
 * @param confirm Optional bounded server session lookup; provider uses the real API.
 * @param revoke Bounded current-session logout; invoked before local deletion, never replayed automatically.
 * @returns Observable state, startup confirmation, signIn, remote signOut and local cleanup actions.
 * @throws Safe storage/response errors from async actions; confirmation errors expose retry state.
 * @remarks Existing tokens keep restoring until the server validates identity. No cached
 * user grants access. Logout hides protected identity immediately and always attempts
 * secure cleanup, including after offline/timeout/server failures. A failed delete blocks
 * sign-in/restoration until explicit cleanup retry, without claiming local logout success.
 */
export function createAuthState(storage: AuthStorage = {
  read: getSessionToken, write: setSessionToken, remove: deleteSessionToken,
}, confirm?: () => Promise<unknown>, revoke: () => Promise<unknown> = api.logout) {
  let state: AuthState = Object.freeze({ status: "restoring", user: null, storageError: false });
  const listeners = new Set<() => void>();
  let queue = Promise.resolve();
  let generation = 0;
  let invalidation: Promise<void> | undefined;
  let logout: Promise<void> | undefined;
  let restoration: Promise<void> | undefined;
  function publish(next: AuthState): void {
    state = Object.freeze(next);
    listeners.forEach((notify) => notify());
  }
  function serialize(work: () => Promise<void>): Promise<void> {
    const next = queue.then(work);
    queue = next.catch(() => {});
    return next;
  }
  async function clearAfterLogout(current: number, remoteFailed: boolean, ended = false): Promise<void> {
    try {
      await storage.remove();
      if (current === generation) publish({ status: "signedOut", user: null, storageError: false,
        ...(remoteFailed ? { logoutRemoteFailed: true } : {}), ...(ended ? { sessionEnded: true } : {}) });
    } catch {
      if (current === generation) publish({ status: "signedOut", user: null, storageError: true,
        logoutCleanupFailed: true, ...(remoteFailed ? { logoutRemoteFailed: true } : {}),
        ...(ended ? { sessionEnded: true } : {}) });
      throw new TokenStorageError();
    }
  }
  const actions = {
    getSnapshot: () => state,
    subscribe: (notify: () => void) => { listeners.add(notify); return () => { listeners.delete(notify); }; },
    restore: () => {
      if (logout || invalidation || state.logoutCleanupFailed) return Promise.resolve();
      if (restoration) return restoration;
      const current = generation;
      restoration = serialize(async () => {
        if (current !== generation) return;
        publish({ status: "restoring", user: null, storageError: false });
        try {
          const token = await storage.read();
          // A newer login/logout owns identity; do not start a stale server lookup.
          if (current !== generation) return;
          if (current === generation && token === null) publish({ status: "signedOut", user: null, storageError: false });
          if (token !== null && confirm) {
            try {
              const response = parseSessionResponse(await confirm());
              if (current === generation) publish({ status: "signedIn", user: response.user, storageError: false });
            } catch (error) {
              if (current !== generation) return;
              if (error instanceof ApiClientError && error.status === 401) {
                await storage.remove();
                if (current === generation) publish({ status: "signedOut", user: null, storageError: false, sessionEnded: true });
              } else publish({ status: "restoring", user: null, storageError: false, restoreError: true });
            }
          }
        } catch {
          if (current === generation) publish({ status: "restoring", user: null, storageError: true });
          throw new TokenStorageError();
        }
      }).finally(() => { restoration = undefined; });
      return restoration;
    },
    signIn: (response: unknown) => {
      if (logout || invalidation || state.logoutCleanupFailed) return Promise.reject(new TokenStorageError());
      const result = parseLoginResponse(response);
      const current = ++generation;
      return serialize(async () => {
        if (current !== generation) return;
        try {
          await storage.write(result.sessionToken);
          if (current === generation) publish({ status: "signedIn", user: result.user, storageError: false });
        } catch {
          if (current === generation) publish({ status: "signedOut", user: null, storageError: true });
          throw new TokenStorageError();
        }
      });
    },
    invalidateSession: () => {
      // Logout already hides identity and owns cleanup; do not wait on its network
      // request from a future 401 callback, which could deadlock that same request.
      if (logout || state.logoutCleanupFailed) return Promise.resolve();
      if (invalidation) return invalidation;
      const current = ++generation;
      publish({ status: "signedOut", user: null, storageError: false, sessionEnded: true });
      invalidation = serialize(async () => {
        try { await storage.remove(); }
        catch {
          if (current === generation) publish({ status: "signedOut", user: null, storageError: true,
            sessionEnded: true, logoutCleanupFailed: true });
          throw new TokenStorageError();
        }
      }).finally(() => { invalidation = undefined; });
      return invalidation;
    },
    signOut: () => {
      if (logout) return logout;
      const current = ++generation;
      publish({ status: "signedOut", user: null, storageError: false, logoutPending: true });
      // Queue behind any secure write, so revoke reads the token that actually reached
      // storage and a delayed write cannot resurrect the session after cleanup.
      logout = serialize(async () => {
        let remoteFailed = false;
        try { await revoke(); }
        catch { remoteFailed = true; }
        finally { await clearAfterLogout(current, remoteFailed); }
      }).finally(() => { logout = undefined; });
      return logout;
    },
    retryLogoutCleanup: () => {
      if (logout) return logout;
      if (!state.logoutCleanupFailed) return Promise.resolve();
      const remoteFailed = state.logoutRemoteFailed === true;
      const ended = state.sessionEnded === true;
      const current = ++generation;
      publish({ status: "signedOut", user: null, storageError: false, logoutPending: true });
      logout = serialize(() => clearAfterLogout(current, remoteFailed, ended)).finally(() => { logout = undefined; });
      return logout;
    },
  };
  return { ...actions,
    /** Captures request ownership so a late 401 cannot clear a newer login. */
    captureUnauthorized: () => {
      const current = generation;
      return () => current === generation ? actions.invalidateSession() : Promise.resolve();
    },
  };
}

/** Context contract; async actions surface safe failures for an explicit retry UI. */
export type AuthContextValue = AuthState & Readonly<{
  signIn: (response: unknown) => Promise<void>;
  signOut: () => Promise<void>;
  invalidateSession: () => Promise<void>;
  retryStorageRead: () => Promise<void>;
  retryLogoutCleanup: () => Promise<void>;
}>;
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provides auth lifecycle with bounded, nonrenewing server confirmation on startup.
 * @param children Native routes sharing this provider's session state/actions.
 * @returns Context provider; startup and subscription state drive route guards.
 * @throws No intentional render errors; async failures expose safe recovery state.
 * @remarks Registers/unregisters transport rejection handling and starts secure restoration.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const holder = useRef<ReturnType<typeof createAuthState> | null>(null);
  holder.current ??= createAuthState(undefined, api.session);
  const session = holder.current;
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => {
    const unregister = api.setUnauthorizedHandler(session.captureUnauthorized);
    void session.restore().catch(() => { /* State exposes safe retry feedback. */ });
    return unregister;
  }, [session]);
  return <AuthContext.Provider value={{ ...state, signIn: session.signIn,
    signOut: session.signOut, invalidateSession: session.invalidateSession,
    retryStorageRead: session.restore, retryLogoutCleanup: session.retryLogoutCleanup }}>{children}</AuthContext.Provider>;
}

/** Returns provider state/actions; throws a static developer error outside AuthProvider, no I/O. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider.");
  return value;
}
