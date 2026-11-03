import { performance } from "node:perf_hooks";
import { hashPassword, initializePasswordService, verifyPassword } from "../src/modules/auth/password.service.js";

// Owner-run host measurement only; synthetic data never touches a database or log.
const input = "synthetic-host-benchmark";
try {
  await initializePasswordService();
  const digest = await hashPassword(input);
  const known: number[] = [];
  const unknown: number[] = [];
  for (let i = 0; i < 10; i++) {
    let start = performance.now();
    await verifyPassword(input, digest);
    known.push(performance.now() - start);
    start = performance.now();
    await verifyPassword(input, null);
    unknown.push(performance.now() - start);
  }
  for (const [label, values] of [["Known", known], ["Unknown", unknown]] as const) {
    values.sort((a, b) => a - b);
    console.log(`${label} verify (10 sequential samples): median=${values[4]?.toFixed(1)} ms, max=${values[9]?.toFixed(1)} ms`);
  }
  console.log("Diagnostic only: not a timing-equivalence or end-to-end login benchmark. Repeat on the deployment host before tuning approved work factors.");
} catch {
  console.error("Password benchmark failed. Report this safe message; do not print native errors or synthetic hashes.");
  process.exitCode = 1;
}
