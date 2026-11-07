import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract/HTTP/provider adapters only. submission.db.test.ts covers the real
// restricted service, RLS and races; mocks here do not validate PostgreSQL policies.
vi.mock("../../src/lib/prisma.js", () => ({ prisma: {}, withSession: vi.fn() }));
import { appendRegistrationAudit, createRegistrationCapability, registrationCapabilityHash,
  withRegistration } from "../../src/modules/registration/capability.js";
import { registrationAgreementsSchema, registrationStartSchema, registrationSubmitSchema,
  registrationVerifySchema, registrationQuerySchema } from "../../src/modules/registration/registration.schemas.js";
import { createRegistrationEmailSender } from "../../src/lib/email.js";
import { parseRegistrationEnv } from "../../src/config/registration-env.js";
import request from "supertest";
import { createApp, type AppRuntime } from "../../src/app.js";
import { RegistrationRetryError } from "../../src/modules/registration/registration.errors.js";
import type { RegistrationOperations } from "../../src/modules/registration/registration.controller.js";
import type { RegistrationStartResponse } from "@oak/shared";
import { registrationDevelopmentUrl } from "../../scripts/helpers/registration-development-target.js";

describe("owner-confirmed development target guard", () => {
  const direct = "postgresql://postgres:synthetic@db.ewycpsuzzfonoolvhyeu.supabase.co:5432/postgres?sslmode=require";
  const pooled = "postgresql://oak_api.ewycpsuzzfonoolvhyeu:synthetic@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require&connection_limit=5";
  it("accepts only the confirmed project, expected login and TLS session connection", () => {
    expect(registrationDevelopmentUrl(direct, "postgres")).toBe(direct);
    expect(registrationDevelopmentUrl(pooled, "oak_api")).toBe(pooled);
  });
  it.each([
    undefined, direct.replace("ewycpsuzzfonoolvhyeu", "anotherproject"), direct.replace(":5432", ":6543"),
    direct.replace("sslmode=require", "sslmode=disable"), direct.replace("/postgres?", "/another?"),
    `${direct}&sslmode=require`, `${direct}&options=unsafe`, `${direct}#fragment`,
    direct.replace("synthetic@", "@"), pooled,
  ])("refuses an unexpected migration target without echoing credentials", value => {
    expect(() => registrationDevelopmentUrl(value, "postgres")).toThrow("Development target refused");
  });
  it("does not allow a privileged migration connection as the runtime URL", () => {
    expect(() => registrationDevelopmentUrl(direct, "oak_api")).toThrow("Development target refused");
  });
});

const identity = { applicationId: "00000000-0000-4000-8000-000000000101",
  userId: "00000000-0000-4000-8000-000000000102", verified: false, version: 1 };
const token = Buffer.alloc(32, 7).toString("base64url");
const query = vi.fn();
const tx = { $queryRaw: query } as unknown as Prisma.TransactionClient;
const transaction = vi.fn();
const client = { $transaction: transaction } as unknown as PrismaClient;

afterEach(() => vi.useRealTimers());

