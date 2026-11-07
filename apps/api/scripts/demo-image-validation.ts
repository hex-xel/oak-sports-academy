import { performance } from "node:perf_hooks";
import { ImageValidationError, validateRegistrationImage } from "../src/modules/documents/image-validation.js";
import { imageValidationFixtures } from "./helpers/image-validation-fixtures.js";

// Owner-run offline demo of the production validator. No env, server, DB or private files.
try {
  const fixtures = await imageValidationFixtures();
  const rows: Array<Record<string, string | number>> = [];
  let mismatches = 0;
  for (const fixture of fixtures) {
    const started = performance.now();
    let accepted = false;
    let result: string;
    try {
      const image = await validateRegistrationImage(fixture.input);
      accepted = true;
      result = `ACCEPT ${image.width}x${image.height}; SHA-256 ${image.checksum.slice(0, 12)}…`;
    } catch (error) {
      if (!(error instanceof ImageValidationError)) throw error;
      result = `REJECT ${error.reason}`;
    }
    if (accepted !== fixture.accepted) mismatches++;
    rows.push({ case: fixture.name, bytes: fixture.input.bytes.length,
      first8: fixture.input.bytes.subarray(0, 8).toString("hex"), result,
      ms: Math.round((performance.now() - started) * 100) / 100 });
  }
  console.log("Algorithm 3: Magic Byte Signature & MIME Validation with Quality Pre-Screening");
  console.table(rows);
  console.log(`${fixtures.length - mismatches}/${fixtures.length} expected outcomes matched.`);
  console.log("Production validator called directly; private upload/mobile integration remains T014–T017.");
  if (mismatches) process.exitCode = 1;
} catch {
  console.error("Algorithm demo failed unexpectedly. Stop and report this safe message; no private data was accessed.");
  process.exitCode = 1;
}
