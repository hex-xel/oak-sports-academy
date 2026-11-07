import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { ApiError } from "../../middleware/error-handler.js";

/** Owner-approved byte/minimum-resolution rules plus explicit decoder resource ceilings. */
export const IMAGE_LIMITS = Object.freeze({ minBytes: 5 * 1024, maxBytes: 5 * 1024 * 1024,
  minDimension: 400, maxDimension: 8192, maxPixels: 16_000_000, decodeSeconds: 5 });

/** Static diagnostic categories for tests/operator demos; never include file contents or names. */
export type ImageRejection = "FILE_SIZE" | "DECLARED_SIZE" | "SIGNATURE" | "MIME_OR_EXTENSION" |
  "DIMENSIONS" | "DECODE";

/** Safe upload error; HTTP handlers expose only inherited UPLOAD_INVALID copy. */
export class ImageValidationError extends ApiError {
  /** Static rejection reason for internal handling; no decoder error/cause is retained. */
  readonly reason: ImageRejection;
  /**
   * @param reason Static validation stage; never untrusted text.
   * @returns A safe upload rejection, with no input or decoder diagnostics.
   * @remarks No logging or other side effects.
   */
  constructor(reason: ImageRejection) { super("UPLOAD_INVALID"); this.reason = reason; }
}

/** Server-received bytes and untrusted upload declarations; no URL or filesystem path input. */
export type ImageInput = Readonly<{ bytes: Buffer; fileName: string; mimeType: string; declaredByteSize?: number }>;

/** Validated snapshot for a trusted private-storage caller; do not serialize bytes to clients. */
export type ValidatedImage = Readonly<{ bytes: Buffer; mimeType: "image/jpeg" | "image/png";
  byteSize: number; width: number; height: number; checksum: string; objectName: string }>;

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Validate an untrusted registration image before any private-storage write.
 * @param input Actual bounded bytes, filename/MIME declarations and optional declared size.
 * @returns An owned byte snapshot, canonical MIME/dimensions, SHA-256 and UUID filename.
 * @throws ImageValidationError for any size, signature, declaration, dimension or decode failure.
 * @remarks No file/network/database I/O, no authenticity/OCR/antivirus claim. The caller must
 * enforce request-body/concurrency limits before buffering. Signature checks cost O(1);
 * snapshot/hash cost O(n), pixel decoding O(p), and working memory is bounded O(n+p).
 * Do not mutate returned bytes before storage; checksum describes exactly that snapshot.
 */
export async function validateRegistrationImage(input: ImageInput): Promise<ValidatedImage> {
  if (!Buffer.isBuffer(input.bytes) || input.bytes.length < IMAGE_LIMITS.minBytes ||
    input.bytes.length > IMAGE_LIMITS.maxBytes) throw new ImageValidationError("FILE_SIZE");
  if (input.declaredByteSize !== undefined && (!Number.isSafeInteger(input.declaredByteSize) ||
    input.declaredByteSize !== input.bytes.length)) throw new ImageValidationError("DECLARED_SIZE");
  // Snapshot before the first await: asynchronous mutation must not change what is hashed/stored.
  const bytes = Buffer.from(input.bytes);
  const format = bytes.subarray(0, 8).equals(pngSignature) ? "png" :
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "jpeg" : undefined;
  if (!format) throw new ImageValidationError("SIGNATURE");
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  const extension = typeof input.fileName === "string" && input.fileName.length <= 255 &&
    !/[\x00-\x1f\x7f]/.test(input.fileName) ? /\.([a-z0-9]+)$/i.exec(input.fileName)?.[1]?.toLowerCase() : undefined;
  if (input.mimeType !== mimeType || !extension ||
    !(format === "png" ? extension === "png" : ["jpg", "jpeg"].includes(extension))) {
    throw new ImageValidationError("MIME_OR_EXTENSION");
  }
  // Sharp documents failOn:'warning' for untrusted input. Metadata alone does not decode pixels:
  // https://sharp.pixelplumbing.com/api-constructor/ and /api-input/#metadata
  let decoder: ReturnType<typeof sharp> | undefined;
  try {
    decoder = sharp(bytes, { failOn: "warning", limitInputPixels: IMAGE_LIMITS.maxPixels,
      limitInputChannels: 4, sequentialRead: true, unlimited: false }).timeout({ seconds: IMAGE_LIMITS.decodeSeconds });
    const metadata = await decoder.metadata();
    const { width, height } = metadata;
    if (metadata.format !== format || !width || !height || width < IMAGE_LIMITS.minDimension ||
      height < IMAGE_LIMITS.minDimension || width > IMAGE_LIMITS.maxDimension || height > IMAGE_LIMITS.maxDimension ||
      width * height > IMAGE_LIMITS.maxPixels || (metadata.pages ?? 1) !== 1) throw new ImageValidationError("DIMENSIONS");
    // Force complete pixel decoding at original resolution; resize/metadata-only checks can
    // miss damaged pixel data. At most 16M pixels × 4 channels; do not return decoded pixels.
    const decoded = await decoder.raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
    if (decoded.info.width !== width || decoded.info.height !== height || decoded.info.channels > 4 ||
      decoded.data.length !== width * height * decoded.info.channels) throw new ImageValidationError("DECODE");
    return Object.freeze({ bytes, mimeType, byteSize: bytes.length, width, height,
      checksum: createHash("sha256").update(bytes).digest("hex"), objectName: `${randomUUID()}.${format === "jpeg" ? "jpg" : "png"}` });
  } catch (error) {
    if (error instanceof ImageValidationError) throw error;
    // Never forward native codec diagnostics, which can contain untrusted metadata.
    throw new ImageValidationError("DECODE");
  } finally { decoder?.destroy(); }
}
