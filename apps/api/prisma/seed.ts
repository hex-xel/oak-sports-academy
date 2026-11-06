import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { parseSeedSettings, seedDevelopmentAccounts } from "../src/modules/auth/development-seed.js";

let client: PrismaClient | undefined;
try {
  if (process.env.NODE_ENV === "production") throw new Error("Production seed refused.");
  for (const name of [".env", ".env.seed"]) {
    const path = fileURLToPath(new URL(`../${name}`, import.meta.url));
    if (existsSync(path)) loadEnvFile(path);
  }
  const settings = parseSeedSettings(process.env);
  client = new PrismaClient({ datasources: { db: { url: settings.databaseUrl } }, log: [], errorFormat: "minimal" });
  const result = await seedDevelopmentAccounts(client, settings.password);
  console.log(`Development seed complete: ${result.created} created, ${result.existing} already present. Existing accounts unchanged.`);
} catch {
  console.error("Development seed failed or was refused. Check private seed settings and reserved-account collisions; do not share credentials or raw database errors.");
  process.exitCode = 1;
} finally { await client?.$disconnect(); }
