const project = "ewycpsuzzfonoolvhyeu";

/**
 * Validate the owner-confirmed development database URL without opening a connection.
 * @param value Private connection string; never include it in diagnostics.
 * @param role Expected restricted runtime or migration login.
 * @returns The original URL after target, TLS, database and role checks.
 * @throws A static error for any unrecognized target or connection option.
 * @remarks No I/O. Session pooling on port 5432 is allowed; transaction pooling is refused.
 */
export function registrationDevelopmentUrl(value: string | undefined, role: "oak_api" | "postgres"): string {
  const reject = () => new Error("Development target refused; check private connection settings.");
  try {
    if (!value || /\s|%(?![0-9a-f]{2})/i.test(value)) throw reject();
    const url = new URL(value);
    const direct = url.hostname === `db.${project}.supabase.co`;
    const pooler = /^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname);
    const user = decodeURIComponent(url.username);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || (!direct && !pooler) ||
      user !== (direct ? role : `${role}.${project}`) || !decodeURIComponent(url.password) ||
      url.pathname !== "/postgres" || (url.port && url.port !== "5432") || url.hash ||
      url.searchParams.get("sslmode") !== "require") throw reject();
    const keys = Array.from(url.searchParams.keys());
    if (new Set(keys).size !== keys.length || keys.some(key => !["sslmode", "connection_limit"].includes(key)) ||
      (url.searchParams.has("connection_limit") && !/^[1-9]\d?$/.test(url.searchParams.get("connection_limit")!))) throw reject();
    return value;
  } catch { throw reject(); }
}
