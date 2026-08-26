import "server-only";

import { createHash } from "node:crypto";
import sharp from "sharp";

import {
  INGESTION_FILE_MAX_BYTES,
  sniffImageMime,
} from "@/features/ingestion/schema";

import {
  calculateNormalizedCrop,
  cropToPixels,
  MAX_INPUT_PIXELS,
  PRODUCT_RENDITIONS,
} from "./recipe";
import type {
  FocalPoint,
  InspectedImage,
  ProcessedRendition,
  RenditionDefinition,
} from "./types";

function checksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function formatToMime(
  format: string | undefined,
): InspectedImage["actualMime"] | undefined {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  if (format === "tiff") return "image/tiff";
  return undefined;
}

export async function inspectImageBuffer(
  buffer: Buffer,
  expectedMime?: InspectedImage["actualMime"],
): Promise<InspectedImage> {
  if (buffer.byteLength < 1 || buffer.byteLength > INGESTION_FILE_MAX_BYTES) {
    throw new RangeError("IMAGE_SIZE_INVALID");
  }
  const magicMime = sniffImageMime(buffer.subarray(0, 16));
  if (!magicMime || (expectedMime && magicMime !== expectedMime)) {
    throw new TypeError("IMAGE_TYPE_MISMATCH");
  }
  const metadata = await sharp(buffer, {
    failOn: "warning",
    limitInputPixels: MAX_INPUT_PIXELS,
    sequentialRead: true,
  }).metadata();
  const actualMime = formatToMime(metadata.format);
  if (
    !actualMime ||
    actualMime !== magicMime ||
    !metadata.width ||
    !metadata.height
  ) {
    throw new TypeError("IMAGE_METADATA_INVALID");
  }
  if (
    (metadata.pages ?? 1) !== 1 ||
    metadata.width * metadata.height > MAX_INPUT_PIXELS
  ) {
    throw new RangeError("IMAGE_PIXEL_LIMIT");
  }
  return {
    actualMime,
    byteSize: buffer.byteLength,
    checksumSha256: checksum(buffer),
    pixelWidth: metadata.width,
    pixelHeight: metadata.height,
    orientation: metadata.orientation ?? 1,
  };
}

async function encodeRendition(
  input: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  definition: RenditionDefinition,
  focalPoint: FocalPoint,
): Promise<ProcessedRendition> {
  const crop = calculateNormalizedCrop({
    sourceWidth,
    sourceHeight,
    targetWidth: definition.width,
    targetHeight: definition.height,
    focalPoint,
  });
  const extraction = cropToPixels(crop, sourceWidth, sourceHeight);
  let pipeline = sharp(input, {
    failOn: "warning",
    limitInputPixels: MAX_INPUT_PIXELS,
    sequentialRead: true,
  })
    .rotate()
    .extract(extraction)
    .resize(definition.width, definition.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    });
  if (definition.format === "jpeg") {
    pipeline = pipeline.jpeg({ quality: definition.quality, mozjpeg: true });
  } else if (definition.format === "avif") {
    pipeline = pipeline.avif({ quality: definition.quality, effort: 5 });
  } else {
    pipeline = pipeline.webp({ quality: definition.quality, effort: 5 });
  }
  const output = await pipeline.toBuffer();
  return {
    ...definition,
    buffer: output,
    byteSize: output.byteLength,
    checksumSha256: checksum(output),
    crop,
    focalPoint,
  };
}

export async function processProductRenditions(
  input: Buffer,
  expectedMime: InspectedImage["actualMime"],
  focalPoint: FocalPoint = { x: 0.5, y: 0.5 },
) {
  const inspected = await inspectImageBuffer(input, expectedMime);
  const swapsAxes = [5, 6, 7, 8].includes(inspected.orientation);
  const orientedWidth = swapsAxes
    ? inspected.pixelHeight
    : inspected.pixelWidth;
  const orientedHeight = swapsAxes
    ? inspected.pixelWidth
    : inspected.pixelHeight;
  const renditions: ProcessedRendition[] = [];
  for (const definition of PRODUCT_RENDITIONS) {
    renditions.push(
      await encodeRendition(
        input,
        orientedWidth,
        orientedHeight,
        definition,
        focalPoint,
      ),
    );
  }
  return { inspected, renditions };
}
