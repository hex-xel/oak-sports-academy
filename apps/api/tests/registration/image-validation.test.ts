import { createHash } from "node:crypto";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { IMAGE_LIMITS, ImageValidationError, validateRegistrationImage } from "../../src/modules/documents/image-validation.js";
import { imageValidationFixtures, type ImageDemoCase } from "../../scripts/helpers/image-validation-fixtures.js";

describe("production magic-byte/MIME image screening with the real decoder", () => {
  let cases: ImageDemoCase[];
  beforeAll(async () => { cases = await imageValidationFixtures(); });

  it("accepts genuine JPEG/PNG and rejects the table of spoofed, truncated, small and oversized payloads", async () => {
    for (const fixture of cases) {
      if (fixture.accepted) {
        const result = await validateRegistrationImage(fixture.input);
        expect(result.width, fixture.name).toBe(400);
        expect(result.height, fixture.name).toBe(400);
        expect(result.byteSize).toBe(fixture.input.bytes.length);
        expect(result.checksum).toBe(createHash("sha256").update(fixture.input.bytes).digest("hex"));
      } else {
        await expect(validateRegistrationImage(fixture.input), fixture.name)
          .rejects.toBeInstanceOf(ImageValidationError);
      }
    }
  });

  it("discards supplied paths, produces independent random names and owns a stable byte snapshot", async () => {
    const source = cases[0]!.input;
    const bytes = Buffer.from(source.bytes);
    const pending = validateRegistrationImage({ ...source, bytes, fileName: "../../private/person.PNG" });
    bytes.fill(0);
    const result = await pending;
    const second = await validateRegistrationImage(source);
    expect(result.bytes).toEqual(source.bytes);
    expect(result.bytes).not.toBe(source.bytes);
    expect(result.objectName).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.png$/);
    expect(result.objectName).not.toBe(second.objectName);
  });

  it("accepts matching declared length and rejects invalid declarations without codec diagnostics", async () => {
    const source = cases[0]!.input;
    await expect(validateRegistrationImage({ ...source, declaredByteSize: source.bytes.length })).resolves.toHaveProperty("mimeType", "image/png");
    for (const declaredByteSize of [-1, NaN, Infinity, 1.5]) {
      await expect(validateRegistrationImage({ ...source, declaredByteSize }))
        .rejects.toMatchObject({ code: "UPLOAD_INVALID", reason: "DECLARED_SIZE" });
    }
    await expect(validateRegistrationImage(cases.find(item => item.name === "Forged PNG signature only")!.input))
      .rejects.toMatchObject({ code: "UPLOAD_INVALID", reason: "DECODE", message: "Choose a valid JPEG or PNG image that meets the upload requirements." });
  });

  it("bounds decoded geometry even when the compressed file is within the byte limit", async () => {
    for (const [width, height] of [[IMAGE_LIMITS.maxDimension + 1, 400], [5000, 4000]] as const) {
      const bytes = await sharp({ create: { width, height, channels: 3, background: "#218463" } }).png().toBuffer();
      expect(bytes.length).toBeGreaterThanOrEqual(IMAGE_LIMITS.minBytes);
      expect(bytes.length).toBeLessThan(IMAGE_LIMITS.maxBytes);
      await expect(validateRegistrationImage({ bytes, fileName: "synthetic.png", mimeType: "image/png" }))
        .rejects.toBeInstanceOf(ImageValidationError);
    }
  });
});
