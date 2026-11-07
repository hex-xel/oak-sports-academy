/**
 * @file apps/mobile/features/registration/validation.ts
 * Pure client-side validation and formatting for the registration wizard.
 *
 * No I/O, logging or persistence: API routes independently validate their inputs.
 * Personal/profile finalization remains a later integration; these checks grant no access.
 *
 * Copy rules used throughout: sentence case, action first ("Enter your email address"),
 * one consistent pattern per field family, no raw error codes and no blame.
 */

import type { RegistrationDraft, RegistrationErrors } from "./types";

/** Minimum password length agreed in the registration mockup and sticker sheet. */
export const PASSWORD_MIN_LENGTH = 8;

/** Upper bound that keeps hashing cheap; mirrors the login client-side cap. */
export const PASSWORD_MAX_LENGTH = 128;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Latin-1 letters plus space, hyphen, apostrophe and period cover Filipino names. */
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ.' -]+$/;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MOBILE_INVALID_MESSAGE =
  "Enter a 10-digit mobile number starting with 9, like 917 555 0124.";

/** One live password requirement, rendered as a checklist item. */
export interface PasswordRule {
  id: "length" | "uppercase" | "lowercase" | "number" | "special";
  label: string;
  met: boolean;
}

/**
 * Evaluates the five password requirements shown under the password field.
 *
 * @param value Current password text; an empty value reports every rule as unmet.
 * @returns Rules in display order with their satisfaction state.
 */
export function passwordRules(value: string): PasswordRule[] {
  return [
    { id: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH },
    { id: "uppercase", label: "At least one uppercase letter (A–Z)", met: /[A-Z]/.test(value) },
    { id: "lowercase", label: "At least one lowercase letter (a–z)", met: /[a-z]/.test(value) },
    { id: "number", label: "At least one number (0–9)", met: /\d/.test(value) },
    { id: "special", label: "At least one special character (!@#$%)", met: /[^A-Za-z0-9\s]/.test(value) },
  ];
}

/**
 * Reports whether a password satisfies every requirement.
 *
 * @param value Current password text.
 * @returns True when all five rules pass; never trims or mutates the value.
 */
export function meetsPasswordPolicy(value: string): boolean {
  return passwordRules(value).every((rule) => rule.met);
}

/** Trims and lower-cases an email for storage; display still uses the raw input. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Drops a pasted country code or trunk prefix so `+63 917…` and `0917…` both land on the
 * ten national digits. Only applies to over-long input, so typing a leading 0 still shows
 * what was typed and lets inline validation explain the correct format.
 */
function stripNationalPrefix(digits: string): string {
  if (digits.length > 10 && digits.startsWith("63")) return digits.slice(2);
  if (digits.length > 10 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

/**
 * Formats national mobile digits as `917 555 0124`.
 *
 * @param value Raw input; non-digits are dropped, a pasted `63`/`0` prefix is removed and
 * the result is capped at ten national digits.
 * @returns Space-grouped digits (3-3-4) for display inside the "+63" prefix field.
 */
export function formatMobileNational(value: string): string {
  const digits = stripNationalPrefix(value.replace(/\D/g, "")).slice(0, 10);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)]
    .filter((part) => part.length > 0)
    .join(" ");
}

/**
 * Maximum length of the formatted national number (`917 555 0124` = 10 digits + 2 spaces).
 *
 * Passed to the field as `maxLength` so the native input refuses an eleventh digit
 * instead of accepting it and snapping back on the next render.
 */
export const MOBILE_NUMBER_MAX_LENGTH = 12;

/**
 * Strips formatting from a mobile number before it is stored or validated.
 *
 * @param value Raw field value.
 * @returns Digits only, capped at 10 characters.
 */
export function mobileDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

/**
 * Parses an ISO calendar date and rejects impossible days such as 31 February.
 *
 * @param iso Date in `yyyy-mm-dd` form.
 * @returns Parsed parts, or null when the text is not a real calendar date.
 */
