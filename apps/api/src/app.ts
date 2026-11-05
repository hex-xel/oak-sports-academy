import express, { type Express, type Router } from "express";
import helmet from "helmet";
import { z } from "zod";
import { createRateLimiters, type RateLimiters } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error-handler.js";

/** Server-owned configuration; no runtime environment/database access on import. */
export type AppOptions = Readonly<{ trustProxy?: false | string[]; production?: boolean }>;

/** Application plus versioned router and stores for later auth registration and shutdown. */
export type AppRuntime = Readonly<{
  app: Express;
  router: Router;
  rateLimiters: RateLimiters;
  close: () => void;
}>;

/**
 * Construct the API security boundary without listening or connecting to a database.
 * @param options Trusted proxy allowlist and production header mode, fixed by the server.
 * @returns App, /api/v1 router and limiter cleanup; call close at teardown.
 * @throws Framework/configuration errors; never pass client-controlled options.
 * @remarks Global quota precedes bounded JSON parsing; Helmet covers parser/404 errors.
 * T041 registers auth routes on router using the returned sensitive limiters. Protected
 * work must use requireAuth's server-selected activity mode; no heartbeat is mounted.
 */
export function createApp(options: AppOptions = {}): AppRuntime {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", options.trustProxy ?? false);
  app.set("query parser", "simple");
  const rateLimiters = createRateLimiters();
  app.use(helmet({
    contentSecurityPolicy: { useDefaults: false, directives: {
      defaultSrc: ["'none'"], baseUri: ["'none'"], frameAncestors: ["'none'"],
      formAction: ["'none'"], objectSrc: ["'none'"],
    } },
    strictTransportSecurity: options.production === true
      ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  }));
  app.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  app.use(rateLimiters.globalIp);
  app.use(express.json({ limit: 10 * 1024, strict: true }));
  const router = express.Router();
  /** GET /api/v1/health: empty params/query schema, static liveness JSON, no DB I/O.
   * Extra query fields are stripped; validation errors reach the safe error handler.
   * This is not readiness or authentication and does not establish/renew a session. */
  router.get("/health", (req, res, next) => {
    try {
      z.object({}).strip().parse(req.params);
      z.object({}).strip().parse(req.query);
      res.json({ status: "ok" });
    } catch (error) { next(error); }
  });
  app.use("/api/v1", router);
  app.use((_req, res) => { res.status(404).json({ message: "Resource not found." }); });
  app.use(errorHandler);
  return { app, router, rateLimiters, close: () => rateLimiters.shutdown() };
}
