import type { Router } from "express";
import type { RateLimiters } from "../../middleware/rate-limit.js";

/**
 * Mount native login, session lookup and current-session logout.
 * @param router Versioned application router receiving the three auth routes.
 * @param limiters Application-owned sensitive login limiters.
 * @returns Nothing; mutates route registration without database/environment I/O.
 * @throws Framework registration errors; request failures forward to the safe boundary.
 * @remarks Lazy controller import preserves T030's environment-free app construction contract.
 */
export function registerAuthRoutes(router: Router, limiters: RateLimiters): void {
  // Preserve createApp's environment/database-free import contract (T030).
  router.post("/auth/login", limiters.loginIp, limiters.loginEmail, (req, res, next) => {
    void import("./auth.controller.js").then(({ loginController }) => loginController(req, res, next)).catch(next);
  });
  router.get("/auth/session", (req, res, next) => {
    void import("./auth.controller.js").then(({ sessionController }) => sessionController(req, res, next)).catch(next);
  });
  router.post("/auth/logout", (req, res, next) => {
    void import("./auth.controller.js").then(({ logoutController }) => logoutController(req, res, next)).catch(next);
  });
}
