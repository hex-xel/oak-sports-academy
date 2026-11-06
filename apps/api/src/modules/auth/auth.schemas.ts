import { z } from "zod";
import { ApiError } from "../../middleware/error-handler.js";

/** Normalized 3–254 character email; exactly one @, no whitespace and a dotted domain. */
export const loginEmailSchema = z.string().trim().toLowerCase().min(3).max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

/** Native login JSON; strips extra claims and preserves the 1–128 character password exactly. */
export const loginSchema = z.object({ email: loginEmailSchema, password: z.string().min(1).max(128) }).strip();

/** Logout accepts no body or an object whose extra claims are stripped; identity comes only from Bearer. */
export const logoutSchema = z.object({}).strip().optional();

/** Auth routes have no path parameters; strip unexpected properties under the approved contract. */
export const authParamsSchema = z.object({}).strip();
/** Auth routes have no query parameters; never accept credentials or privilege claims from them. */
export const authQuerySchema = z.object({}).strip();
/** Exact native client header; combined/duplicate/unknown values are unsupported. */
export const mobileClientSchema = z.literal("mobile");

/**
 * Check the exact native transport discriminator, never proof of account identity.
 * @param value Untrusted parsed header value.
 * @returns The literal mobile on success.
 * @throws ApiError/UNSUPPORTED_CLIENT for any other value; performs no I/O.
 */
export function validateMobileClient(value: unknown): "mobile" {
  if (!mobileClientSchema.safeParse(value).success) throw new ApiError("UNSUPPORTED_CLIENT");
  return "mobile";
}
