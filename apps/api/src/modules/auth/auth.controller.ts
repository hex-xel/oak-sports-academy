import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import type { SessionResponse } from "@oak/shared";
import { PERMISSIONS } from "@oak/shared";
import { requireAuth, readBearerToken } from "../../middleware/require-auth.js";
import { SessionContextError } from "../../middleware/error-handler.js";
import { authParamsSchema, authQuerySchema, loginSchema, logoutSchema, validateMobileClient } from "./auth.schemas.js";
import { login } from "./auth.service.js";
import { revokeSession } from "./session.service.js";

/**
 * Authenticate the native client and deliver a safe login projection after commit.
 * @param req Validated native header and JSON credentials; other claims are stripped.
 * @param res Receives safe user fields, token once and expiry, without cookies.
 * @param next Receives validation/auth/database failures for sanitized serialization.
 * @returns Immediately; asynchronous issuance and attempt recording are awaited internally.
 * @throws No intentional synchronous errors; failures forward through next.
 */
export const loginController: RequestHandler = (req, res, next) => {
  void (async () => {
    const headers = req.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === "x-client-platform");
    validateMobileClient(headers.length === 1 ? req.headers["x-client-platform"] : undefined);
    authParamsSchema.parse(req.params);
    authQuerySchema.parse(req.query);
    const input = loginSchema.parse(req.body);
    const agent = req.get("user-agent");
    const result = await login(input, { ...(req.ip ? { ipAddress: req.ip } : {}), ...(agent ? { userAgent: agent } : {}) });
    res.status(200).json({ user: { id: result.user.id, email: result.user.email,
      role: result.user.role, status: result.user.status }, landingPath: "/",
      sessionToken: result.sessionToken, expiresAt: result.expiresAt });
  })().catch(next);
};

/**
 * Read current identity/expiry under permission, self-ownership and transaction-local RLS.
 * @param req One Bearer header; query/parameter identity claims are discarded.
 * @param res Receives safe identity and absolute expiry after transaction commit.
 * @param next Receives uniform invalid-session or sanitized infrastructure failures.
 * @returns Immediately via the protected wrapper; no token/hash or cookie is returned.
 * @throws No intentional synchronous request errors; background lookup never renews activity.
 */
export const sessionController: RequestHandler = requireAuth(PERMISSIONS.SELF_READ, async ({ tx, user, req }): Promise<SessionResponse> => {
  authParamsSchema.parse(req.params);
  authQuerySchema.parse(req.query);
  const tokenHash = createHash("sha256").update(readBearerToken(req), "utf8").digest("hex");
  const session = await tx.session.findUnique({ where: { tokenHash }, select: { userId: true, expiresAt: true } });
  if (!session || session.userId !== user.id) throw new SessionContextError();
  return { user: { id: user.id, email: user.email, displayName: user.displayName,
    role: user.role, status: user.status }, landingPath: "/", expiresAt: session.expiresAt.toISOString() };
}, { activity: "background" });

/**
 * Revoke the session identified solely by one well-formed Bearer header.
 * @param req Native request; body/query identity and all-device claims are discarded.
 * @param res Receives an empty 204 only after the restricted revocation completes; no cookies.
 * @param next Receives malformed-header, validation or database errors for safe serialization.
 * @returns Immediately; awaited asynchronous work forwards failures to Express 4.
 * @remarks An active-session gate would reject expired/revoked tokens and break the
 * approved idempotent contract. This never renews activity or revokes other sessions.
 */
export const logoutController: RequestHandler = (req, res, next) => {
  void (async () => {
    const token = readBearerToken(req);
    authParamsSchema.parse(req.params);
    authQuerySchema.parse(req.query);
    logoutSchema.parse(req.body);
    await revokeSession(token);
    res.status(204).end();
  })().catch(next);
};
