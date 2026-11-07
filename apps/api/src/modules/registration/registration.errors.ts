import { ApiError } from "../../middleware/error-handler.js";

/** Safe quota error; HTTP uses bounded seconds, never provider-supplied text. */
export class RegistrationRetryError extends ApiError {
  /** Positive seconds until explicit retry; never an automatic replay instruction. */
  readonly retryAfterSeconds: number;
  /**
   * Construct static 429 feedback without environment/DB imports or I/O.
   * @param seconds Internal quota timing; clamped to 1–900 seconds.
   * @returns A safe VERIFICATION_LIMITED error with bounded retry metadata.
   * @throws No intentional errors for numeric timing input.
   */
  constructor(seconds: number) {
    super("VERIFICATION_LIMITED");
    this.retryAfterSeconds = Number.isFinite(seconds) ? Math.max(1, Math.min(900, Math.ceil(seconds))) : 60;
  }
}
