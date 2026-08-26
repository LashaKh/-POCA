import { z } from "zod";

export const INGESTION_FILE_LIMIT = 250;
export const INGESTION_FILE_MAX_BYTES = 512 * 1024 * 1024;
export const INGESTION_BATCH_MAX_BYTES = 8 * 1024 * 1024 * 1024;

export const acceptedImageMimes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
] as const;

export const ingestionBatchSchema = z.object({
  locale: z.enum(["ka", "en", "de", "ru"]),
  title: z.string().trim().min(1).max(160),
  expectedFileCount: z.coerce.number().int().min(1).max(250).optional(),
  productId: z.uuid().optional(),
});

export const uploadAuthorizationSchema = z.object({
  batchId: z.uuid(),
  clientFileId: z.string().min(8).max(200),
  filename: z.string().trim().min(1).max(240),
  declaredMime: z.enum(acceptedImageMimes),
  byteSize: z.number().int().min(1).max(INGESTION_FILE_MAX_BYTES),
  checksumSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});

export const uploadCompletedSchema = z.object({
  fileId: z.uuid(),
});

export const retryIngestionFileSchema = z.object({
  fileId: z.uuid(),
  batchId: z.uuid(),
  locale: z.enum(["ka", "en", "de", "ru"]),
});

export const processedImageSchema = z.object({
  actualMime: z.enum(acceptedImageMimes),
  byteSize: z.number().int().min(1).max(INGESTION_FILE_MAX_BYTES),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
  pixelWidth: z.number().int().min(1).max(50_000),
  pixelHeight: z.number().int().min(1).max(50_000),
  orientation: z.number().int().min(1).max(8),
});

export type UploadAuthorizationInput = z.infer<
  typeof uploadAuthorizationSchema
>;

export function sniffImageMime(
  bytes: Uint8Array,
): (typeof acceptedImageMimes)[number] | undefined {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x2a &&
      bytes[3] === 0x00) ||
      (bytes[0] === 0x4d &&
        bytes[1] === 0x4d &&
        bytes[2] === 0x00 &&
        bytes[3] === 0x2a))
  ) {
    return "image/tiff";
  }
  return undefined;
}

export function validateBatchSelection(
  files: ReadonlyArray<{ size: number; type: string }>,
) {
  if (files.length === 0 || files.length > INGESTION_FILE_LIMIT) {
    return { ok: false as const, code: "FILE_COUNT_INVALID" };
  }
  if (
    files.some((file) => file.size < 1 || file.size > INGESTION_FILE_MAX_BYTES)
  ) {
    return { ok: false as const, code: "FILE_SIZE_INVALID" };
  }
  if (
    files.some(
      (file) =>
        !acceptedImageMimes.includes(
          file.type as (typeof acceptedImageMimes)[number],
        ),
    )
  ) {
    return { ok: false as const, code: "FILE_TYPE_INVALID" };
  }
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > INGESTION_BATCH_MAX_BYTES) {
    return { ok: false as const, code: "BATCH_SIZE_INVALID" };
  }
  return { ok: true as const, totalBytes: total };
}
