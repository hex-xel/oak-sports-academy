import type { RequestHandler, Router } from "express";
import type { RateLimiters } from "../../middleware/rate-limit.js";
import type { RegistrationOperations } from "./registration.controller.js";

/**
 * Mount the four implemented registration operations, never future upload/finalize stubs.
 * @param router Versioned application router.
 * @param limits Application-owned registration quota stores.
 * @param service Optional server-injected test backend; defaults to private configured service.
 * @returns Nothing; adds routes without environment reads, network or DB connection.
 * @throws Framework registration errors; lazy configuration/request failures use safe next.
 * @remarks Keep loaders application-local. Failed configuration is not cached forever;
 * successful construction is reused. No logged-in-session middleware is bypassed/relaxed.
 */
export function registerRegistrationRoutes(router: Router, limits: RateLimiters, service?: RegistrationOperations): void {
  let pendingService: Promise<RegistrationOperations> | undefined;
  const getService = (): Promise<RegistrationOperations> => {
    if (service) return Promise.resolve(service);
    pendingService ??= import("./registration.factory.js").then(module => module.createConfiguredRegistrationService())
      .catch((error: unknown) => { pendingService = undefined; throw error; });
    return pendingService;
  };
  let controllers: Promise<ReturnType<typeof import("./registration.controller.js").createRegistrationControllers>> | undefined;
  function dispatch(name: "start" | "verify" | "resend" | "current"): RequestHandler {
    return (req, res, next) => {
      controllers ??= import("./registration.controller.js").then(module => module.createRegistrationControllers(getService));
      void controllers.then(bundle => bundle[name](req, res, next)).catch(next);
    };
  }
  router.post("/registrations/start", limits.registrationIssueIp, limits.registrationStartEmail, dispatch("start"));
  router.post("/registrations/verify-email", limits.registrationVerifyIp, limits.registrationVerifyProof, dispatch("verify"));
  router.post("/registrations/resend-code", limits.registrationIssueIp, dispatch("resend"));
  router.get("/registrations/current", dispatch("current"));
}
