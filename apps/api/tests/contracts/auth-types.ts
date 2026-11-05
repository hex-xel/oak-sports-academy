import type { LoginRequest, LoginResponse, SessionResponse, UserSummary, ApiErrorResponse } from "@oak/shared";

const user: UserSummary = { id: "synthetic-id", email: "synthetic@example.test", role: "STUDENT", status: "ACTIVE" };
const request: LoginRequest = { email: user.email, password: "synthetic" };
const response: LoginResponse = { user, landingPath: "/", sessionToken: "synthetic", expiresAt: "2026-11-05T12:00:00Z" };
const session: SessionResponse = { user, landingPath: "/", expiresAt: response.expiresAt };
const error: ApiErrorResponse = { code: "FORBIDDEN", message: "Safe static message" };
// @ts-expect-error A login response with token material cannot be reused as a session response.
const tokenEcho: SessionResponse = response;
// @ts-expect-error Raw database dates are not serialized wire timestamps.
const rawDate: SessionResponse = { ...session, expiresAt: new Date() };
// @ts-expect-error Credential-bearing rows must be explicitly projected before returning.
const passwordEcho: UserSummary = { ...user, passwordHash: "synthetic" };
// @ts-expect-error Legacy STAFF is not a supported business role.
const legacyRole: UserSummary = { ...user, role: "STAFF" };
// @ts-expect-error Role claims are not part of native credential bodies.
const roleClaim: LoginRequest = { ...request, role: "ADMIN" };
// @ts-expect-error Arbitrary server error codes cannot enter the shared contract.
const unknownError: ApiErrorResponse = { ...error, code: "RAW_SQL_ERROR" };
void [tokenEcho, rawDate, passwordEcho, legacyRole, roleClaim, unknownError];
