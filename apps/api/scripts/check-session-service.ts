import { randomBytes } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { SessionContextError } from "../src/middleware/error-handler.js";
import { revokeSession, verifySession } from "../src/modules/auth/session.service.js";

try {
  // No known account/token is used. No records are created; a random token should match none.
  const token = randomBytes(32).toString("hex");
  let rejected = false;
  try { await verifySession(token); }
  catch (error) {
    if (!(error instanceof SessionContextError)) throw new Error("Unexpected rejection");
    rejected = true;
  }
  if (!rejected) throw new Error("Unexpected valid random session");
  await revokeSession(token);
  await revokeSession(token);
  if (await prisma.user.count() !== 0) throw new Error("Unscoped access remained open");
  console.log("Session-service rejection check passed: unknown token returns safe 401, repeated unknown-token logout succeeds, and unscoped access stays closed. Creation/expiry/revocation isolation await T031.");
} catch {
  console.error("Session-service rejection check failed. Share this safe output; do not print tokens or database errors.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
