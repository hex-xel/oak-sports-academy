import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, type AppRuntime } from "../../src/app.js";

const runtimes: AppRuntime[] = [];
function fresh() { const runtime = createApp(); runtimes.push(runtime); return runtime; }
afterEach(() => { for (const runtime of runtimes.splice(0)) runtime.close(); });

describe("API application boundary", () => {
  it("serves versioned liveness with security headers and no cookies or internal details", async () => {
    const { app } = fresh();
    const res = await request(app).get("/api/v1/health?ignored=synthetic");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["cache-control"]).toBe("no-store");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
  it("returns a static JSON 404 rather than echoing a requested path", async () => {
    const res = await request(fresh().app).get("/synthetic-private-value");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Resource not found." });
  });
  it("sanitizes malformed JSON before route execution", async () => {
    const res = await request(fresh().app).post("/api/v1/health")
      .set("Content-Type", "application/json").send('{"password":"synthetic",');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("synthetic");
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
  });
  it("rejects a JSON body over 10 KiB", async () => {
    const res = await request(fresh().app).post("/api/v1/health").send({ value: "a".repeat(11 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe("PAYLOAD_TOO_LARGE");
  });
  it("enforces the global quota before route work and preserves Retry-After", async () => {
    const { app } = fresh();
    for (let i = 0; i < 100; i++) expect((await request(app).get("/api/v1/health")).status).toBe(200);
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(429);
    expect(res.body.code).toBe("RATE_LIMITED");
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });
  it("uses strict proxy defaults and enables HSTS only in production mode", async () => {
    const dev = fresh();
    expect(dev.app.get("trust proxy")).toBe(false);
    expect((await request(dev.app).get("/api/v1/health")).headers["strict-transport-security"]).toBeUndefined();
    const prod = createApp({ production: true }); runtimes.push(prod);
    expect((await request(prod.app).get("/api/v1/health")).headers["strict-transport-security"]).toContain("max-age=");
  });
});
