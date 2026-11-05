import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Never implicitly load .env or reuse development DATABASE_URL in a test process.
const testFile = fileURLToPath(new URL("./.env.test", import.meta.url));
if (existsSync(testFile)) loadEnvFile(testFile);
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ??
  "postgresql://oak_api_test:synthetic@127.0.0.1:1/oak_auth_test";
delete process.env.DIRECT_URL;

export default defineConfig({ test: {
  include: ["tests/**/*.test.ts"],
  fileParallelism: false,
  pool: "forks",
  maxWorkers: 1,
  minWorkers: 1,
  isolate: true,
  testTimeout: 30_000,
  hookTimeout: 30_000,
  clearMocks: true,
  restoreMocks: true,
} });
