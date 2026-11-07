import "../src/config/env.js";
import { parseRegistrationEnv } from "../src/config/registration-env.js";

// Owner-only config validation: no mail, network, DB connection, or secret output.
try {
  parseRegistrationEnv();
  console.log("Registration email configuration is valid. No email was sent.");
} catch (error) {
  const safe = error instanceof Error && /^Invalid registration environment: [A-Za-z_, ]+\.$/.test(error.message);
  console.error(safe ? error.message : "Registration configuration is invalid. Check private API settings.");
  process.exitCode = 1;
}