describe("production registration HTTP boundary", () => {
  const apps: AppRuntime[] = [];
  const operations = { start: vi.fn<RegistrationOperations["start"]>(),
    verifyEmail: vi.fn<RegistrationOperations["verifyEmail"]>(), resendCode: vi.fn<RegistrationOperations["resendCode"]>(),
    current: vi.fn<RegistrationOperations["current"]>() };
  const result: RegistrationStartResponse = { registrationToken: token, challengeId: identity.applicationId,
    codeExpiresAt: "2026-11-07T12:10:00.000Z", resendAfter: "2026-11-07T12:01:00.000Z",
    registrationExpiresAt: "2026-11-07T13:00:00.000Z", next: "verify-email", delivery: "unconfirmed" };
  const payload = { operationId: identity.applicationId, studentType: "experienced",
    email: "synthetic@example.test", password: "Synthetic-Registration1!" };
  function fresh() { const app = createApp({ registration: operations }); apps.push(app); return app; }
  const post = (runtime: AppRuntime, path: string) => request(runtime.app).post(`/api/v1/registrations/${path}`)
    .set("X-Client-Platform", "mobile");
  const current = (runtime: AppRuntime) => request(runtime.app).get("/api/v1/registrations/current")
    .set("X-Client-Platform", "mobile").set("X-Registration-Token", token);
  beforeEach(() => {
    operations.start.mockReset().mockResolvedValue(result);
    operations.verifyEmail.mockReset().mockResolvedValue({ verified: true, registrationToken: token,
      registrationExpiresAt: result.registrationExpiresAt, next: "complete-profile" });
    operations.resendCode.mockReset().mockResolvedValue(result);
    operations.current.mockReset().mockResolvedValue({ next: "verify-email", verified: false });
  });
  afterEach(() => apps.splice(0).forEach(app => app.close()));

  it("projects 202/200 responses without session cookies, raw service fields or progress token echo", async () => {
    const unsafe = { ...result, passwordHash: "private-service-field" };
    operations.start.mockResolvedValue(unsafe);
    const runtime = fresh();
    const started = await post(runtime, "start").send({ ...payload, email: " Synthetic@Example.Test " });
    expect(started.status).toBe(202); expect(started.body).toEqual(result);
    expect(started.headers["set-cookie"]).toBeUndefined(); expect(started.headers["cache-control"]).toBe("no-store");
    expect(operations.start.mock.calls[0]?.[0].email).toBe(payload.email);
    const verified = await post(runtime, "verify-email").set("X-Registration-Token", token)
      .send({ challengeId: result.challengeId, code: "012345" });
    expect(verified.status).toBe(200); expect(verified.body).not.toHaveProperty("sessionToken");
    expect(operations.verifyEmail.mock.calls[0]).toEqual([token, { challengeId: result.challengeId, code: "012345" }]);
    const resent = await post(runtime, "resend-code").set("X-Registration-Token", token)
      .send({ operationId: identity.userId, challengeId: result.challengeId });
    expect(resent.status).toBe(202); expect(resent.body.delivery).toBe("unconfirmed");
    const progress = await current(runtime);
    expect(progress.status).toBe(200); expect(progress.body).toEqual({ next: "verify-email", verified: false });
  });

  it("rejects missing/combined/duplicate proofs and ordinary Bearer before service work", async () => {
    const runtime = fresh();
    for (const proof of [undefined, "malformed", `${token}, ${token}`]) {
      const req = request(runtime.app).get("/api/v1/registrations/current").set("X-Client-Platform", "mobile");
      if (proof) req.set("X-Registration-Token", proof);
      expect((await req).body.code).toBe("REGISTRATION_EXPIRED");
    }
    expect((await request(runtime.app).get("/api/v1/registrations/current").set("X-Client-Platform", "mobile")
      .set({ "X-Registration-Token": [token, token] })).status).toBe(401);
    expect((await current(runtime).set("Authorization", "Bearer synthetic-login-token")).status).toBe(401);
    expect((await request(runtime.app).get("/api/v1/registrations/current").set("X-Client-Platform", "mobile")
      .set("Authorization", "Bearer synthetic-login-token")).status).toBe(401);
    expect(operations.current).not.toHaveBeenCalled();
  });

  it("rejects client/authority/query/body-parser bypasses before credential work", async () => {
    expect((await request(fresh().app).post("/api/v1/registrations/start").send(payload)).body.code).toBe("UNSUPPORTED_CLIENT");
    expect((await post(fresh(), "start").set({ "X-Client-Platform": ["mobile", "mobile"] }).send(payload)).status).toBe(400);
    expect((await post(fresh(), "start").send({ ...payload, role: "ADMIN" })).status).toBe(400);
    expect((await post(fresh(), "start").query({ token: "private" }).send(payload)).status).toBe(400);
    expect((await post(fresh(), "start").set("Content-Type", "text/plain").send("not-json")).status).toBe(400);
    expect((await post(fresh(), "start").send({ ...payload, padding: "x".repeat(11 * 1024) })).status).toBe(413);
    expect(operations.start).not.toHaveBeenCalled();
    const lazy = createApp(); apps.push(lazy);
    expect((await post(lazy, "start").send({})).status).toBe(400);
  });

  it("returns bounded Retry-After and sanitizes service failures", async () => {
    const runtime = fresh();
    operations.resendCode.mockRejectedValueOnce(new RegistrationRetryError(37));
    const limited = await post(runtime, "resend-code").set("X-Registration-Token", token)
      .send({ operationId: identity.userId, challengeId: result.challengeId });
    expect(limited.status).toBe(429); expect(limited.body.code).toBe("VERIFICATION_LIMITED");
    expect(limited.headers["retry-after"]).toBe("37");
    operations.current.mockRejectedValueOnce(new Error("private-provider-or-database-value"));
    const failed = await current(runtime);
    expect(failed.status).toBe(500); expect(failed.body.code).toBe("INTERNAL_ERROR");
    expect(failed.text).not.toContain("private-provider-or-database-value");
    expect(failed.body).not.toHaveProperty("stack");
  });

  it("shares the ten-request issue IP quota across start/resend and ignores spoofed forwarded IPs", async () => {
    const runtime = fresh();
    for (let i = 0; i < 9; i++) expect((await post(runtime, "start").send({ ...payload, email: `synthetic${i}@example.test` })).status).toBe(202);
    expect((await post(runtime, "resend-code").set("X-Registration-Token", token)
      .send({ operationId: identity.userId, challengeId: result.challengeId })).status).toBe(202);
    const blocked = await post(runtime, "start").set("X-Forwarded-For", "203.0.113.7")
      .send({ ...payload, email: "another@example.test" });
    expect(blocked.status).toBe(429); expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(operations.start).toHaveBeenCalledTimes(9);
    // Exhausting registration must not consume the independent login store.
    const login = await request(runtime.app).post("/api/v1/auth/login").send({});
    expect(login.status).toBe(400); expect(login.body.code).toBe("UNSUPPORTED_CLIENT");
  });

  it("enforces normalized-email and hashed-proof quotas independently of IP thresholds", async () => {
    const runtime = fresh();
    for (let i = 0; i < 5; i++) expect((await post(runtime, "start").send(payload)).status).toBe(202);
    expect((await post(runtime, "start").send({ ...payload, email: " Synthetic@Example.Test " })).status).toBe(429);
    for (let i = 0; i < 5; i++) expect((await post(runtime, "verify-email").set("X-Registration-Token", token)
      .send({ challengeId: result.challengeId, code: "012345" })).status).toBe(200);
    const blocked = await post(runtime, "verify-email").set("X-Registration-Token", token)
      .send({ challengeId: result.challengeId, code: "012345" });
    expect(blocked.status).toBe(429); expect(blocked.body.code).toBe("RATE_LIMITED");
    expect(operations.verifyEmail).toHaveBeenCalledTimes(5);
  });

  it("caps verify requests across distinct proofs and projects receipt-only progress", async () => {
    const runtime = fresh();
    for (let i = 0; i < 30; i++) expect((await post(runtime, "verify-email")
      .set("X-Registration-Token", Buffer.alloc(32, i).toString("base64url"))
      .send({ challengeId: result.challengeId, code: "012345" })).status).toBe(200);
    const blocked = await post(runtime, "verify-email").set("X-Registration-Token", token)
      .send({ challengeId: result.challengeId, code: "012345" });
    expect(blocked.status).toBe(429); expect(operations.verifyEmail).toHaveBeenCalledTimes(30);
    const extra = { next: "await-assessment", verified: true, receipt: { receiptId: identity.applicationId,
      status: "New", submittedAt: "2026-11-07T12:00:00Z", objectKey: "private-object-key" }, passwordHash: "private" } as const;
    operations.current.mockResolvedValue(extra);
    const progress = await current(runtime);
    expect(progress.status).toBe(200); expect(progress.body.receipt).not.toHaveProperty("objectKey");
    expect(progress.body).not.toHaveProperty("passwordHash");
  });
});

