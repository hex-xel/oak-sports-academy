import { createHash, randomBytes } from "node:crypto";
import { prisma, SessionContextError, withSession } from "../src/lib/prisma.js";

try {
  let invoked = false;
  // Random local inputs only; never print them or use an actual account/session token.
  const unknownHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  for (const hash of ["malformed", unknownHash]) {
    let rejected = false;
    try {
      await withSession(hash, async () => { invoked = true; });
    } catch (error) {
      if (!(error instanceof SessionContextError) || error.status !== 401 || error.code !== "UNAUTHENTICATED") {
        throw new Error("Unexpected session rejection");
      }
      rejected = true;
    }
    if (!rejected || invoked) throw new Error("Invalid session reached protected work");
  }
  const context = await prisma.$queryRaw<Array<{ identity: string | null }>>`
    SELECT public.oak_current_user_id()::text AS identity`;
  if (context.length !== 1 || context[0]?.identity !== null || await prisma.user.count() !== 0) {
    throw new Error("Unscoped access did not fail closed");
  }
  console.log("Session-context rejection check passed: malformed/unknown sessions return safe 401 errors, protected callbacks never run, and unscoped access remains closed. Valid-session isolation still awaits T031.");
} catch {
  console.error("Session-context rejection check failed. Share this safe message for review; do not print tokens or raw database errors.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
