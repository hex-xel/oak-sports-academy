import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const service = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("../../src/modules/auth/auth.service.js", () => ({ login: service.login }));
import { createApp, type AppRuntime } from "../../src/app.js";
import { ApiError } from "../../src/middleware/error-handler.js";

// T038 is intentionally red until T041 mounts the production controller/routes.
const runtimes: AppRuntime[] = [];
function fresh() { const runtime = createApp(); runtimes.push(runtime); return runtime; }
const payload = { email: "synthetic@example.test", password: "x" };
const success = { user: { id: "00000000-0000-4000-8000-000000000001", email: payload.email, role: "STUDENT", status: "ACTIVE" },
  sessionToken: "a".repeat(64), expiresAt: "2026-11-05T23:00:00.000Z", landingPath: "/" };
beforeEach(() => { service.login.mockReset().mockResolvedValue(success); });
afterEach(() => { runtimes.splice(0).forEach((runtime) => runtime.close()); });
const post = (runtime: AppRuntime) => request(runtime.app).post("/api/v1/auth/login").set("X-Client-Platform", "mobile");
describe("production native login HTTP contract (T041 dependency)", () => {
  it("returns safe native 200 JSON without cookies", async () => {
    const res = await post(fresh()).send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(success);
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(res.headers["cache-control"]).toBe("no-store");
  });
  it.each([undefined, "web", "Mobile", "mobile, mobile"])("rejects unsupported header %s before service", async (header) => {
    const req = request(fresh().app).post("/api/v1/auth/login");
    if (header !== undefined) req.set("X-Client-Platform", header);
    const res = await req.send(payload);
    expect(res.status).toBe(400); expect(res.body.code).toBe("UNSUPPORTED_CLIENT");
    expect(service.login).not.toHaveBeenCalled();
  });
  it("normalizes/strips input and allows a short untrimmed password", async () => {
    const res = await post(fresh()).send({ email: " Synthetic@Example.Test ", password: " x ", role: "ADMIN", rememberMe: true });
    expect(res.status).toBe(200);
    expect(service.login.mock.calls[0]?.[0]).toEqual({ email: payload.email, password: " x " });
  });
  it.each([null, [], "text", {}, { email: "a@@b.test", password: "x" }, { email: "a@b", password: "x" },
    { email: payload.email, password: "" }, { email: payload.email, password: "x".repeat(129) }])("rejects malformed body %j without service work", async (body) => {
    const res = await post(fresh()).set("Content-Type", "application/json").send(JSON.stringify(body));
    expect(res.status).toBe(400); expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(service.login).not.toHaveBeenCalled();
  });
  it.each(["INVALID_CREDENTIALS", "EMAIL_NOT_VERIFIED", "ACCOUNT_SUSPENDED", "ACCOUNT_PENDING_APPROVAL"] as const)("maps safe %s without internal fields", async (code) => {
    service.login.mockRejectedValue(new ApiError(code));
    const res = await post(fresh()).send(payload);
    expect(res.status).toBe(code === "INVALID_CREDENTIALS" ? 401 : 403);
    expect(res.body.code).toBe(code);
    expect(res.body).not.toHaveProperty("stack"); expect(res.headers["set-cookie"]).toBeUndefined();
  });
  it("uses identical credential responses for wrong/unknown accounts", async () => {
    service.login.mockRejectedValue(new ApiError("INVALID_CREDENTIALS"));
    const runtime = fresh();
    const wrong = await post(runtime).send(payload);
    const unknown = await post(runtime).send({ ...payload, email: "unknown@example.test" });
    expect(wrong.status).toBe(401); expect(unknown.status).toBe(401); expect(wrong.body).toEqual(unknown.body);
  });
  it("enforces normalized-email quota including successful logins with Retry-After", async () => {
    const runtime = fresh();
    for (let index = 0; index < 5; index++) expect((await post(runtime).send(payload)).status).toBe(200);
    const res = await post(runtime).send({ ...payload, email: " Synthetic@Example.Test " });
    expect(res.status).toBe(429); expect(res.body.code).toBe("RATE_LIMITED");
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0); expect(service.login).toHaveBeenCalledTimes(5);
  });
  it("enforces login IP quota independently of email quota", async () => {
    const runtime = fresh();
    for (let index = 0; index < 10; index++) expect((await post(runtime).send({ ...payload, email: `s${index}@example.test` })).status).toBe(200);
    const res = await post(runtime).send({ ...payload, email: "extra@example.test" });
    expect(res.status).toBe(429); expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    expect(service.login).toHaveBeenCalledTimes(10);
  });
  it("keeps the global quota in front of login", async () => {
    const runtime = fresh();
    for (let index = 0; index < 100; index++) await request(runtime.app).get("/api/v1/health");
    const res = await post(runtime).send(payload);
    expect(res.status).toBe(429); expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    expect(service.login).not.toHaveBeenCalled();
  });
  it("rejects over 10 KiB and sanitizes internal service errors", async () => {
    const runtime = fresh();
    const large = await post(runtime).send({ ...payload, unexpected: "x".repeat(11 * 1024) });
    expect(large.status).toBe(413); expect(service.login).not.toHaveBeenCalled();
    service.login.mockRejectedValue(new Error("private SQL credentials"));
    const res = await post(runtime).send(payload);
    expect(res.status).toBe(500); expect(res.body.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("private SQL");
  });
});
