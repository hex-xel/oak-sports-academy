import { createServer, type Server } from "node:http";
import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { initializePasswordService } from "./modules/auth/password.service.js";

/**
 * Warm credential verification before opening the API listener.
 * @returns Listening Node server; signal handlers stop traffic and release resources.
 * @throws Startup/configuration/bind errors; entrypoint logs only a static safe message.
 * @remarks Binds 0.0.0.0 for LAN/device development and hosted ingress. No queries or
 * migrations run at startup. TLS/trusted proxy configuration belongs to deployment.
 */
export async function startServer(): Promise<Server> {
  await initializePasswordService();
  const runtime = createApp({ trustProxy: env.TRUST_PROXY, production: env.NODE_ENV === "production" });
  const server = createServer(runtime.app);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(env.PORT, "0.0.0.0", () => {
        server.off("error", reject);
        resolve();
      });
    });
  } catch (error) {
    runtime.close();
    await prisma.$disconnect();
    throw error;
  }
  let stopping = false;
  const shutdown = (): void => {
    if (stopping) return;
    stopping = true;
    // Bound shutdown for stalled clients without logging request or socket data.
    const deadline = setTimeout(() => server.closeAllConnections(), 10_000);
    deadline.unref();
    server.close(() => {
      clearTimeout(deadline);
      runtime.close();
      void prisma.$disconnect().catch(() => { process.exitCode = 1; });
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  console.log(`API listening on port ${env.PORT}.`);
  return server;
}

// Importing this module for tests does not start a process/listener.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startServer().catch(() => {
    console.error("API startup failed. Check configuration and port availability.");
    process.exitCode = 1;
  });
}
