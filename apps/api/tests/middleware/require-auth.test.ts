import { createHash } from "node:crypto";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler, SessionContextError } from "../../src/middleware/error-handler.js";

const mocks = vi.hoisted(() => ({ scoped: vi.fn(), audit: vi.fn() }));
vi.mock("../../src/lib/prisma.js", () => ({ prisma: {}, withSession: mocks.scoped }));
vi.mock("../../src/modules/audit/audit.service.js", () => ({ appendAudit: mocks.audit }));
import { requireAuth, readBearerToken, type AuthRouteOptions } from "../../src/middleware/require-auth.js";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "synthetic@example.test",
  displayName: null, role: "STUDENT", status: "ACTIVE" };
const token = "a".repeat(64);
const tx = {};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.scoped.mockImplementation(async (_hash, callback) => callback(tx, user));
  mocks.audit.mockResolvedValue(undefined);
});

function harness(required = 1, options: AuthRouteOptions = {}) {
  const app = express();
  const work = vi.fn().mockResolvedValue({ safe: true });
  app.get("/protected", requireAuth(required, work, options));
  app.use(errorHandler);
  return { app, work };
}

describe("transaction-scoped authentication and ownership", () => {
  it.each([undefined, "Basic synthetic", "Bearer", "Bearer a b", "Bearer a,b"])(
    "rejects malformed/missing authorization %s before database work", async (header) => {
      const h = harness();
      const call = request(h.app).get("/protected");
      if (header) call.set("Authorization", header);
      const res = await call;
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHENTICATED");
      expect(mocks.scoped).not.toHaveBeenCalled();
      expect(h.work).not.toHaveBeenCalled();
    },
  );
  it("rejects duplicate authorization fields", () => {
    expect(() => readBearerToken({ rawHeaders: ["Authorization", "Bearer a", "authorization", "Bearer b"],
      headers: { authorization: "Bearer a" } } as Parameters<typeof readBearerToken>[0]))
      .toThrow(SessionContextError);
  });
  it("maps expired/revoked/unknown/ineligible database context to the same safe 401", async () => {
    mocks.scoped.mockRejectedValue(new SessionContextError());
    const h = harness();
    const res = await request(h.app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(h.work).not.toHaveBeenCalled();
  });
  it("hashes the token and uses only server identity despite forged query claims", async () => {
    const h = harness();
    const res = await request(h.app).get("/protected").query({ userId: "other", role: "ADMIN" })
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ safe: true });
    expect(mocks.scoped.mock.calls[0]?.[0]).toBe(createHash("sha256").update(token).digest("hex"));
    expect(mocks.scoped.mock.calls[0]?.[3]).toBe("background");
    expect(h.work.mock.calls[0]?.[0].tx).toBe(tx);
    expect(h.work.mock.calls[0]?.[0].user.id).toBe(user.id);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("audits permission denial in a separate nonrenewing scope without protected work", async () => {
    const h = harness(16, { activity: "interactive" });
    const res = await request(h.app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(h.work).not.toHaveBeenCalled();
    expect(mocks.scoped).toHaveBeenCalledTimes(2);
    expect(mocks.scoped.mock.calls[1]?.[3]).toBe("background");
    expect(mocks.audit).toHaveBeenCalledWith(tx, expect.objectContaining({
      userId: user.id, action: "PERMISSION_DENIED", payload: { required: 16 },
    }));
  });
  it("checks scoped ownership after permission and audits denial", async () => {
    const owner = vi.fn().mockResolvedValue("00000000-0000-4000-8000-000000000002");
    const h = harness(1, { owner });
    expect((await request(h.app).get("/protected").set("Authorization", `Bearer ${token}`)).status).toBe(403);
    expect(owner.mock.calls[0]?.[0].tx).toBe(tx);
    expect(h.work).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledWith(tx, expect.objectContaining({ action: "OWNERSHIP_DENIED" }));
  });
  it("does not resolve resource ownership when permission is missing", async () => {
    const owner = vi.fn();
    const h = harness(16, { owner });
    await request(h.app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(owner).not.toHaveBeenCalled();
  });
  it("sends no successful response if commit fails after protected work", async () => {
    mocks.scoped.mockImplementation(async (_hash, callback) => {
      await callback(tx, user);
      throw new Error("synthetic commit failure");
    });
    const h = harness();
    const res = await request(h.app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(res.body).not.toHaveProperty("safe");
    expect(h.work).toHaveBeenCalledTimes(1);
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("stays closed if independent denial auditing fails", async () => {
    mocks.audit.mockRejectedValue(new Error("synthetic secret"));
    const h = harness(16);
    const res = await request(h.app).get("/protected").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("synthetic secret");
    expect(h.work).not.toHaveBeenCalled();
  });
  it("uses the server-selected interactive classification for successful work", async () => {
    const h = harness(1, { activity: "interactive" });
    expect((await request(h.app).get("/protected").set("Authorization", `Bearer ${token}`)).status).toBe(200);
    expect(mocks.scoped.mock.calls[0]?.[3]).toBe("interactive");
  });
});
