import type { RequestHandler } from "express";
import { hasPermissions } from "@oak/shared";
import { ApiError } from "./error-handler.js";

/** Minimal trusted identity; T029 populates it only after server-side session verification. */
export type PermissionIdentity = Readonly<{ userId: string; permissions: number }>;

declare global {
  namespace Express {
    interface Request {
      /** Server-populated identity; never assigned from body, headers or query claims. */
      auth?: PermissionIdentity;
    }
  }
}

/** Safe denial metadata; excludes route URLs, headers, request bodies and credentials. */
export type PermissionDenial = Readonly<{
  userId: string;
  action: "PERMISSION_DENIED";
  targetEntity: "Permission";
  targetId: string;
  payload: Readonly<{ required: number }>;
}>;

/** Trusted audit writer; must commit separately from the rejected business transaction. */
export type PermissionGateOptions = Readonly<{
  audit: (event: PermissionDenial) => Promise<unknown>;
}>;

/**
 * Require all configured bits before a later ownership gate or protected handler.
 * @param required Nonzero unsigned 32-bit mask fixed by server route configuration.
 * @param options Required awaited audit writer; no implicit no-op or privileged fallback.
 * @returns Express 4 middleware forwarding safe 401/403/500 errors to the final handler.
 * @throws TypeError at route construction for invalid mask or missing audit writer.
 * @remarks Denials perform only the supplied audit side effect; never invoke protected
 * work. Audit failure becomes INTERNAL_ERROR and stays closed. T029/T030 must wire a
 * separate committed audit transaction; this gate never imports runtime credentials.
 */
export function requirePermission(required: number, options: PermissionGateOptions): RequestHandler {
  if (!hasPermissions(0xffffffff, required) || typeof options?.audit !== "function") {
    throw new TypeError("Invalid permission gate configuration");
  }
  return (req, _res, next): void => {
    const identity = req.auth;
    if (!identity || typeof identity.userId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identity.userId)) {
      next(new ApiError("UNAUTHENTICATED"));
      return;
    }
    if (hasPermissions(identity.permissions, required)) {
      next();
      return;
    }
    const event: PermissionDenial = Object.freeze({ userId: identity.userId,
      action: "PERMISSION_DENIED", targetEntity: "Permission", targetId: String(required),
      payload: Object.freeze({ required }) });
    // Promise.resolve also captures a synchronous throw from a misbehaving adapter.
    void Promise.resolve().then(() => options.audit(event)).then(
      () => next(new ApiError("FORBIDDEN")),
      () => next(new ApiError("INTERNAL_ERROR")),
    );
  };
}
