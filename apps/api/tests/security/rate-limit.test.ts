import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiters } from "../../src/middleware/rate-limit.js";

function harness() {
  // A fresh store per harness prevents tests sharing quota. IP comes from the socket.
  const limits = createRateLimiters();
  const app = express();
  app.set("trust proxy", false);
  app.use(limits.globalIp, express.json({ limit: "10kb" }));
  app.get("/public", (_req, res) => res.sendStatus(204));
  app.post("/login", limits.loginIp, limits.loginEmail, (_req, res) => res.sendStatus(204));
  return app;
}

function retryAfter(response: request.Response) {
  expect(response.body.code).toBe("RATE_LIMITED");
  expect(response.headers["retry-after"]).toMatch(/^\d+$/);
  const seconds = Number(response.headers["retry-after"]);
  expect(seconds).toBeGreaterThan(0);
  expect(seconds).toBeLessThanOrEqual(900);
}

describe("tiered rate limits", () => {
  beforeEach(() => {
    // Fake Date/intervals only: HTTP sockets and Supertest timeouts stay real.
    vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-11-02T00:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("accepts 100 global requests and rejects request 101", async () => {
    const app = harness();
    for (let i = 0; i < 100; i++) expect((await request(app).get("/public")).status).toBe(204);
    const blocked = await request(app).get("/public");
    expect(blocked.status).toBe(429);
    retryAfter(blocked);
  });

  it("accepts 10 login requests per IP across emails, then rejects request 11", async () => {
    const app = harness();
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post("/login").send({ email: `user${i}@example.test` })).status).toBe(204);
    }
    const blocked = await request(app).post("/login").send({ email: "fresh@example.test" });
    expect(blocked.status).toBe(429);
    retryAfter(blocked);
  });

  it("normalizes email quota and rejects attempt 6 without blocking a different email", async () => {
    const app = harness();
    for (const email of ["alice@example.test", " ALICE@example.test ", "Alice@EXAMPLE.test", "alice@example.test", "alice@example.test"]) {
      expect((await request(app).post("/login").send({ email })).status).toBe(204);
    }
    const blocked = await request(app).post("/login").send({ email: " ALICE@example.test " });
    expect(blocked.status).toBe(429);
    retryAfter(blocked);
    expect((await request(app).post("/login").send({ email: "bob@example.test" })).status).toBe(204);
  });

  it("ignores forged forwarded IPs when the peer is not a trusted proxy", async () => {
    const app = harness();
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post("/login").set("X-Forwarded-For", `198.51.100.${i + 1}`)
        .send({ email: `user${i}@example.test` })).status).toBe(204);
    }
    expect((await request(app).post("/login").set("X-Forwarded-For", "203.0.113.1")
      .send({ email: "fresh@example.test" })).status).toBe(429);
  });

  it("expires global and sensitive windows after 15 minutes", async () => {
    const app = harness();
    for (let i = 0; i < 100; i++) await request(app).get("/public");
    expect((await request(app).get("/public")).status).toBe(429);
    await vi.advanceTimersByTimeAsync(900_001);
    expect((await request(app).get("/public")).status).toBe(204);
    for (let i = 0; i < 5; i++) await request(app).post("/login").send({ email: "alice@example.test" });
    expect((await request(app).post("/login").send({ email: "alice@example.test" })).status).toBe(429);
    await vi.advanceTimersByTimeAsync(900_001);
    expect((await request(app).post("/login").send({ email: "alice@example.test" })).status).toBe(204);
  });
});