export function parseIsoDate(
  iso: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return { year, month, day };
}

/**
 * Computes age in whole years from a birth date.
 *
 * @param iso Birth date in `yyyy-mm-dd` form.
 * @param today Reference day; defaults to the device's local date.
 * @returns Age in years, or null for invalid or future dates.
 * @remarks Uses local calendar parts, not UTC instants, so a birth date never shifts
 * by a day depending on the device timezone.
 */
export function computeAge(iso: string, today: Date = new Date()): number | null {
  const parsed = parseIsoDate(iso);
  if (!parsed) return null;
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  if (parsed.year > currentYear) return null;
  if (
    parsed.year === currentYear &&
    (parsed.month > currentMonth || (parsed.month === currentMonth && parsed.day > currentDay))
  ) {
    return null;
  }
  let age = currentYear - parsed.year;
  const hadBirthday =
    parsed.month < currentMonth || (parsed.month === currentMonth && parsed.day <= currentDay);
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * Reports whether a birth date falls after today.
 *
 * @param iso Birth date in `yyyy-mm-dd` form.
 * @param today Reference day; defaults to now.
 * @returns True when the date is in the future; false for invalid dates.
 */
export function isFutureDate(iso: string, today: Date = new Date()): boolean {
  const parsed = parseIsoDate(iso);
  if (!parsed) return false;
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  if (parsed.year !== currentYear) return parsed.year > currentYear;
  if (parsed.month !== currentMonth) return parsed.month > currentMonth;
  return parsed.day > currentDay;
}

/**
 * Decides whether a registration needs parent/guardian details.
 *
 * @param iso Birth date in `yyyy-mm-dd` form (null/empty means not yet provided).
 * @returns True only when the age is known and below 18.
 */
export function isMinorRegistration(iso: string | null): boolean {
  if (!iso) return false;
  const age = computeAge(iso);
  return age !== null && age < 18;
}

/**
 * Formats a stored birth date for the read-only field, e.g. `15 March 2002`.
 *
 * @param iso Birth date in `yyyy-mm-dd` form.
 * @returns Human-readable date, or an empty string when the value is not parseable.
 */
export function formatDateOfBirth(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  const month = MONTH_NAMES[parsed.month - 1] ?? "";
  return `${parsed.day} ${month} ${parsed.year}`;
}

/**
 * Builds the age helper text shown under the date-of-birth field.
 *
 * @param age Computed age, or null while the date is missing or invalid.
 * @returns Copy matching the sticker sheet pattern (`Calculated: age 24 · Adult`).
 */
export function ageSummary(age: number | null): string {
  if (age === null) return "Calculated automatically from a valid date of birth.";
  const bracket = age < 18 ? "Minor · guardian details required" : "Adult";
  return `Calculated: age ${age} · ${bracket}`;
}

function nameError(
  value: string,
  emptyMessage: string,
  invalidMessage: string,
  required: boolean,
): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return required ? emptyMessage : undefined;
  if (trimmed.length > 60 || !NAME_PATTERN.test(trimmed)) return invalidMessage;
  return undefined;
}

function mobileError(value: string, emptyMessage: string): string | undefined {
  const digits = mobileDigits(value);
  if (digits.length === 0) return emptyMessage;
  if (!/^9\d{9}$/.test(digits)) return MOBILE_INVALID_MESSAGE;
  return undefined;
}

/**
 * Validates step 2 (account credentials).
 *
 * @param draft Current wizard values.
 * @returns Inline messages for email, password and confirmation.
 */
export function validateCredentials(draft: RegistrationDraft): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const email = normalizeEmail(draft.email);
  if (email.length === 0) errors.email = "Enter your email address.";
  else if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address, like name@example.com.";
  }
  if (draft.password.length === 0) errors.password = "Create a password.";
  else if (!meetsPasswordPolicy(draft.password)) {
    errors.password = "Your password doesn't meet all the requirements below.";
  }
  if (draft.confirmPassword.length === 0) errors.confirmPassword = "Re-enter your password.";
  else if (draft.confirmPassword !== draft.password) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