describe("registration email configuration and bounded transport", () => {
  const config = { RESEND_API_KEY: "re_synthetic_test_key", REGISTRATION_OTP_HMAC_KEY: "d".repeat(64),
    REGISTRATION_EMAIL_FROM: "Oak Sports Academy <onboarding@resend.dev>",
    REGISTRATION_TEST_RECIPIENT: "synthetic@example.test", NODE_ENV: "test" };
  const options = { apiKey: config.RESEND_API_KEY, from: config.REGISTRATION_EMAIL_FROM,
    testRecipient: config.REGISTRATION_TEST_RECIPIENT };
  const challengeId = "00000000-0000-4000-8000-000000000103";
  const message = { to: config.REGISTRATION_TEST_RECIPIENT, code: "012345", challengeId,
    idempotencyKey: `registration-otp/${challengeId}` };
  const receipt = () => new Response(JSON.stringify({ id: challengeId }), { headers: { "Content-Type": "application/json" } });

  it("requires private key/test sender configuration and never echoes rejected values", () => {
    expect(parseRegistrationEnv(config).from).toBe(options.from);
    for (const input of [{ ...config, REGISTRATION_TEST_RECIPIENT: undefined },
      { ...config, NODE_ENV: "production" }, { ...config, REGISTRATION_OTP_HMAC_KEY: "private-invalid-value" }]) {
      try { parseRegistrationEnv(input); throw new Error("Expected configuration rejection"); }
      catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toMatch(/^Invalid registration environment:/);
        expect((error as Error).message).not.toContain("private-invalid-value");
        expect((error as Error).message).not.toContain(config.RESEND_API_KEY);
      }
    }
  });

  it("uses fixed HTTPS, plain text, stable idempotency and one request per explicit invocation", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => receipt());
    const send = createRegistrationEmailSender({ ...options, fetch: fetcher });
    await expect(send(message)).resolves.toEqual({ providerId: challengeId });
    await send(message);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [url, request] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(request).toMatchObject({ method: "POST", redirect: "error", credentials: "omit",
      headers: { "Idempotency-Key": message.idempotencyKey } });
    const body = JSON.parse(request!.body as string);
    expect(body.to).toEqual([message.to]);
    expect(body.text).toContain("012345");
    expect(body.text).toContain("10 minutes after it was requested");
    expect(body).not.toHaveProperty("html");
    expect(body).not.toHaveProperty("attachments");
    expect(fetcher.mock.calls[1]?.[1]?.body).toBe(request!.body);
  });

  it("rejects a foreign recipient or mismatched idempotency before sending, without rerouting", async () => {
    const fetcher = vi.fn<typeof globalThis.fetch>();
    const send = createRegistrationEmailSender({ ...options, fetch: fetcher });
    await expect(send({ ...message, to: "other@example.test" })).rejects.toMatchObject({ code: "DELIVERY_UNAVAILABLE" });
    await expect(send({ ...message, idempotencyKey: "other-operation" })).rejects.toMatchObject({ code: "DELIVERY_UNAVAILABLE" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([403, 409, 429, 500])("sanitizes HTTP %i without retries or provider text", async status => {
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response("private-provider-detail", { status }));
    const send = createRegistrationEmailSender({ ...options, fetch: fetcher });
    await expect(send(message)).rejects.toMatchObject({ code: "DELIVERY_UNAVAILABLE",
      message: "We could not confirm email delivery. Try again when available." });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(["{broken-json", JSON.stringify({ error: "private-provider-detail" }), "x".repeat(16_385)])(
    "rejects malformed, missing-receipt and oversized response case %#", async content => {
      const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(content, { headers: { "Content-Type": "application/json" } }));
      await expect(createRegistrationEmailSender({ ...options, fetch: fetcher })(message))
        .rejects.toMatchObject({ code: "DELIVERY_UNAVAILABLE" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it("bounds a stalled request even when a test transport ignores cancellation", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof globalThis.fetch>().mockImplementation(() => new Promise<Response>(() => {}));
    const pending = createRegistrationEmailSender({ ...options, fetch: fetcher, timeoutMs: 10 })(message);
    const assertion = expect(pending).rejects.toMatchObject({ code: "DELIVERY_UNAVAILABLE" });
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps the same deadline while consuming a stalled successful response body", async () => {
    vi.useFakeTimers();
    let stream: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({ start(controller) { stream = controller; } });
    const fetcher = vi.fn<typeof globalThis.fetch>().mockResolvedValue(new Response(body, { headers: { "Content-Type": "application/json" } }));
    const pending = createRegistrationEmailSender({ ...options, fetch: fetcher, timeoutMs: 10 })(message);
    const assertion = expect(pending).rejects.toMatchObject({ code: "DELIVERY_UNAVAILABLE" });
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    stream?.close();
  });
});

describe("registration input contracts", () => {
  const start = { operationId: identity.applicationId, studentType: "newly-white-belt",
    email: " Applicant@Example.Test ", password: "Synthetic-Only1! " };
  it("normalizes only email, preserves password and rejects authority/complexity bypasses", () => {
    const parsed = registrationStartSchema.parse(start);
    expect(parsed.email).toBe("applicant@example.test");
    expect(parsed.password).toBe(start.password);
    for (const extra of [{ role: "ADMIN" }, { status: "ACTIVE" }, { emailVerified: true }]) {
      expect(registrationStartSchema.safeParse({ ...start, ...extra }).success).toBe(false);
    }
    for (const password of ["short", "NoDigits!", "NOLOWERCASE1!", "NoSpecialChar1", "a".repeat(129)]) {
      expect(registrationStartSchema.safeParse({ ...start, password }).success).toBe(false);
    }
  });
  it("preserves leading-zero codes and rejects non-ASCII codes, URL proof and missing agreements", () => {
    expect(registrationVerifySchema.parse({ challengeId: identity.applicationId, code: "012345" }).code).toBe("012345");
    for (const code of [123456, "12345", "１２３４５６", "123456 "]) {
      expect(registrationVerifySchema.safeParse({ challengeId: identity.applicationId, code }).success).toBe(false);
    }
    expect(registrationQuerySchema.safeParse({ registrationToken: token }).success).toBe(false);
    expect(registrationAgreementsSchema.safeParse({ operationId: identity.applicationId,
      policyVersion: "registration-2026-11-06", waiver: true, fitness: true, terms: false }).success).toBe(false);
  });
  it("rejects impossible calendar dates and client age claims in the final profile", () => {
    const submit = { operationId: identity.applicationId, consentId: identity.applicationId,
      photoDocumentId: identity.applicationId, validIdDocumentId: identity.userId,
      profile: { firstName: "Synthetic", surname: "Applicant", gender: "female",
        dateOfBirth: "2000-02-29", mobile: "9175550100", houseAndLot: "Fixture",
        barangay: "Fixture", municipality: "Taguig", province: "Metro Manila", validIdType: "school-id" } };
    expect(registrationSubmitSchema.safeParse(submit).success).toBe(true);
    expect(registrationSubmitSchema.safeParse({ ...submit, profile: { ...submit.profile, dateOfBirth: "2001-02-29" } }).success).toBe(false);
    expect(registrationSubmitSchema.safeParse({ ...submit, profile: { ...submit.profile, age: 26 } }).success).toBe(false);
  });
});

beforeEach(() => {
  query.mockReset().mockResolvedValue([{ ...identity }]);
  transaction.mockReset().mockImplementation(async work => work(tx));
});

describe("registration capability transaction boundary", () => {
  it("creates independent canonical 256-bit capabilities and persists only digests", () => {
    const a = createRegistrationCapability();
    const b = createRegistrationCapability();
    expect(Buffer.from(a.token, "base64url")).toHaveLength(32);
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(createHash("sha256").update(a.token).digest("hex"));
    expect(registrationCapabilityHash(a.token)).toBe(a.tokenHash);
  });

  it.each(["", "x".repeat(64), "x".repeat(42), " "+token, token+"=", "A".repeat(42)+"B"])(
    "rejects malformed/noncanonical proof before database work (case %#)", async invalid => {
      await expect(withRegistration(invalid, false, vi.fn(), client)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
      expect(transaction).not.toHaveBeenCalled();
    });

  it("passes only the digest to SQL and scopes callback to its single transaction", async () => {
    const work = vi.fn(async (scoped, actual) => {
      expect(scoped).toBe(tx);
      expect(actual).toEqual(identity);
      expect(Object.isFrozen(actual)).toBe(true);
      return "safe-result";
    });
    expect(await withRegistration(token, false, work, client)).toBe("safe-result");
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.slice(1)).toEqual([registrationCapabilityHash(token), false]);
    expect(query.mock.calls[0]?.slice(1)).not.toContain(token);
    expect(query.mock.calls[0]?.[0].join("")).toContain("oak_set_registration_context");
  });

  it("rejects an unverified identity for verified work and maps SQL proof denial safely", async () => {
    const work = vi.fn();
    await expect(withRegistration(token, true, work, client)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    expect(work).not.toHaveBeenCalled();
    query.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("private database detail", {
      code: "P2010", clientVersion: "6", meta: { code: "28000" },
    }));
    await expect(withRegistration(token, false, work, client)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    expect(work).not.toHaveBeenCalled();
  });

  it("propagates callback failures without replaying mutation work", async () => {
    const failure = new Error("synthetic callback failure");
    const work = vi.fn(async () => { throw failure; });
    await expect(withRegistration(token, false, work, client)).rejects.toBe(failure);
    expect(work).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

describe("registration audit boundary", () => {
  it("shares canonical payload hashing and sends no actor, target or plaintext payload to SQL", async () => {
    query.mockResolvedValueOnce([{ id: identity.applicationId }]);
    expect(await appendRegistrationAudit(tx, "REGISTRATION_STARTED", { version: 1 }))
      .toBe(identity.applicationId);
    expect(query.mock.calls[0]?.slice(1)).toEqual(["REGISTRATION_STARTED",
      createHash("sha256").update('{"version":1}').digest("hex")]);
    expect(query.mock.calls[0]?.[0].join("")).toContain("oak_registration_append_audit");
  });

  it("rejects an outer client and propagates append failure to roll back its caller", async () => {
    await expect(appendRegistrationAudit(client as unknown as Prisma.TransactionClient,
      "REGISTRATION_STARTED", {})).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
    expect(query).not.toHaveBeenCalled();
    const failure = new Error("synthetic append failure");
    query.mockRejectedValueOnce(failure);
    await expect(appendRegistrationAudit(tx, "REGISTRATION_STARTED", {})).rejects.toBe(failure);
  });
});
