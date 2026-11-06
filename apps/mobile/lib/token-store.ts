import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "oak.auth.session-token";

/** Safe storage failure; contains no native exception, token, or telemetry side effect. */
export class TokenStorageError extends Error {
  /** Creates a static error for callers to offer retry without exposing native details. */
  constructor() {
    super("Unable to access secure session storage. Please try again.");
    this.name = "TokenStorageError";
  }
}

/**
 * Reads the opaque session token without changing storage or authenticating the user.
 * @returns The saved token, or null only when SecureStore reports no entry.
 * @throws TokenStorageError when secure storage cannot be read; callers must not
 * interpret this as a missing token or clear an existing session on read failure.
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    throw new TokenStorageError();
  }
}

/**
 * Persists a server-issued opaque token in device secure storage only.
 * @param token Token returned by a validated successful login response; never a password.
 * @returns Resolves only after the secure write completes.
 * @throws TokenStorageError on invalid input or failed write. No fallback or deletion
 * is attempted; callers must await success before entering signedIn.
 */
export async function setSessionToken(token: string): Promise<void> {
  if (typeof token !== "string" || token.length === 0) throw new TokenStorageError();
  try {
    // Foreground restoration needs no locked-device access or cross-device keychain migration.
    await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    throw new TokenStorageError();
  }
}

/**
 * Deletes the saved token locally; does not revoke the remote session.
 * @returns Resolves after SecureStore confirms deletion, including a missing entry.
 * @throws TokenStorageError on deletion failure. Callers must offer retry rather than
 * claiming successful local logout; no alternative storage or logging is used.
 */
export async function deleteSessionToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch {
    throw new TokenStorageError();
  }
}