/**
 * Validates step 3 (personal information).
 *
 * @param draft Current wizard values.
 * @returns Inline messages for names, gender and birth date.
 */
export function validatePersonalInformation(draft: RegistrationDraft): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const firstName = nameError(draft.firstName, "Enter your first name.", "Use letters only for your first name.", true);
  if (firstName) errors.firstName = firstName;
  const middleName = nameError(draft.middleName, "", "Use letters only for your middle name, or leave it empty.", false);
  if (middleName) errors.middleName = middleName;
  const surname = nameError(draft.surname, "Enter your surname.", "Use letters only for your surname.", true);
  if (surname) errors.surname = surname;
  if (!draft.gender) errors.gender = "Select your gender.";
  if (!draft.dateOfBirth) {
    errors.dateOfBirth = "Select your date of birth.";
  } else if (isFutureDate(draft.dateOfBirth)) {
    errors.dateOfBirth = "Date of birth can't be in the future.";
  } else {
    const age = computeAge(draft.dateOfBirth);
    if (age === null || age > 120) errors.dateOfBirth = "Enter a valid date of birth.";
  }
  return errors;
}

/**
 * Validates step 4 (contact details, plus guardian details for minors).
 *
 * @param draft Current wizard values.
 * @returns Inline messages for address, mobile and any required guardian fields.
 */
export function validateContactDetails(draft: RegistrationDraft): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const mobile = mobileError(draft.mobile, "Enter your mobile number.");
  if (mobile) errors.mobile = mobile;
  if (draft.houseAndLot.trim().length === 0) errors.houseAndLot = "Enter your house and lot number.";
  if (draft.barangay.trim().length === 0) errors.barangay = "Enter your barangay.";
  if (draft.municipality.trim().length === 0) errors.municipality = "Enter your municipality or city.";
  if (draft.province.trim().length === 0) errors.province = "Enter your province.";

  if (isMinorRegistration(draft.dateOfBirth)) {
    const guardianName = nameError(
      draft.guardian.name,
      "Enter your parent or guardian's full name.",
      "Use letters only for your guardian's name.",
      true,
    );
    if (guardianName) errors.guardianName = guardianName;
    if (!draft.guardian.relationship) {
      errors.guardianRelationship = "Select your guardian's relationship to you.";
    }
    const guardianContact = mobileError(
      draft.guardian.contact,
      "Enter your guardian's mobile number.",
    );
    if (guardianContact) errors.guardianContact = guardianContact;
  }
  return errors;
}

/**
 * Validates step 5 (2×2 photo and valid ID).
 *
 * @param draft Current wizard values.
 * @param uploadsRequired Whether missing documents block the step. False while the
 * device picker is not wired, so the UI can still be reviewed end to end.
 * @returns Inline messages for the missing documents.
 */
export function validateRequirements(
  draft: RegistrationDraft,
  uploadsRequired: boolean,
): RegistrationErrors {
  if (!uploadsRequired) return {};
  const errors: RegistrationErrors = {};
  if (!draft.uploads.photo2x2) errors.photo2x2 = "Upload a 2×2 photo to continue.";
  if (!draft.uploads.validId) errors.validId = "Upload the front of your valid ID to continue.";
  return errors;
}

/**
 * Validates step 6 (waiver and consent checkboxes).
 *
 * @param draft Current wizard values.
 * @returns A form-level message until all three agreements are accepted.
 */
export function validateTerms(draft: RegistrationDraft): RegistrationErrors {
  const { waiver, fitness, terms } = draft.consents;
  if (waiver && fitness && terms) return {};
  return { consents: "Accept all three agreements before submitting your registration." };
}
