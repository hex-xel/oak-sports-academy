import { randomUUID } from "node:crypto";
import { createSecurityDatabase } from "../helpers/db.js";
import { createRegistrationCapability, withRegistration, type RegistrationIdentity } from "../../src/modules/registration/capability.js";
import type { Prisma } from "@prisma/client";

/**
 * Create two pending applicants inside the guarded fixture's existing owned actor set.
 * @returns Restricted/admin fixture clients, synthetic proof handles and scoped helpers.
 * @throws Safe preflight/cleanup errors from the disposable fixture; DB failures propagate.
 * @remarks No real email, files or provider calls. Admin writes seed test state only;
 * application callbacks always use the restricted client. Cleanup remains owner-ID scoped.
 */
export function createRegistrationDatabase() {
  const db = createSecurityDatabase({ concurrency: true });
  const aliceApplication = randomUUID();
  const bobApplication = randomUUID();
  const aliceProof = createRegistrationCapability();
  const bobProof = createRegistrationCapability();
  return {
    ...db, aliceApplication, bobApplication, aliceProof, bobProof,
    /** Reset only this fixture, then seed two pending unverified registration flows. */
    async reset(): Promise<void> {
      await db.reset();
      await db.admin.$transaction(async tx => {
        for (const [userId, applicationId, proof] of [
          [db.alice.id, aliceApplication, aliceProof], [db.bob.id, bobApplication, bobProof],
        ] as const) {
          await tx.user.update({ where: { id: userId }, data: { status: "PENDING_APPROVAL", emailVerifiedAt: null } });
          await tx.registrationApplication.create({ data: { id: applicationId, userId,
            studentType: "NEW_WHITE_BELT", startOperationId: randomUUID() } });
          // Database timestamps match the migration's exact expiry/cooldown checks.
          await tx.$executeRaw`INSERT INTO public.email_verification_challenges
            (id,"applicationId","codeDigest",version,attempts,"expiresAt","resendAfter","issueOperationId","issuedAt")
            VALUES (${randomUUID()}::uuid,${applicationId}::uuid,${"a".repeat(64)},1,0,
              CURRENT_TIMESTAMP + INTERVAL '10 minutes',CURRENT_TIMESTAMP + INTERVAL '60 seconds',
              ${randomUUID()}::uuid,CURRENT_TIMESTAMP)`;
          await tx.$executeRaw`INSERT INTO public.registration_capabilities
            (id,"applicationId","tokenHash","challengeVersion","expiresAt","createdAt") VALUES
            (${randomUUID()}::uuid,${applicationId}::uuid,${proof.tokenHash},1,
              CURRENT_TIMESTAMP + INTERVAL '1 hour',CURRENT_TIMESTAMP)`;
        }
      });
    },
    /** Simulate a completed mailbox check as privileged fixture setup, never production verification. */
    async verifyAlice(): Promise<void> {
      await db.admin.$transaction(async tx => {
        await tx.user.update({ where: { id: db.alice.id }, data: { emailVerifiedAt: new Date() } });
        await tx.emailVerificationChallenge.update({ where: { applicationId: aliceApplication }, data: { consumedAt: new Date() } });
        await tx.registrationCapability.update({ where: { tokenHash: aliceProof.tokenHash }, data: { verifiedAt: new Date() } });
      });
    },
    /** Run Alice's real hash/context boundary on the restricted runtime client. */
    async asAlice<T>(verified: boolean, work: (tx: Prisma.TransactionClient, identity: RegistrationIdentity) => Promise<T>): Promise<T> {
      return withRegistration(aliceProof.token, verified, work, db.runtime);
    },
  };
}
