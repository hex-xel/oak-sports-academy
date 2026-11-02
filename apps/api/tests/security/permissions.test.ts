import express, { type ErrorRequestHandler, type Request, type Response } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ROLE_PERMISSIONS } from "../../../../packages/shared/src/permissions.js";
import { requirePermission } from "../../src/middleware/require-permission.js";
import { requireOwnership } from "../../src/middleware/require-ownership.js";

const alice = "00000000-0000-4000-8000-000000000001";
const bob = "00000000-0000-4000-8000-000000000002";
// Independent expectations from specifications.md §6, not the production mapping.
const capabilities = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
const roles = [
  { role: "CUSTOMER", mask: 15 },
  { role: "STAFF", mask: 127 },
  { role: "ADMIN", mask: 0xffffffff },
] as const;

type Identity = { userId: string; permissions: number };

function harness(identity: Identity | undefined, required: number, ownerId = alice) {
  const app = express();
  const audit = vi.fn().mockResolvedValue(undefined);
  const protectedHandler = vi.fn((_req: Request, res: Response) => res.sendStatus(204));
  app.use((req, _res, next) => {
    Object.assign(req, { auth: identity });
    next();
  });
  app.get("/resource", requirePermission(required, { audit }),
    requireOwnership((_req: Request) => ownerId), protectedHandler);
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    res.status(error.status ?? 500).json({ code: error.code ?? "INTERNAL_ERROR" });
  };
  app.use(errors);
  return { app, audit, protectedHandler };
}

describe("permission gate and ownership", () => {
  it.each(roles)("maps $role to its approved mask", ({ role, mask }) => {
    expect(ROLE_PERMISSIONS[role] >>> 0).toBe(mask);
  });

  for (const { role, mask } of roles) {
    it.each(capabilities)(`${role}: capability %i`, async (required) => {
      const { app, audit, protectedHandler } = harness({ userId: alice, permissions: mask }, required);
      const allowed = ((mask & required) >>> 0) === (required >>> 0);
      const response = await request(app).get("/resource");
      expect(response.status).toBe(allowed ? 204 : 403);
      expect(protectedHandler).toHaveBeenCalledTimes(allowed ? 1 : 0);
      if (!allowed) {
        expect(response.body.code).toBe("FORBIDDEN");
        expect(audit).toHaveBeenCalledTimes(1);
        const event = audit.mock.calls[0]?.[0];
        expect(event).toMatchObject({ userId: alice, action: "PERMISSION_DENIED" });
        expect(JSON.stringify(event)).not.toMatch(/password|authorization|sessionToken/i);
      }
    });
  }

  it.each([
    { actual: 1, required: 3, status: 403 },
    { actual: 3, required: 3, status: 204 },
    { actual: 15, required: 17, status: 403 },
    { actual: 0xffffffff, required: 0xffffffff, status: 204 },
    { actual: 127, required: 0xffffffff, status: 403 },
  ])("requires every bit: $actual / $required", async ({ actual, required, status }) => {
    const { app } = harness({ userId: alice, permissions: actual }, required);
    expect((await request(app).get("/resource")).status).toBe(status);
  });

  it("rejects an unauthenticated request before invoking the resource", async () => {
    const { app, protectedHandler } = harness(undefined, 1);
    expect((await request(app).get("/resource")).status).toBe(401);
    expect(protectedHandler).not.toHaveBeenCalled();
  });

  it("denies another customer's resource even when permission passes", async () => {
    const { app, protectedHandler } = harness({ userId: alice, permissions: 15 }, 1, bob);
    const response = await request(app).get("/resource");
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
    expect(protectedHandler).not.toHaveBeenCalled();
  });

  it("does not use a client-supplied identity to satisfy ownership", async () => {
    const { app, protectedHandler } = harness({ userId: alice, permissions: 15 }, 1, bob);
    const response = await request(app).get("/resource").query({ userId: bob, role: "ADMIN" });
    expect(response.status).toBe(403);
    expect(protectedHandler).not.toHaveBeenCalled();
  });
});
