import type { PrismaClient } from "@prisma/client";
import { parseRegistrationEnv } from "../../config/registration-env.js";
import { createRegistrationEmailSender } from "../../lib/email.js";
import { createRegistrationService } from "./registration.service.js";

/**
 * Compose registration services from private environment and the bounded real sender.
 * @param source Already loaded server environment; defaults to process.env, never client config.
 * @param client Optional trusted restricted fixture/runtime client, never migration credentials.
 * @returns Registration operations; construction does not send mail or open a DB connection.
 * @throws Safe configuration errors listing invalid variable names without values.
 * @remarks T010 loads this factory lazily for validated registration requests. Existing
 * login and environment-free app construction remain independent of email setup.
 */
export function createConfiguredRegistrationService(source: NodeJS.ProcessEnv = process.env, client?: PrismaClient) {
  const config = parseRegistrationEnv(source);
  const sendOtp = createRegistrationEmailSender({ apiKey: config.apiKey, from: config.from,
    testRecipient: config.testRecipient });
  return createRegistrationService({ otpKey: config.otpKey, sendOtp, ...(client ? { client } : {}) });
}
