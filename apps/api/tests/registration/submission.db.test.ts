import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createRegistrationDatabase } from "./helpers.js";
import { appendRegistrationAudit, createRegistrationCapability, registrationCapabilityHash, withRegistration } from "../../src/modules/registration/capability.js";
import { verifyAuditChain } from "../../src/modules/audit/audit.service.js";
import { createRegistrationService, type RegistrationOtpMessage } from "../../src/modules/registration/registration.service.js";
import { createOtpTools } from "../../src/modules/registration/otp.service.js";
import type { RegistrationStartRequest } from "@oak/shared";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { verifyPassword } from "../../src/modules/auth/password.service.js";

const fixture = createRegistrationDatabase();

function service(fail = false) {
  const messages: RegistrationOtpMessage[] = [];
  return { messages, api: createRegistrationService({ client: fixture.runtime, otpKey: "d".repeat(64),
    sendOtp: async message => {
      messages.push(message);
      if (fail) throw new Error("synthetic provider failure");
      return { providerId: randomUUID() };
    },
  }) };
}

function credentials(): RegistrationStartRequest {
  return { operationId: randomUUID(), email: `${randomUUID()}@example.test`,
    studentType: "newly-white-belt", password: "Synthetic-Registration1!" };
}

async function startOwned(api: ReturnType<typeof createRegistrationService>, input: RegistrationStartRequest) {
  fixture.ownRegistrationOperation(input.operationId);
  try { return await api.start(input); }
  finally {
    const user = await fixture.admin.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (user) fixture.ownCreatedUser(user.id, input.email);
  }
}

async function openCooldown(applicationId: string): Promise<void> {
  await fixture.admin.$executeRaw`UPDATE public.email_verification_challenges SET
    "issuedAt"=CURRENT_TIMESTAMP-INTERVAL '61 seconds',
    "expiresAt"=CURRENT_TIMESTAMP+INTERVAL '539 seconds',
    "resendAfter"=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE "applicationId"=${applicationId}::uuid`;
}

