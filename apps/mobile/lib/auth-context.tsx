import React, { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import type { UserSummary } from "@oak/shared";
import { parseLoginResponse } from "./auth-response";
import { deleteSessionToken, getSessionToken, setSessionToken, TokenStorageError } from "./token-store";

/** Local navigation state only; a signedIn client never substitutes for API authorization. */
export type AuthState = Readonly<{
  status: "restoring" | "signedOut" | "signedIn";
  user: UserSummary | null;
  storageError: boolean;
}>;

/** Secure storage adapters, optionally injected by tests; never a second persistence layer. */
export type AuthStorage = Readonly<{
  read: typeof getSessionToken; write: typeof setSessionToken; remove: typeof deleteSessionToken;
}>;

/**
 * Creates one provider's local session lifecycle, with serialized secure storage operations.
 * @param storage SecureStore adapters; default native implementation never logs or falls back.
 * @returns Observable immutable state, local startup read, signIn and local invalidation.
 * @throws Safe storage/response errors from async actions; no implicit remote calls.
 * @remarks Existing tokens keep restoring until US3 validates server identity. No cached
 * user grants access. signOut is local cleanup only; T047 must revoke remotely first.
 */
export function createAuthState(storage: AuthStorage = {
  read: getSessionToken, write: setSessionToken, remove: deleteSessionToken,
}) {
  let state: AuthState = Object.freeze({ status: "restoring", user: null, storageError: false });
  const listeners = new Set<() => void>();
  let queue = Promise.resolve();
  let generation = 0;
  let invalidation: Promise<void> | undefined;
  function publish(next: AuthState): void {
    state = Object.freeze(next);
    listeners.forEach((notify) => notify());
  }
  function serialize(work: () => Promise<void>): Promise<void> {
    const next = queue.then(work);
    queue = next.catch(() => {});
    return next;
  }
  return {
    getSnapshot: () => state,
    subscribe: (notify: () => void) => { listeners.add(notify); return () => { listeners.delete(notify); }; },
    restore: () => {
      const current = generation;
      return serialize(async () => {
        if (current !== generation) return;
        publish({ status: "restoring", user: null, storageError: false });
        try {
          const token = await storage.read();
          if (current === generation && token === null) publish({ status: "signedOut", user: null, storageError: false });
          // T050 supplies server-confirmed restoration; presence alone never signs in.
        } catch {
          if (current === generation) publish({ status: "restoring", user: null, storageError: true });
          throw new TokenStorageError();
        }
      });
    },
    signIn: (response: unknown) => {
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
      if (invalidation) return invalidation;
      const current = ++generation;
      publish({ status: "signedOut", user: null, storageError: false });
      invalidation = serialize(async () => {
        try { await storage.remove(); }
        catch {
          if (current === generation) publish({ status: "signedOut", user: null, storageError: true });
          throw new TokenStorageError();
        }
      }).finally(() => { invalidation = undefined; });
      return invalidation;
    },
  };
}

/** Context contract; async actions surface safe failures for an explicit retry UI. */
export type AuthContextValue = AuthState & Readonly<{
  signIn: (response: unknown) => Promise<void>;
  signOut: () => Promise<void>;
  invalidateSession: () => Promise<void>;
  retryStorageRead: () => Promise<void>;
}>;
const AuthContext = createContext<AuthContextValue | null>(null);

/** Provides local auth lifecycle; startup reads storage, with server restoration deferred to US3. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const holder = useRef<ReturnType<typeof createAuthState> | null>(null);
  holder.current ??= createAuthState();
  const session = holder.current;
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  useEffect(() => { void session.restore().catch(() => { /* State exposes safe retry feedback. */ }); }, [session]);
  return <AuthContext.Provider value={{ ...state, signIn: session.signIn,
    signOut: session.invalidateSession, invalidateSession: session.invalidateSession,
    retryStorageRead: session.restore }}>{children}</AuthContext.Provider>;
}

/** Returns provider state/actions; throws a static developer error outside AuthProvider, no I/O. */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth requires AuthProvider.");
  return value;
}
