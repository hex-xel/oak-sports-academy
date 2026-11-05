import { describe, expect, it } from "vitest";
import { loginSchema, validateMobileClient, authParamsSchema, authQuerySchema } from "../../src/modules/auth/auth.schemas.js";
import { validateLoginInput } from "../../../mobile/features/auth/login-validation.js";

describe("matching server/mobile login validation", () => {
  it("normalizes email, strips claims and preserves short/space-only passwords", () => {
    for (const password of ["x", " ", " x ", "x".repeat(128)]) {
      const parsed = loginSchema.parse({ email: " A@B.Test ", password, role: "ADMIN", rememberMe: true });
      expect(parsed).toEqual({ email: "a@b.test", password });
      expect(validateLoginInput(" A@B.Test ", password)).toEqual({ errors: {}, credentials: parsed });
    }
  });
  it.each(["", "a@@b.test", "a@b", "a b@c.test", "a@b. test", `${"a".repeat(244)}@example.test`])("rejects malformed/overlong email %s on both sides", (email) => {
    expect(loginSchema.safeParse({ email, password: "x" }).success).toBe(false);
    expect(validateLoginInput(email, "x").credentials).toBeUndefined();
  });
  it("accepts the exact 254 character email boundary", () => {
    const email = `${"a".repeat(241)}@example.test`;
    expect(email.length).toBe(254);
    expect(loginSchema.safeParse({ email, password: "x" }).success).toBe(true);
    expect(validateLoginInput(email, "x").credentials?.email).toBe(email);
  });
  it.each(["", "x".repeat(129)])("rejects empty/overlong password on both sides", (password) => {
    expect(loginSchema.safeParse({ email: "a@b.test", password }).success).toBe(false);
    expect(validateLoginInput("a@b.test", password).credentials).toBeUndefined();
  });
  it.each([null, [], "text", {}, { email: 1, password: "x" }, { email: "a@b.test", password: 1 }])("requires a JSON credential object %j", (body) => {
    expect(loginSchema.safeParse(body).success).toBe(false);
  });
  it("requires the exact native header and strips unused query/params", () => {
    expect(validateMobileClient("mobile")).toBe("mobile");
    for (const header of [undefined, "Mobile", "web", "mobile, mobile", ["mobile", "mobile"]]) {
      expect(() => validateMobileClient(header)).toThrow("This client is not supported.");
    }
    expect(authParamsSchema.parse({ userId: "untrusted" })).toEqual({});
    expect(authQuerySchema.parse({ role: "ADMIN" })).toEqual({});
  });
});
