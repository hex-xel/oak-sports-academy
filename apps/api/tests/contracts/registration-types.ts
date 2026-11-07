import type { RegistrationStartRequest, RegistrationVerifyResponse,
  RegistrationProgressResponse, RegistrationSubmitRequest } from "@oak/shared";

const credentials: RegistrationStartRequest = { operationId: "synthetic-operation",
  studentType: "experienced", email: "synthetic@example.test", password: "synthetic" };
// @ts-expect-error Client authority cannot be included in registration credentials.
const elevated: RegistrationStartRequest = { ...credentials, role: "ADMIN" };
const verified: RegistrationVerifyResponse = { verified: true, registrationToken: "synthetic-proof",
  registrationExpiresAt: "2026-11-07T12:00:00Z", next: "complete-profile" };
// @ts-expect-error Registration success does not issue an ordinary login token.
const login: RegistrationVerifyResponse = { ...verified, sessionToken: "synthetic" };
// @ts-expect-error Raw capabilities cannot be echoed by progress polling.
const progress: RegistrationProgressResponse = { next: "verify-email", verified: false, registrationToken: "synthetic" };
// @ts-expect-error Final submission requires profile, consent and both document references.
const incomplete: RegistrationSubmitRequest = { operationId: "synthetic-operation" };
void [elevated, login, progress, incomplete];
