import { z } from "zod";
import type { RegistrationAgreementsRequest, RegistrationResendRequest,
  RegistrationStartRequest, RegistrationSubmitRequest, RegistrationVerifyRequest } from "@oak/shared";
import { loginEmailSchema } from "../auth/auth.schemas.js";

const operationId = z.string().uuid().transform(value => value.toLowerCase());
const shortText = (length: number) => z.string().trim().min(1).max(length);
const mobile = z.string().regex(/^9\d{9}$/);
const calendarDate = z.string().regex(/^(?!0000)\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

/** New registration complexity from the wizard; preserves password whitespace/content exactly. */
export const registrationPasswordSchema = z.string().min(8).max(128)
  .regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9\s]/);

/** Strict credential DTO rejects role/status/verified claims; normalization matches existing login. */
export const registrationStartSchema = z.object({
  operationId,
  studentType: z.enum(["newly-white-belt", "experienced"]),
  email: loginEmailSchema,
  password: registrationPasswordSchema,
}).strict() satisfies z.ZodType<RegistrationStartRequest>;

/** Exactly six ASCII digits; leading zeroes are retained as strings. */
export const registrationVerifySchema = z.object({ challengeId: operationId,
  code: z.string().regex(/^[0-9]{6}$/),
}).strict() satisfies z.ZodType<RegistrationVerifyRequest>;

/** New explicit issue operation; neither client time nor expiry is accepted. */
export const registrationResendSchema = z.object({ operationId, challengeId: operationId })
  .strict() satisfies z.ZodType<RegistrationResendRequest>;

/** Approved policy only; all agreements must be literally true. */
export const registrationAgreementsSchema = z.object({ operationId,
  policyVersion: z.literal("registration-2026-11-06"),
  waiver: z.literal(true), fitness: z.literal(true), terms: z.literal(true),
}).strict() satisfies z.ZodType<RegistrationAgreementsRequest>;

const guardian = z.object({ name: shortText(200),
  relationship: z.enum(["parent", "aunt-uncle", "sibling", "other"]),
  occupation: shortText(100), contact: mobile,
}).strict();

/** Bounded final input only; T015 additionally computes Manila age/guardian eligibility. */
export const registrationSubmitSchema = z.object({ operationId, consentId: operationId,
  photoDocumentId: operationId, validIdDocumentId: operationId,
  profile: z.object({ firstName: shortText(100), middleName: z.string().trim().max(100).optional(),
    surname: shortText(100), gender: z.enum(["male", "female"]), dateOfBirth: calendarDate,
    mobile, houseAndLot: shortText(255), barangay: shortText(100), municipality: shortText(100),
    province: shortText(100), guardian: guardian.optional(),
    validIdType: z.enum(["philid", "passport", "drivers-license", "school-id", "other"]),
  }).strict(),
}).strict() satisfies z.ZodType<RegistrationSubmitRequest>;

/** Exact upload route slot; no arbitrary object path, URL or additional path parameters. */
export const registrationDocumentParamsSchema = z.object({ slot: z.enum(["photo2x2", "validId"]) }).strict();

/** Routes with no query inputs reject credential/proof data passed through URLs. */
export const registrationQuerySchema = z.object({}).strict();

/** Canonical proof value only; T010 separately rejects duplicate headers in rawHeaders. */
export const registrationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)
  .refine(value => Buffer.from(value, "base64url").toString("base64url") === value);
