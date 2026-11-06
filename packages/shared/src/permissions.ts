/** Named capability bits; none override ownership, entitlement or database restrictions. */
export const PERMISSIONS = Object.freeze({
  SELF_READ: 1,
  SELF_PROFILE_EDIT: 2,
  PHOTO_UPLOAD: 2,
  TRAINING_SELF: 4,
  SESSION_REVOKE: 8,
  STUDENTS_MANAGE: 16,
  PACKAGES_MANAGE: 32,
  PAYMENTS_MANAGE: 64,
  ATTENDANCE_MANAGE: 128,
  EVALUATIONS_MANAGE: 256,
  SETTINGS_MANAGE: 512,
} as const);

/** Supported business roles; registration and request payloads cannot choose them. */
export type AcademyRole = "STUDENT" | "ADMIN";

/** Unsigned masks; Student self-profile editing never grants management capabilities. */
export const ROLE_PERMISSIONS = Object.freeze({ STUDENT: 15, ADMIN: 0xffffffff });

/**
 * Resolve a database-loaded role without inheriting object/prototype properties.
 * @param role Untrusted runtime value; only exact supported role names are accepted.
 * @returns Its unsigned mask, or zero for legacy/unknown roles. No side effects/errors.
 */
export function permissionsForRole(role: unknown): number {
  return role === "STUDENT" ? ROLE_PERMISSIONS.STUDENT : role === "ADMIN" ? ROLE_PERMISSIONS.ADMIN : 0;
}

/**
 * Test every requested bit using unsigned 32-bit semantics.
 * @param actual Server-loaded mask; malformed, signed or out-of-range values fail closed.
 * @param required Nonzero route mask. Zero is rejected to avoid a vacuous authorization gate.
 * @returns True only when both masks are valid and all requested bits are present.
 * @remarks Pure; no exceptions or side effects. It does not check identity or ownership.
 */
export function hasPermissions(actual: unknown, required: unknown): boolean {
  return typeof actual === "number" && Number.isInteger(actual) && actual >= 0 && actual <= 0xffffffff &&
    typeof required === "number" && Number.isInteger(required) && required > 0 && required <= 0xffffffff &&
    ((actual & required) >>> 0) === (required >>> 0);
}
