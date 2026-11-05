import type { Request, RequestHandler } from "express";
import { ApiError } from "./error-handler.js";

/**
 * Compare a server-resolved resource owner with the verified account; no Admin bypass.
 * @param resolveOwner Trusted resolver; use scoped database data, never a claimed userId.
 * @returns Express middleware forwarding safe 401/403 or resolver errors.
 * @remarks Performs no writes or audit itself; the scoped auth wrapper audits denials.
 * @throws No synchronous intentional errors; async resolver failures go to next.
 */
export function requireOwnership(resolveOwner: (req: Request) => string | null | Promise<string | null>): RequestHandler {
  return (req, _res, next): void => {
    if (!req.auth) { next(new ApiError("UNAUTHENTICATED")); return; }
    void Promise.resolve().then(() => resolveOwner(req)).then((ownerId) => {
      next(ownerId !== null && ownerId === req.auth?.userId ? undefined : new ApiError("FORBIDDEN"));
    }, next);
  };
}
