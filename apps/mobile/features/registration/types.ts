/**
 * @file apps/mobile/features/registration/types.ts
 * Data model and option lists for the six-step student registration wizard.
 *
 * Credentials/verification now use the API; personal details and files remain local
 * until the final agreements/upload integration. Recovery stores only separate proof/
 * operation/email metadata, never this complete draft. Fields mirror master §7.1.
 */

/** Student type selected on step 1; drives no behavior yet beyond the wizard copy. */
export type StudentType = "newly-white-belt" | "experienced";

/** Gender values offered by the registration form. */
export type Gender = "male" | "female";

/** Guardian relationship options agreed in specifications.md §7.1. */
export type GuardianRelationship = "parent" | "aunt-uncle" | "sibling" | "other";

/** The two required documents on step 5. */
export type UploadSlot = "photo2x2" | "validId";

/**
 * Keys for inline validation messages. One key per user-editable field so a step can
 * clear exactly the message the user is fixing.
 */
export type RegistrationField =
  | "studentType"
  | "email"
  | "password"
  | "confirmPassword"
  | "firstName"
  | "middleName"
  | "surname"
  | "gender"
  | "dateOfBirth"
  | "mobile"
  | "houseAndLot"
  | "barangay"
  | "municipality"
  | "province"
  | "guardianName"
  | "guardianRelationship"
  | "guardianOccupation"
  | "guardianContact"
  | "photo2x2"
  | "validId"
  | "consents";

/** Inline messages for the current step; absent keys mean "no problem to report". */
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

/** Parent/guardian block, collected only when the computed age is under 18. */
export interface GuardianDraft {
  name: string;
  relationship: GuardianRelationship | null;
  occupation: string;
  contact: string;
}

/** Everything the wizard collects across all six steps. */
export interface RegistrationDraft {
  studentType: StudentType | null;
  email: string;
  password: string;
  confirmPassword: string;
  /** Mirrors server-backed registration state; never authorizes API access itself. */
  emailVerified: boolean;
  firstName: string;
  middleName: string;
  surname: string;
  gender: Gender | null;
  /** ISO calendar date (`yyyy-mm-dd`); timezone-free because it is a birth date. */
  dateOfBirth: string | null;
  /** National digits without the `+63` prefix, e.g. `9175550124`. */
  mobile: string;
  houseAndLot: string;
  barangay: string;
  municipality: string;
  province: string;
  guardian: GuardianDraft;
  /** Document type chosen for the uploaded ID; the file itself is a placeholder. */
  validIdType: string | null;
  /** Placeholder file names; real uploads are not wired yet. */
  uploads: Record<UploadSlot, string | null>;
  consents: { waiver: boolean; fitness: boolean; terms: boolean };
}

/** Gender choices shown in the personal-information step. */
export const GENDER_OPTIONS: ReadonlyArray<{ value: Gender; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

/** Guardian relationship choices from specifications.md §7.1. */
export const RELATIONSHIP_OPTIONS: ReadonlyArray<{
  value: GuardianRelationship;
  label: string;
}> = [
  { value: "parent", label: "Parent" },
  { value: "aunt-uncle", label: "Aunt/Uncle" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
];

/**
 * Accepted ID types.
 *
 * TODO(registration): replace with the academy's approved ID list once the registration
 * feature specification defines it; these mirror the single option shown in the mockup
 * plus the usual Philippine school/identity documents.
 */
export const VALID_ID_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "philid", label: "Philippine National ID (PhilID / ePhilID)" },
  { value: "passport", label: "Passport" },
  { value: "drivers-license", label: "Driver's License" },
  { value: "school-id", label: "School ID" },
  { value: "other", label: "Other government ID" },
];

/**
 * Narrows a raw select value back to a known gender.
 *
 * @param value Value emitted by the gender select.
 * @returns The typed gender, or null when the value is not an offered option.
 */
export function toGender(value: string): Gender | null {
  return GENDER_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

/**
 * Narrows a raw select value back to an approved guardian relationship.
 *
 * @param value Value emitted by the relationship select.
 * @returns The typed relationship, or null when the value is not an offered option.
 */
export function toRelationship(value: string): GuardianRelationship | null {
  return RELATIONSHIP_OPTIONS.find((option) => option.value === value)?.value ?? null;
}

/** Returns a pristine draft so a remount never reuses stale input. */
export function createEmptyDraft(): RegistrationDraft {  return {
    studentType: null,
    email: "",
    password: "",
    confirmPassword: "",
    emailVerified: false,
    firstName: "",
    middleName: "",
    surname: "",
    gender: null,
    dateOfBirth: null,
    mobile: "",
    houseAndLot: "",
    barangay: "",
    municipality: "",
    province: "",
    guardian: { name: "", relationship: null, occupation: "", contact: "" },
    validIdType: null,
    uploads: { photo2x2: null, validId: null },
    consents: { waiver: false, fitness: false, terms: false },
  };
}
