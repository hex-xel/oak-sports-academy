/**
 * @file packages/shared/src/index.ts
 * Single entry point for the shared package.
 *
 * Only types and pure utility functions belong here — no Node.js built-ins,
 * no browser APIs, no expo-specific imports. This package is consumed by
 * apps/api (Node) and apps/mobile (React Native), so it must remain
 * environment-agnostic.
 *
 * Shared authentication wire types exclude internal database/session material.
 */

export const SHARED_VERSION = "0.0.1";

export { PERMISSIONS, ROLE_PERMISSIONS, permissionsForRole, hasPermissions } from "./permissions.js";
export type { AcademyRole } from "./permissions.js";
export { ERROR_CODES, VALIDATION_FIELDS, isErrorCode } from "./error-codes.js";
export type { ErrorCode, ValidationField, ApiErrorResponse } from "./error-codes.js";
export type { AuthAccountStatus, UserSummary, LoginRequest, LoginResponse, SessionResponse, LogoutResponse } from "./auth-types.js";
export type { RegistrationStudentType, RegistrationStatus, RegistrationStartRequest,
  RegistrationStartResponse, RegistrationVerifyRequest, RegistrationVerifyResponse,
  RegistrationResendRequest, RegistrationResendResponse, RegistrationAgreementsRequest,
  RegistrationAgreementsResponse, RegistrationGuardian, RegistrationProfile,
  RegistrationSubmitRequest, RegistrationReceipt, RegistrationProgressResponse,
  RegistrationDocumentSlot, RegistrationDocumentResponse } from "./registration.js";
