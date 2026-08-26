import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  inspectImageBuffer,
  processProductRenditions,
} from "@/features/media/processor";
import {
  calculateNormalizedCrop,
  PRODUCT_RENDITIONS,
} from "@/features/media/recipe";

describe("bounded deterministic image processing", () => {
  it("calculates focal crops without leaving source bounds", () => {
    expect(
      calculateNormalizedCrop({
        sourceWidth: 2000,
        sourceHeight: 1000,
        targetWidth: 4,
        targetHeight: 5,
        focalPoint: { x: 1, y: 0.5 },
      }),
    ).toEqual({ x: 0.6, y: 0, width: 0.4, height: 1 });
    const vertical = calculateNormalizedCrop({
      sourceWidth: 1000,
      sourceHeight: 2000,
      targetWidth: 1,
      targetHeight: 1,
      focalPoint: { x: 0.5, y: 0 },
    });
    expect(vertical).toEqual({ x: 0, y: 0, width: 1, height: 0.5 });
  });

  it("checks actual content and refuses mislabeled input", async () => {
    const jpeg = await sharp({
      create: { width: 100, height: 120, channels: 3, background: "#a17b55" },
    })
      .jpeg()
      .toBuffer();
    await expect(inspectImageBuffer(jpeg, "image/jpeg")).resolves.toMatchObject(
      { actualMime: "image/jpeg", pixelWidth: 100, pixelHeight: 120 },
    );
    await expect(inspectImageBuffer(jpeg, "image/png")).rejects.toThrow(
      "IMAGE_TYPE_MISMATCH",
    );
    await expect(
      inspectImageBuffer(Buffer.from("not an image")),
    ).rejects.toThrow("IMAGE_TYPE_MISMATCH");
  });

  it("strips metadata and generates exactly the versioned recipe", async () => {
    const source = await sharp({
      create: { width: 320, height: 400, channels: 3, background: "#355368" },
    })
      .withMetadata({ orientation: 1 })
      .jpeg({ quality: 90 })
      .toBuffer();
    const first = await processProductRenditions(source, "image/jpeg");
    const second = await processProductRenditions(source, "image/jpeg");
    expect(first.renditions).toHaveLength(PRODUCT_RENDITIONS.length);
    expect(first.renditions.map((item) => item.checksumSha256)).toEqual(
      second.renditions.map((item) => item.checksumSha256),
    );
    const outputMetadata = await sharp(first.renditions[0].buffer).metadata();
    expect(outputMetadata.exif).toBeUndefined();
    expect(outputMetadata.icc).toBeUndefined();
  }, 30_000);
});
