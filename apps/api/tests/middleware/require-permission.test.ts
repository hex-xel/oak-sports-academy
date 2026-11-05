import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { hasPermissions, permissionsForRole, PERMISSIONS, ROLE_PERMISSIONS } from "@oak/shared";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { requirePermission } from "../../src/middleware/require-permission.js";

const userId = "00000000-0000-4000-8000-000000000001";

function harness(actual: unknown, required = 1, audit = vi.fn().mockResolvedValue(undefined)) {
  const app = express();
  const reached = vi.fn();
  app.use((req, _res, next) => {
    if (actual !== undefined) Object.assign(req, { auth: { userId, permissions: actual } });
    next();
  });
  app.get("/protected", requirePermission(required, { audit }), (_req, res) => {
    reached(); res.sendStatus(204);
  });
  app.use(errorHandler);
  return { app, audit, reached };
}

describe("shared permission boundaries", () => {
  it("maps only Student/Admin and keeps Student profile correction excluded", () => {
    expect(ROLE_PERMISSIONS).toEqual({ STUDENT: 15, ADMIN: 0xffffffff });
    expect(permissionsForRole("STUDENT")).toBe(15);
    expect(permissionsForRole("ADMIN")).toBe(0xffffffff);
    expect(hasPermissions(15, PERMISSIONS.STUDENTS_MANAGE)).toBe(false);
    expect(hasPermissions(15, PERMISSIONS.PHOTO_UPLOAD)).toBe(true);
    expect(Object.isFrozen(ROLE_PERMISSIONS)).toBe(true);
  });
  it.each(["STAFF", "CUSTOMER", "toString", "__proto__", undefined])("fails closed for role %s", (role) => {
    expect(permissionsForRole(role)).toBe(0);
  });
  it.each([-1, 0x100000000, 1.5, NaN, Infinity, "15", null])("does not coerce actual mask %s", (mask) => {
    expect(hasPermissions(mask, 1)).toBe(false);
  });
  it("requires every bit including the unsigned high bit", () => {
    expect(hasPermissions(1, 3)).toBe(false);
    expect(hasPermissions(3, 3)).toBe(true);
    expect(hasPermissions(0xffffffff, 0xffffffff)).toBe(true);
    expect(hasPermissions(0x80000000, 0x80000000)).toBe(true);
    expect(hasPermissions(0x7fffffff, 0x80000000)).toBe(false);
  });
  it.each([0, -1, 1.5, NaN, Infinity, 0x100000000])("rejects route mask %s at construction", (mask) => {
    expect(() => requirePermission(mask, { audit: vi.fn() })).toThrow(TypeError);
  });
});

describe("permission gate", () => {
  it("permits combined bits without denial audit", async () => {
    const h = harness(15, 3);
    expect((await request(h.app).get("/protected")).status).toBe(204);
    expect(h.reached).toHaveBeenCalledTimes(1);
    expect(h.audit).not.toHaveBeenCalled();
  });
  it("rejects absent identity without attributing an audit to an unknown user", async () => {
    const h = harness(undefined);
    expect((await request(h.app).get("/protected")).status).toBe(401);
    expect(h.reached).not.toHaveBeenCalled();
    expect(h.audit).not.toHaveBeenCalled();
  });
  it("awaits a minimal denial audit and ignores client role/identity claims", async () => {
    const h = harness(1, 3);
    const res = await request(h.app).get("/protected").query({ role: "ADMIN", password: "synthetic" })
      .set("Authorization", "Bearer synthetic");
    expect(res.status).toBe(403);
    expect(h.audit).toHaveBeenCalledTimes(1);
    expect(h.audit).toHaveBeenCalledWith({ userId, action: "PERMISSION_DENIED",
      targetEntity: "Permission", targetId: "3", payload: { required: 3 } });
    expect(h.reached).not.toHaveBeenCalled();
  });
  it("does not proceed while the audit is still pending", async () => {
    let resolveAudit!: () => void;
    const pending = new Promise<void>((resolve) => { resolveAudit = resolve; });
    const audit = vi.fn(() => pending);
    const h = harness(1, 3, audit);
    const middleware = requirePermission(3, { audit });
    const next = vi.fn();
    middleware({ auth: { userId, permissions: 1 } } as Parameters<typeof middleware>[0],
      {} as Parameters<typeof middleware>[1], next);
    await Promise.resolve();
    expect(audit).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();
    resolveAudit();
    await pending; await Promise.resolve(); await Promise.resolve();
    expect(next).toHaveBeenCalledTimes(1);
    expect(h.reached).not.toHaveBeenCalled();
  });
  it("fails closed and hides an audit rejection", async () => {
    const h = harness(1, 3, vi.fn().mockRejectedValue(new Error("synthetic secret")));
    const res = await request(h.app).get("/protected");
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("synthetic secret");
    expect(h.reached).not.toHaveBeenCalled();
  });
  it("captures synchronous audit failure safely", async () => {
    const h = harness(1, 3, vi.fn(() => { throw new Error("synthetic secret"); }));
    expect((await request(h.app).get("/protected")).status).toBe(500);
    expect(h.reached).not.toHaveBeenCalled();
  });
});
