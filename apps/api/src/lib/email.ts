import { ApiError } from "../middleware/error-handler.js";
import type { RegistrationOtpMessage } from "../modules/registration/registration.service.js";

const endpoint = "https://api.resend.com/emails";
const maxResponseBytes = 16_384;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const email = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Private adapter settings; fetch/deadline injection is for controlled provider-failure tests. */
export type RegistrationEmailOptions = Readonly<{
  apiKey: string;
  from: string;
  testRecipient?: string | undefined;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}>;

async function providerId(response: Response): Promise<string> {
  if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("application/json") || !response.body) {
    await response.body?.cancel();
    throw new ApiError("DELIVERY_UNAVAILABLE");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let content = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maxResponseBytes) {
        await reader.cancel();
        throw new ApiError("DELIVERY_UNAVAILABLE");
      }
      content += decoder.decode(part.value, { stream: true });
    }
    content += decoder.decode();
    const result: unknown = JSON.parse(content);
    if (!result || typeof result !== "object" || !("id" in result) ||
      typeof result.id !== "string" || !uuid.test(result.id)) throw new ApiError("DELIVERY_UNAVAILABLE");
    return result.id;
  } finally { reader.releaseLock(); }
}

/**
 * Construct one bounded plain-text transactional OTP sender using the Resend HTTP API.
 * @param options Validated private sender/key settings and optional test transport/deadline.
 * @returns Sender returning provider receipt ID only after a valid successful response.
 * @throws Safe configuration error at construction; ApiError/DELIVERY_UNAVAILABLE on send failure.
 * @remarks Fixed HTTPS endpoint, no redirects/credentials, no automatic retries/logging/queue.
 * Deadline covers fetch plus body consumption; actual response bytes are bounded. The
 * test recipient is an allowlist, never a destination rewrite that could verify another mailbox.
 * Sources: Resend send-email and idempotency docs (24-hour key retention); see registration guide.
 */
export function createRegistrationEmailSender(options: RegistrationEmailOptions) {
  const { apiKey, from, testRecipient } = options;
  const timeoutMs = options.timeoutMs ?? 3_000;
  const sender = /^Oak Sports Academy <([^<>]+)>$/.exec(from)?.[1];
  if (!/^re_[A-Za-z0-9_-]{7,253}$/.test(apiKey) || !sender || !email.test(sender) ||
    sender.length > 254 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 4_000 ||
    (testRecipient !== undefined && (!email.test(testRecipient) || testRecipient.length > 254)) ||
    (sender.endsWith("@resend.dev") && (sender !== "onboarding@resend.dev" || !testRecipient))) {
    throw new Error("Registration email configuration is invalid.");
  }
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof fetcher !== "function") throw new Error("Registration email transport is unavailable.");
  return async function sendRegistrationOtp(message: RegistrationOtpMessage): Promise<Readonly<{ providerId: string }>> {
    if (typeof message.to !== "string" || !email.test(message.to) || message.to.length > 254 ||
      typeof message.code !== "string" || !/^[0-9]{6}$/.test(message.code) ||
      typeof message.challengeId !== "string" || !uuid.test(message.challengeId) ||
      message.idempotencyKey !== `registration-otp/${message.challengeId}` ||
      (testRecipient !== undefined && message.to.toLowerCase() !== testRecipient.toLowerCase())) {
      throw new ApiError("DELIVERY_UNAVAILABLE");
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const request = (async () => {
        const response = await fetcher(endpoint, {
          method: "POST", redirect: "error", credentials: "omit", signal: controller.signal,
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json",
            "Idempotency-Key": message.idempotencyKey },
          body: JSON.stringify({ from: from, to: [message.to],
            subject: "Your Oak Sports Academy verification code",
            text: `Oak Sports Academy\n\nYour verification code is: ${message.code}\n\n` +
              "This code expires 10 minutes after it was requested. If you requested a newer code, use the newest one.\n\n" +
              "Do not share this code. If you did not request registration, you can ignore this email.",
          }),
        });
        return { providerId: await providerId(response) };
      })();
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new ApiError("DELIVERY_UNAVAILABLE"));
        }, timeoutMs);
      });
      return await Promise.race([request, deadline]);
    } catch {
      controller.abort();
      throw new ApiError("DELIVERY_UNAVAILABLE");
    } finally { if (timer !== undefined) clearTimeout(timer); }
  };
}