describe("registration foundation on the restricted disposable database", () => {
  beforeAll(() => fixture.connect());
  beforeEach(() => fixture.reset());
  afterAll(() => fixture.close());

  it("runs HTTP verification against the restricted database without granting a login session", async () => {
    const { api, messages } = service();
    const input = credentials();
    fixture.ownRegistrationOperation(input.operationId);
    const runtime = createApp({ registration: api });
    try {
      const started = await request(runtime.app).post("/api/v1/registrations/start")
        .set("X-Client-Platform", "mobile").send(input);
      expect(started.status).toBe(202);
      expect(started.headers["set-cookie"]).toBeUndefined();
      expect(messages).toHaveLength(1);
      const proof = started.body.registrationToken as string;
      const challengeId = started.body.challengeId as string;
      const verify = (code: string) => request(runtime.app).post("/api/v1/registrations/verify-email")
        .set("X-Client-Platform", "mobile").set("X-Registration-Token", proof).send({ challengeId, code });
      const wrong = messages[0]!.code === "000000" ? "000001" : "000000";
      expect((await verify(wrong)).status).toBe(400);
      const verified = await verify(messages[0]!.code);
      expect(verified.status).toBe(200);
      expect(verified.headers["set-cookie"]).toBeUndefined();
      expect(verified.body).not.toHaveProperty("sessionToken");
      expect((await request(runtime.app).get("/api/v1/registrations/current")
        .set("X-Client-Platform", "mobile").set("X-Registration-Token", verified.body.registrationToken)).body)
        .toEqual({ next: "complete-profile", verified: true });
      expect((await verify(messages[0]!.code)).status).toBe(401);
      const user = await fixture.admin.user.findUniqueOrThrow({ where: { email: input.email } });
      expect(user.status).toBe("PENDING_APPROVAL");
      expect(user.emailVerifiedAt).not.toBeNull();
      expect(await fixture.admin.session.count({ where: { userId: user.id } })).toBe(0);
    } finally {
      runtime.close();
      const user = await fixture.admin.user.findUnique({ where: { email: input.email }, select: { id: true } });
      if (user) fixture.ownCreatedUser(user.id, input.email);
    }
  });

  it("serializes competing email starts without overwriting the winning password or granting the loser proof", async () => {
    const { api, messages } = service();
    const first = credentials();
    const second = { ...credentials(), email: first.email, password: "Other-Synthetic2!" };
    const results = await Promise.all([startOwned(api, first), startOwned(api, second)]);
    expect(messages).toHaveLength(1);
    const winner = results.findIndex(row => row.challengeId === messages[0]!.challengeId);
    expect(winner).toBeGreaterThanOrEqual(0);
    const loser = results[1 - winner]!;
    const user = await fixture.admin.user.findUniqueOrThrow({ where: { email: first.email }, include: { registration: true } });
    expect(await verifyPassword([first, second][winner]!.password, user.passwordHash)).toBe(true);
    expect(await verifyPassword([second, first][winner]!.password, user.passwordHash)).toBe(false);
    expect(user.registration).not.toBeNull();
    expect(await fixture.admin.user.count({ where: { email: first.email } })).toBe(1);
    await expect(api.verifyEmail(loser.registrationToken, { challengeId: loser.challengeId, code: messages[0]!.code }))
      .rejects.toMatchObject({ code: "INVALID_VERIFICATION_CODE" });
    expect(await api.current(loser.registrationToken)).toEqual({ next: "verify-email", verified: false });
    expect((await api.verifyEmail(results[winner]!.registrationToken,
      { challengeId: messages[0]!.challengeId, code: messages[0]!.code })).verified).toBe(true);
  });

  it("isolates pending technical records and rejects login/caller-supplied application identity", async () => {
    expect(await fixture.runtime.registrationApplication.count()).toBe(0);
    await fixture.runtime.$transaction(async tx => {
      await tx.$executeRaw`SELECT set_config('oak.registration_id', ${fixture.aliceApplication}, true)`;
      expect(await tx.registrationApplication.count()).toBe(0);
    });
    await fixture.asAlice(false, async (tx, identity) => {
      expect(identity.applicationId).toBe(fixture.aliceApplication);
      expect(identity.userId).toBe(fixture.alice.id);
      expect(identity.verified).toBe(false);
      expect((await tx.registrationApplication.findMany()).map(a => a.id)).toEqual([fixture.aliceApplication]);
      const login = await tx.$queryRaw<Array<{ id: string | null }>>`SELECT public.oak_current_user_id() AS id`;
      expect(login[0]?.id).toBeNull();
    });
    await expect(fixture.asUser(fixture.alice.id, async () => true)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(await fixture.runtime.registrationApplication.count()).toBe(0);
  });

  it("requires mailbox proof for personal reads and preserves self-only users while allowing scoped Admin projection", async () => {
    await fixture.admin.studentProfile.create({ data: {
      applicationId: fixture.aliceApplication, firstName: "Synthetic", surname: "Applicant",
      gender: "female", dateOfBirth: new Date("2000-01-01T00:00:00Z"), ageAtSubmission: 26,
      mobile: "9175550100", houseAndLot: "Synthetic fixture", barangay: "Fixture",
      municipality: "Taguig", province: "Metro Manila", validIdType: "school-id",
    } });
    expect(await fixture.asAlice(false, tx => tx.studentProfile.count())).toBe(0);
    await expect(fixture.asAlice(true, async () => true)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    await fixture.verifyAlice();
    expect(await fixture.asAlice(true, tx => tx.studentProfile.count())).toBe(1);
    expect(await withRegistration(fixture.bobProof.token, false, tx => tx.studentProfile.count(), fixture.runtime)).toBe(0);
    // Draft applications are not reviewable, including through the safe account function.
    expect(await fixture.asUser(fixture.actor.id, tx => tx.registrationApplication.count())).toBe(0);
    await fixture.admin.registrationApplication.update({ where: { id: fixture.aliceApplication }, data: {
      stage: "SUBMITTED", submittedAt: new Date(), submitOperationId: randomUUID(), submissionHash: "a".repeat(64),
    } });
    await fixture.asUser(fixture.actor.id, async tx => {
      expect(await tx.registrationApplication.count()).toBe(1);
      expect((await tx.user.findMany()).map(u => u.id)).toEqual([fixture.actor.id]);
      const users = await tx.$queryRaw<Array<{ id: string; email: string }>>`
        SELECT * FROM public.oak_registration_account(${fixture.aliceApplication}::uuid)`;
      expect(users).toHaveLength(1);
      expect(users[0]?.id).toBe(fixture.alice.id);
      expect(users[0]).not.toHaveProperty("passwordHash");
      expect(await tx.$queryRaw`SELECT * FROM public.oak_registration_account(${fixture.bobApplication}::uuid)`).toEqual([]);
    });
  });

  it("fails closed for unknown, revoked, expired, rotated and newly ineligible proof", async () => {
    await expect(withRegistration(createRegistrationCapability().token, false, async () => true, fixture.runtime))
      .rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    await fixture.admin.registrationCapability.update({ where: { tokenHash: fixture.aliceProof.tokenHash }, data: { revokedAt: new Date() } });
    await expect(fixture.asAlice(false, async () => true)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    await fixture.admin.$executeRaw`UPDATE public.registration_capabilities SET "revokedAt"=NULL,
      "createdAt"=CURRENT_TIMESTAMP-INTERVAL '2 hours',"expiresAt"=CURRENT_TIMESTAMP-INTERVAL '1 hour'
      WHERE "tokenHash"=${fixture.aliceProof.tokenHash}`;
    await expect(fixture.asAlice(false, async () => true)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    await fixture.admin.$executeRaw`UPDATE public.registration_capabilities SET
      "createdAt"=CURRENT_TIMESTAMP,"expiresAt"=CURRENT_TIMESTAMP+INTERVAL '1 hour'
      WHERE "tokenHash"=${fixture.aliceProof.tokenHash}`;
    await fixture.admin.emailVerificationChallenge.update({ where: { applicationId: fixture.aliceApplication }, data: { version: 2 } });
    await expect(fixture.asAlice(false, async () => true)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    await fixture.admin.registrationCapability.update({ where: { tokenHash: fixture.aliceProof.tokenHash }, data: { challengeVersion: 2 } });
    await fixture.admin.user.update({ where: { id: fixture.alice.id }, data: { status: "SUSPENDED" } });
    await expect(fixture.asAlice(false, async () => true)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
  });

  it("denies raw proof reads, generic writes, owner escalation and anonymous function execution", async () => {
    await expect(fixture.runtime.registrationCapability.findMany()).rejects.toThrow();
    await expect(fixture.runtime.emailVerificationChallenge.findMany()).rejects.toThrow();
    await expect(fixture.asAlice(false, tx => tx.registrationApplication.update({
      where: { id: fixture.aliceApplication }, data: { status: "APPROVED", approvedAt: new Date() },
    }))).rejects.toThrow();
    const memberships = await fixture.runtime.$queryRaw<Array<{ allowed: boolean }>>`
      SELECT pg_has_role(current_user,'oak_registration_owner','MEMBER') AS allowed`;
    expect(memberships[0]?.allowed).toBe(false);
    const internal = await fixture.runtime.$queryRaw<Array<{ allowed: boolean }>>`
      SELECT has_function_privilege(current_user,p.oid,'EXECUTE') AS allowed FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='oak_registration_issue'`;
    expect(internal).toEqual([{ allowed: false }]);
    const exposed = await fixture.admin.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
        LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
      WHERE n.nspname='public' AND p.proname IN ('oak_current_registration_id',
        'oak_set_registration_context','oak_registration_append_audit','oak_registration_account',
        'oak_registration_is_admin') AND acl.grantee=0 AND acl.privilege_type='EXECUTE'`;
    expect(exposed[0]?.count).toBe(0n);
  });

  it("enforces OTP attempt/lifetime, capability lifetime and consent constraints in SQL", async () => {
    await expect(fixture.admin.emailVerificationChallenge.update({ where: { applicationId: fixture.aliceApplication }, data: { attempts: 6 } })).rejects.toThrow();
    await expect(fixture.admin.$executeRaw`UPDATE public.email_verification_challenges
      SET "expiresAt"="issuedAt"+INTERVAL '11 minutes' WHERE "applicationId"=${fixture.aliceApplication}::uuid`).rejects.toThrow();
    await expect(fixture.admin.$executeRaw`UPDATE public.registration_capabilities
      SET "expiresAt"="createdAt"+INTERVAL '2 hours' WHERE "tokenHash"=${fixture.aliceProof.tokenHash}`).rejects.toThrow();
    await expect(fixture.admin.consentEvidence.create({ data: { applicationId: fixture.aliceApplication,
      operationId: randomUUID(), policyVersion: "registration-2026-11-06", waiver: false, fitness: true, terms: true } })).rejects.toThrow();
  });

  it("binds audit actor/target to proof and rolls back failed caller work", async () => {
    await fixture.asAlice(false, tx => appendRegistrationAudit(tx, "REGISTRATION_STARTED", { version: 1 }));
    const rows = await fixture.admin.auditLog.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(fixture.alice.id);
    expect(rows[0]?.targetId).toBe(fixture.aliceApplication);
    expect(verifyAuditChain(rows).valid).toBe(true);
    await expect(fixture.asAlice(false, tx => appendRegistrationAudit(tx, "REGISTRATION_SUBMITTED", {})))
      .rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    await expect(fixture.asAlice(false, async tx => {
      await appendRegistrationAudit(tx, "EMAIL_VERIFICATION_REQUESTED", {});
      throw new Error("synthetic rollback");
    })).rejects.toThrow("synthetic rollback");
    expect(await fixture.admin.auditLog.count()).toBe(1);
    await expect(fixture.asAlice(false, tx => tx.$queryRaw`
      SELECT public.oak_registration_append_audit('STATUS_UPDATE',${"a".repeat(64)})`)).rejects.toThrow();
  });

  it("serializes competing applicant audit appends into one valid chain", async () => {
    await Promise.all(Array.from({ length: 6 }, (_, index) => withRegistration(
      index % 2 ? fixture.aliceProof.token : fixture.bobProof.token, false,
      tx => appendRegistrationAudit(tx, "EMAIL_VERIFICATION_REQUESTED", { sequence: index }), fixture.runtime)));
    const rows = await fixture.admin.auditLog.findMany();
    expect(rows).toHaveLength(6);
    const ordered: typeof rows = [];
    let head = "0".repeat(64);
    while (ordered.length < rows.length) {
      const next = rows.find(row => row.previousHash === head);
      expect(next).toBeDefined();
      if (!next) break;
      ordered.push(next); head = next.currentHash;
    }
    expect(verifyAuditChain(ordered)).toMatchObject({ valid: true, checkedRecords: 6 });
  });

  it("creates one pending hash-only account and recovers a lost start response without resending/replacing credentials", async () => {
    const { api, messages } = service();
    const input = credentials();
    const initial = await startOwned(api, input);
    const before = await fixture.admin.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(before.status).toBe("PENDING_APPROVAL");
    expect(before.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await fixture.admin.session.count({ where: { userId: before.id } })).toBe(0);
    expect(messages).toHaveLength(1);
    expect(initial.delivery).toBe("unconfirmed");
    const retried = await startOwned(api, input);
    expect(retried.registrationToken).not.toBe(initial.registrationToken);
    expect(retried.challengeId).toBe(initial.challengeId);
    expect(retried.registrationExpiresAt).toBe(initial.registrationExpiresAt);
    expect(messages).toHaveLength(1);
    expect((await fixture.admin.user.findUniqueOrThrow({ where: { id: before.id } })).passwordHash).toBe(before.passwordHash);
    await expect(api.current(initial.registrationToken)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    const verified = await api.verifyEmail(retried.registrationToken, { challengeId: retried.challengeId, code: messages[0]!.code });
    expect(verified).not.toHaveProperty("sessionToken");
    expect(verified.registrationExpiresAt).toBe(initial.registrationExpiresAt);
    expect(await api.current(verified.registrationToken)).toEqual({ next: "complete-profile", verified: true });
    const after = await fixture.admin.user.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.emailVerifiedAt).not.toBeNull(); expect(after.status).toBe("PENDING_APPROVAL");
  });

  it("commits five failed code attempts and single-use verification permits only one concurrent winner", async () => {
    const { api, messages } = service();
    const input = credentials();
    const started = await startOwned(api, input);
    const wrong = messages[0]!.code === "000000" ? "000001" : "000000";
    for (let attempt = 1; attempt <= 5; attempt++) {
      await expect(api.verifyEmail(started.registrationToken, { challengeId: started.challengeId, code: wrong }))
        .rejects.toMatchObject({ code: attempt === 5 ? "VERIFICATION_LIMITED" : "INVALID_VERIFICATION_CODE" });
    }
    expect((await fixture.admin.emailVerificationChallenge.findUniqueOrThrow({ where: { id: started.challengeId } })).attempts).toBe(5);
    const second = await startOwned(api, credentials());
    const code = messages.at(-1)!.code;
    const results = await Promise.allSettled([1, 2].map(() => api.verifyEmail(second.registrationToken, { challengeId: second.challengeId, code })));
    expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(row => row.status === "rejected")).toHaveLength(1);
  });

  it("separates resend cooldown from expiry, rotates proof/code and enforces account issue quota", async () => {
    const { api, messages } = service();
    const input = credentials();
    const started = await startOwned(api, input);
    const operationId = randomUUID(); fixture.ownRegistrationOperation(operationId);
    await expect(api.resendCode(started.registrationToken, { operationId, challengeId: started.challengeId }))
      .rejects.toMatchObject({ code: "VERIFICATION_LIMITED" });
    const user = await fixture.admin.user.findUniqueOrThrow({ where: { email: input.email }, include: { registration: true } });
    const appId = user.registration!.id;
    await openCooldown(appId);
    const resent = await api.resendCode(started.registrationToken, { operationId, challengeId: started.challengeId });
    expect(resent.challengeId).not.toBe(started.challengeId);
    expect(resent.registrationExpiresAt).toBe(started.registrationExpiresAt);
    expect(messages).toHaveLength(2);
    await expect(api.current(started.registrationToken)).rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
    await expect(api.verifyEmail(resent.registrationToken, { challengeId: started.challengeId, code: messages[0]!.code }))
      .rejects.toMatchObject({ code: "INVALID_VERIFICATION_CODE" });
    await openCooldown(appId);
    for (let version = 3; version <= 5; version++) await fixture.admin.emailDelivery.create({ data: {
      applicationId: appId, operationId: randomUUID(), kind: "OTP", eventVersion: version,
      idempotencyKey: `synthetic-quota/${randomUUID()}`,
    } });
    const nextOperation = randomUUID(); fixture.ownRegistrationOperation(nextOperation);
    await expect(api.resendCode(resent.registrationToken, { operationId: nextOperation, challengeId: resent.challengeId }))
      .rejects.toMatchObject({ code: "VERIFICATION_LIMITED" });
    expect(messages).toHaveLength(2);
  });

  it("gives duplicate flows durable non-authorizing progress/cooldown/errors without changing the existing account", async () => {
    const { api, messages } = service();
    const before = await fixture.admin.user.findUniqueOrThrow({ where: { id: fixture.alice.id } });
    const input = { ...credentials(), email: before.email };
    const duplicate = await startOwned(api, input);
    expect(messages).toHaveLength(0);
    expect(duplicate.delivery).toBe("unconfirmed");
    expect(await api.current(duplicate.registrationToken)).toEqual({ next: "verify-email", verified: false });
    await expect(api.verifyEmail(duplicate.registrationToken, { challengeId: duplicate.challengeId, code: "012345" }))
      .rejects.toMatchObject({ code: "INVALID_VERIFICATION_CODE" });
    const operationId = randomUUID(); fixture.ownRegistrationOperation(operationId);
    await expect(api.resendCode(duplicate.registrationToken, { operationId, challengeId: duplicate.challengeId }))
      .rejects.toMatchObject({ code: "VERIFICATION_LIMITED" });
    await fixture.admin.registrationDecoyFlow.update({ where: { tokenHash: registrationCapabilityHash(duplicate.registrationToken) },
      data: { resendAfter: new Date(Date.now() - 1_000) } });
    const resent = await api.resendCode(duplicate.registrationToken, { operationId, challengeId: duplicate.challengeId });
    const recovered = await startOwned(api, input);
    expect(recovered.registrationExpiresAt).toBe(duplicate.registrationExpiresAt);
    expect(recovered.challengeId).toBe(resent.challengeId);
    expect(await api.current(recovered.registrationToken)).toEqual({ next: "verify-email", verified: false });
    await expect(fixture.runtime.registrationDecoyFlow.findMany()).rejects.toThrow();
    expect((await fixture.admin.user.findUniqueOrThrow({ where: { id: before.id } })).passwordHash).toBe(before.passwordHash);
    await expect(withRegistration(duplicate.registrationToken, true, async () => true, fixture.runtime))
      .rejects.toMatchObject({ code: "REGISTRATION_EXPIRED" });
  });

  it("records provider failure without a false sent response or an account-existence signal", async () => {
    const { api } = service(true);
    const input = credentials();
    const started = await startOwned(api, input);
    expect(started.delivery).toBe("unconfirmed");
    const user = await fixture.admin.user.findUniqueOrThrow({ where: { email: input.email }, include: { registration: true } });
    const delivery = await fixture.admin.emailDelivery.findFirstOrThrow({ where: { applicationId: user.registration!.id } });
    expect(delivery.state).toBe("FAILED"); expect(delivery.acceptedAt).toBeNull();
    expect(delivery.reasonCode).toBe("PROVIDER_UNAVAILABLE");
    expect(await api.current(started.registrationToken)).toEqual({ next: "verify-email", verified: false });
  });

  it("binds HMAC to account/application/challenge and rejects missing key configuration", () => {
    expect(() => createOtpTools("short")).toThrow("configured privately");
    const tools = createOtpTools("d".repeat(64));
    const challenge = randomUUID();
    const a = tools.digest(fixture.alice.id, fixture.aliceApplication, challenge, "012345");
    expect(a).not.toBe(tools.digest(fixture.bob.id, fixture.aliceApplication, challenge, "012345"));
    expect(a).not.toBe(tools.digest(fixture.alice.id, fixture.bobApplication, challenge, "012345"));
    expect(a).not.toBe(tools.digest(fixture.alice.id, fixture.aliceApplication, randomUUID(), "012345"));
  });
});
