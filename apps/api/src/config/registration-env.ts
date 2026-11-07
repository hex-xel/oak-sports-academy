import { z } from "zod";

const email = z.string().trim().toLowerCase().min(3).max(254).regex(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/);
const sender = z.string().trim().max(300).transform(value => {
  const match = /^(?:Oak Sports Academy <([^<>]+)>|([^<>]+))$/.exec(value);
  return match?.[1] ?? match?.[2] ?? "";
}).pipe(email);
const schema = z.object({
  RESEND_API_KEY: z.string().min(10).max(256).regex(/^re_[A-Za-z0-9_-]+$/),
  REGISTRATION_EMAIL_FROM: sender,
  REGISTRATION_OTP_HMAC_KEY: z.string().regex(/^[0-9a-f]{64}$/),
  REGISTRATION_TEST_RECIPIENT: email.optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
}).superRefine((config, context) => {
  const domain = config.REGISTRATION_EMAIL_FROM.split("@")[1];
  if (domain === "resend.dev" && (config.REGISTRATION_EMAIL_FROM !== "onboarding@resend.dev" ||
    config.NODE_ENV === "production" || !config.REGISTRATION_TEST_RECIPIENT)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["REGISTRATION_EMAIL_FROM"] });
  }
});

/** Private server settings only; never serialize this object or expose public env equivalents. */
export type RegistrationEnv = Readonly<{
  apiKey: string;
  from: string;
  otpKey: string;
  testRecipient: string | undefined;
}>;

/**
 * Parse registration settings independently of existing login configuration.
 * @param source Server environment snapshot; defaults to already loaded process variables.
 * @returns Frozen private settings with the fixed academy sender display name.
 * @throws Error naming invalid variables only, never values or nested validator causes.
 * @remarks Pure: no .env reads, provider calls, logging, DB connection or source mutation.
 * The shared test sender is development-only and requires an explicit recipient restriction.
 */
export function parseRegistrationEnv(source: NodeJS.ProcessEnv = process.env): RegistrationEnv {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map(issue => String(issue.path[0] ?? "configuration")))];
    throw new Error(`Invalid registration environment: ${names.join(", ")}.`);
  }
  const config = parsed.data;
  return Object.freeze({ apiKey: config.RESEND_API_KEY,
    from: `Oak Sports Academy <${config.REGISTRATION_EMAIL_FROM}>`,
    otpKey: config.REGISTRATION_OTP_HMAC_KEY, testRecipient: config.REGISTRATION_TEST_RECIPIENT });
}
