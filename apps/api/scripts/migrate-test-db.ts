import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Owner-invoked setup only. Fixed loopback URLs cannot inherit a cloud/development target.
const require = createRequire(import.meta.url);
const schema = fileURLToPath(new URL("../prisma/schema.prisma", import.meta.url));
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
