import { existsSync } from "node:fs";
import { isIP } from "node:net";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { z } from "zod";

function postgresUrl(value: string): boolean {
  try {
    const url = new URL(value);
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
    return ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname && url.username && url.password && url.pathname.length > 1) &&
      !url.hash && !/[\s<>\[\]]/.test(value) && !/%(?![0-9a-f]{2})/i.test(value);
  } catch {
    return false;
  }
}

const databaseUrl = z.string().min(1).refine(postgresUrl);
const positiveInteger = z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int());
const schema = z.object({
  DATABASE_URL: databaseUrl,
  // Optional for the runtime deployment: only migration tooling needs this secret.
  DIRECT_URL: databaseUrl.optional(),
  PORT: positiveInteger.pipe(z.number().min(1).max(65535)).default("3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SESSION_TTL_HOURS: z.literal("8").default("8").transform(Number),
  TRUST_PROXY_IPS: z.string().default("").refine((value) =>
    value === "" || value.split(",").every((entry) => isIP(entry.trim()) !== 0)),
}).superRefine((config, context) => {
  if (!postgresUrl(config.DATABASE_URL)) return;
  const username = decodeURIComponent(new URL(config.DATABASE_URL).username);
  const expected = config.NODE_ENV === "test" ? /^oak_api(?:_test)?(?:\.[a-z0-9]+)?$/ : /^oak_api(?:\.[a-z0-9]+)?$/;
  if (!expected.test(username)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["DATABASE_URL"], message: "Restricted runtime login required" });
  }
});

/**
 * Validated API runtime settings. DIRECT_URL is intentionally excluded: it belongs
 * to migration tooling, not Prisma's request-processing client. URLs are secrets.
 */
export type RuntimeEnv = Readonly<{
  DATABASE_URL: string;
  PORT: number;
  NODE_ENV: "development" | "test" | "production";
  SESSION_TTL_HOURS: number;
  TRUST_PROXY: false | string[];
}>;

/**
 * Validate an environment snapshot without connecting to the database or logging it.
 * @param source Environment variables, defaulting to the current process environment.
 * @returns Parsed runtime settings; privileged DIRECT_URL is never included.
 * @throws Error listing invalid variable names only, with no values or nested causes.
 * @remarks Has no filesystem or database side effects; does not mutate source.
 */
export function parseEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "configuration")))];
    throw new Error(`Invalid API environment: ${names.join(", ")}. Check apps/api/.env or deployment settings.`);
  }
  const config = parsed.data;
  return Object.freeze<RuntimeEnv>({
    DATABASE_URL: config.DATABASE_URL,
    PORT: config.PORT,
    NODE_ENV: config.NODE_ENV,
    SESSION_TTL_HOURS: config.SESSION_TTL_HOURS,
    TRUST_PROXY: config.TRUST_PROXY_IPS ? config.TRUST_PROXY_IPS.split(",").map((ip) => ip.trim()) : false,
  });
}

/**
 * Load the API-local development .env if present, then validate settings immediately.
 * @returns Validated runtime settings, without a database connection.
 * @throws Error with safe variable names or a generic file-loading error.
 * @remarks Uses Node 22's loader; existing process variables take precedence. Production
 * and test environments never implicitly load the development .env. Do not log the result.
 */
export function loadEnv(): RuntimeEnv {
  const localFile = fileURLToPath(new URL("../../.env", import.meta.url));
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test" && existsSync(localFile)) {
    try {
      loadEnvFile(localFile);
    } catch {
      throw new Error("Unable to load the API environment file.");
    }
  }
  return parseEnv();
}

/** Validated singleton; importing this module fails before API startup on bad settings. */
export const env = loadEnv();
