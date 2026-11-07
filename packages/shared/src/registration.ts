/** Existing wizard choices; API maps these to database enums, never client authority. */
export type RegistrationStudentType = "newly-white-belt" | "experienced";

/** Public assessment labels; completion/account states are separate internal concepts. */
export type RegistrationStatus = "New" | "Free Trial Scheduled" | "Approved" | "Rejected" | "Enrolled";

/** Fixed six-step credentials request. Persist operationId before sending; never log it with credentials. */
export type RegistrationStartRequest = Readonly<{
  operationId: string;
  studentType: RegistrationStudentType;
  email: string;
  password: string;
}>;

/** Common real/decoy start shape; no existence, account ID, password or logged-in identity. */
export type RegistrationStartResponse = Readonly<{
  registrationToken: string;
  challengeId: string;
  codeExpiresAt: string;
  resendAfter: string;
  registrationExpiresAt: string;
  next: "verify-email";
  delivery: "unconfirmed";
}>;

/** Mailbox challenge input; registration proof belongs only in X-Registration-Token. */
export type RegistrationVerifyRequest = Readonly<{ challengeId: string; code: string }>;

/** Mailbox success rotates to verified registration-only proof; never an auth response. */
export type RegistrationVerifyResponse = Readonly<{
  verified: true;
  registrationToken: string;
  registrationExpiresAt: string;
  next: "complete-profile";
}>;

/** Explicit resend operation; old codes/proof versions are invalidated atomically. */
export type RegistrationResendRequest = Readonly<{ operationId: string; challengeId: string }>;

/** Generic resend acknowledgment; no provider/existence signal before mailbox proof. */
export type RegistrationResendResponse = RegistrationStartResponse;

/** Exact accepted demonstration agreements, recorded before document transmission. */
export type RegistrationAgreementsRequest = Readonly<{
  operationId: string;
  policyVersion: "registration-2026-11-06";
  waiver: true;
  fitness: true;
  terms: true;
}>;

/** Consent reference, with no personal details or file paths. */
export type RegistrationAgreementsResponse = Readonly<{ consentId: string; acceptedAt: string }>;

/** Conditional guardian fields; omitted for adult submissions after server age calculation. */
export type RegistrationGuardian = Readonly<{
  name: string;
  relationship: "parent" | "aunt-uncle" | "sibling" | "other";
  occupation: string;
  contact: string;
}>;

/** Final profile input; ISO calendar DOB and national mobile digits, no client age/eligibility. */
export type RegistrationProfile = Readonly<{
  firstName: string;
  middleName?: string | undefined;
  surname: string;
  gender: "male" | "female";
  dateOfBirth: string;
  mobile: string;
  houseAndLot: string;
  barangay: string;
  municipality: string;
  province: string;
  guardian?: RegistrationGuardian | undefined;
  validIdType: "philid" | "passport" | "drivers-license" | "school-id" | "other";
}>;

/** Finalize only server-returned same-application consent/document IDs, never storage keys. */
export type RegistrationSubmitRequest = Readonly<{
  operationId: string;
  profile: RegistrationProfile;
  consentId: string;
  photoDocumentId: string;
  validIdDocumentId: string;
}>;

/** Stable final receipt; not approval, enrollment, email scheduling or a login session. */
export type RegistrationReceipt = Readonly<{ receiptId: string; status: "New"; submittedAt: string }>;

/** Curated progress, never a raw database application/profile/delivery row. */
export type RegistrationProgressResponse =
  | Readonly<{ next: "verify-email"; verified: false }>
  | Readonly<{ next: "complete-profile"; verified: true }>
  | Readonly<{ next: "await-assessment"; verified: true; receipt: RegistrationReceipt }>;

/** Valid binary route slots; file contents are transmitted separately, never JSON/base64. */
export type RegistrationDocumentSlot = "photo2x2" | "validId";

/** Safe successful upload projection, excluding object keys, signed URLs and checksums. */
export type RegistrationDocumentResponse = Readonly<{
  documentId: string;
  slot: RegistrationDocumentSlot;
  state: "Ready";
}>;
