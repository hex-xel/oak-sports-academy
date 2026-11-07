import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

// Owner-invoked setup only. Fixed loopback URLs cannot inherit a cloud/development target.
const require = createRequire(import.meta.url);
const schema = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
// Verify the existing disposable marker before applying even additive migrations.
// Never read development .env to select a target or create/reset an unmarked database.
const preflight = new PrismaClient({ datasources: { db: {
  url: "postgresql://postgres:oak_test_only_admin@127.0.0.1:55432/oak_auth_test",
} }, log: [], errorFormat: "minimal" });
try {
  const rows = await preflight.$queryRaw<Array<{ db: string; role: string; name: string }>>`
    SELECT current_database() AS db, current_user AS role, name FROM oak_test_control.marker`;
  if (rows.length !== 1 || rows[0]?.db !== "oak_auth_test" || rows[0]?.role !== "postgres" ||
    rows[0]?.name !== "oak_auth_test_v1") throw new Error("Invalid disposable database marker.");
} catch {
  console.error("Disposable database preflight failed; migration refused. Start the existing test database and verify its marker.");
  process.exitCode = 1;
} finally { await preflight.$disconnect(); }
if (process.exitCode) process.exit(process.exitCode);
const result = spawnSync(process.execPath, [require.resolve("prisma/build/index.js"),
  "migrate", "deploy", "--schema", schema], {
  stdio: "inherit",
  env: { ...process.env,
    DATABASE_URL: "postgresql://postgres:oak_test_only_admin@127.0.0.1:55432/oak_auth_test",
    DIRECT_URL: "postgresql://postgres:oak_test_only_admin@127.0.0.1:55432/oak_auth_test",
  },
});
if (result.error || result.status !== 0) {
  console.error("Local test migration failed. Do not change the target to a shared database.");
  process.exitCode = 1;
}
