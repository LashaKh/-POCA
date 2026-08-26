import { describe, expect, it } from "vitest";

import {
  INGESTION_FILE_MAX_BYTES,
  sniffImageMime,
  validateBatchSelection,
} from "@/features/ingestion/schema";
import {
  isSafeOriginalStoragePath,
  renditionStoragePath,
} from "@/features/ingestion/storage-path";

describe("ingestion upload boundary", () => {
  it("accepts a practical image batch", () => {
    expect(
      validateBatchSelection([
        { size: 1_000_000, type: "image/jpeg" },
        { size: 2_000_000, type: "image/tiff" },
      ]),
    ).toEqual({ ok: true, totalBytes: 3_000_000 });
  });

  it("rejects unknown, oversized, empty, and excessive files", () => {
    expect(validateBatchSelection([])).toMatchObject({
      code: "FILE_COUNT_INVALID",
    });
    expect(
      validateBatchSelection([{ size: 1, type: "image/svg+xml" }]),
    ).toMatchObject({ code: "FILE_TYPE_INVALID" });
    expect(
      validateBatchSelection([
        { size: INGESTION_FILE_MAX_BYTES + 1, type: "image/jpeg" },
      ]),
    ).toMatchObject({ code: "FILE_SIZE_INVALID" });
    expect(
      validateBatchSelection(
        Array.from({ length: 251 }, () => ({ size: 1, type: "image/jpeg" })),
      ),
    ).toMatchObject({ code: "FILE_COUNT_INVALID" });
  });

  it("sniffs actual image signatures instead of trusting extensions", () => {
    expect(sniffImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe(
      "image/jpeg",
    );
    expect(
      sniffImageMime(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("image/png");
    expect(
      sniffImageMime(new TextEncoder().encode("not-an-image")),
    ).toBeUndefined();
  });

  it("allows only registered original paths and deterministic rendition paths", () => {
    const identity = "12345678-1234-4123-8123-123456789abc";
    expect(isSafeOriginalStoragePath(`${identity}/${identity}/original`)).toBe(
      true,
    );
    expect(isSafeOriginalStoragePath(`${identity}/../secret`)).toBe(false);
    expect(
      renditionStoragePath({
        assetId: identity,
        recipeVersion: 1,
        role: "card_4x5",
        width: 960,
        format: "webp",
      }),
    ).toBe(`${identity}/v1/card_4x5-960.webp`);
    expect(() =>
      renditionStoragePath({
        assetId: identity,
        recipeVersion: 1,
        role: "../bad",
        width: 960,
        format: "webp",
      }),
    ).toThrow();
  });
});
