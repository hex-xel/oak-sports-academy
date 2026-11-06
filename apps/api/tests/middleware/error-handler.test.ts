import express, { type Request, type Response } from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, errorHandler, SessionContextError } from "../../src/middleware/error-handler.js";

const secret = "DO_NOT_EXPOSE_REQUEST_DATA";

function failingApp(error: unknown) {
  const app = express();
  app.get("/failure", (_req, _res, next) => { next(error); });
  app.use(errorHandler);
  return app;
}

function parserApp() {
  const app = express();
  app.use(express.json({ limit: "10kb" }));
  app.post("/input", (_req, res) => { res.sendStatus(204); });
  app.use(errorHandler);
  return app;
}

afterEach(() => vi.restoreAllMocks());

describe("safe API error responses", () => {
  it.each([
    ["VALIDATION_ERROR", 400], ["UNSUPPORTED_CLIENT", 400], ["INVALID_CREDENTIALS", 401],
    ["EMAIL_NOT_VERIFIED", 403], ["ACCOUNT_SUSPENDED", 403], ["ACCOUNT_PENDING_APPROVAL", 403],
    ["FORBIDDEN", 403], ["PAYLOAD_TOO_LARGE", 413], ["RATE_LIMITED", 429],
    ["UNAUTHENTICATED", 401], ["INTERNAL_ERROR", 500],
  ] as const)("maps %s to %i without stack/details", async (code, status) => {
    const response = await request(failingApp(new ApiError(code))).get("/failure");
    expect(response.status).toBe(status);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({ code, message: expect.any(String) });
  });

  it("maps session errors without importing runtime/database configuration", async () => {
    const response = await request(failingApp(new SessionContextError())).get("/failure");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: "UNAUTHENTICATED", message: "Unauthenticated" });
  });

  it("does not disclose unknown errors, fake API-shaped errors, or thrown strings", async () => {
    for (const error of [new Error(secret), { code: "UNAUTHENTICATED", status: 401, message: secret }, secret]) {
      const response = await request(failingApp(error)).get("/failure");
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." });
      expect(response.text).not.toContain(secret);
    }
  });

  it("uses generic known-field feedback instead of custom Zod messages or unknown field names", async () => {
    const result = z.object({
      email: z.string().email(secret),
      password: z.string().min(8, secret),
      [secret]: z.string(),
    }).safeParse({ email: "invalid", password: "" });
    if (result.success) throw new Error("Expected invalid fixture input");
    const response = await request(failingApp(result.error)).get("/failure");
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "VALIDATION_ERROR", message: "Check the submitted information.",
      details: { email: "Enter a valid value.", password: "Enter a valid value." },
    });
    expect(response.text).not.toContain(secret);
  });

  it("keeps root validation errors generic without exposing object metadata", async () => {
    const result = z.object({ email: z.string() }).safeParse(null);
    if (result.success) throw new Error("Expected invalid fixture input");
    const response = await request(failingApp(result.error)).get("/failure");
    expect(response.status).toBe(400);
    expect(response.body).not.toHaveProperty("details");
  });

  it("reconstructs safe copy even if an API error message/status were modified", async () => {
    const error = new ApiError("INVALID_CREDENTIALS");
    Object.assign(error, { message: secret, status: 200, stack: secret });
    const response = await request(failingApp(error)).get("/failure");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
  });

  it("returns safe 400 for actual malformed JSON", async () => {
    const response = await request(parserApp()).post("/input").type("json").send(`{"${secret}":`);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
    expect(response.text).not.toContain(secret);
  });

  it("returns safe 413 for an actual body over 10 kB", async () => {
    const response = await request(parserApp()).post("/input").send({ password: secret.repeat(600) });
    expect(response.status).toBe(413);
    expect(response.body).toEqual({ code: "PAYLOAD_TOO_LARGE", message: "The request is too large." });
    expect(response.text).not.toContain(secret);
  });

  it("preserves Retry-After set by upstream middleware", async () => {
    const app = express();
    app.get("/limited", (_req, res, next) => {
      res.setHeader("Retry-After", "42");
      next(new ApiError("RATE_LIMITED"));
    });
    app.use(errorHandler);
    const response = await request(app).get("/limited");
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBe("42");
  });

  it("does not log raw errors or request data", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await request(failingApp(new Error(secret))).get("/failure").set("Authorization", secret);
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("delegates a fresh sanitized error after headers are sent", () => {
    const next = vi.fn();
    errorHandler(new Error(secret), {} as Request, { headersSent: true } as Response, next);
    expect(next).toHaveBeenCalledTimes(1);
    const delegated = next.mock.calls[0]?.[0];
    expect(delegated).toBeInstanceOf(ApiError);
    expect(delegated.code).toBe("INTERNAL_ERROR");
    expect(delegated.message).not.toContain(secret);
    expect(delegated).not.toHaveProperty("cause");
  });
});
