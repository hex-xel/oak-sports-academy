import { describe, expect, it } from "vitest";
import { ERROR_CODES, VALIDATION_FIELDS, isErrorCode } from "@oak/shared";
import { ApiError } from "../../src/middleware/error-handler.js";

describe("shared authentication and registration error contract", () => {
  it("matches the reviewed API errors and their safe server catalog", () => {
    const expected = ["VALIDATION_ERROR", "UNSUPPORTED_CLIENT", "INVALID_CREDENTIALS", "EMAIL_NOT_VERIFIED",
      "ACCOUNT_SUSPENDED", "ACCOUNT_PENDING_APPROVAL", "FORBIDDEN", "PAYLOAD_TOO_LARGE", "RATE_LIMITED",
      "UNAUTHENTICATED", "INTERNAL_ERROR", "INVALID_VERIFICATION_CODE", "VERIFICATION_EXPIRED",
      "VERIFICATION_LIMITED", "REGISTRATION_EXPIRED", "REGISTRATION_CONFLICT", "UPLOAD_INVALID", "DELIVERY_UNAVAILABLE"];
    expect(Object.values(ERROR_CODES).sort()).toEqual(expected.sort());
    for (const code of Object.values(ERROR_CODES)) {
      expect(isErrorCode(code)).toBe(true);
      expect(new ApiError(code).code).toBe(code);
    }
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
    expect(VALIDATION_FIELDS).toEqual(["email", "password"]);
  });
  it.each(["toString", "__proto__", "constructor", "forbidden", "RAW_SQL_ERROR", undefined, null, 401, {}])(
    "rejects unknown or inherited code %s", (value) => { expect(isErrorCode(value)).toBe(false); },
  );
});
