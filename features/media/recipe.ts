import type { FocalPoint, NormalizedCrop, RenditionDefinition } from "./types";

export const PRODUCT_RECIPE_VERSION = 1;
export const MAX_INPUT_PIXELS = 80_000_000;

export const PRODUCT_RENDITIONS: readonly RenditionDefinition[] = [
  { role: "placeholder", format: "webp", width: 32, height: 32, quality: 35 },
  { role: "thumbnail", format: "webp", width: 320, height: 320, quality: 76 },
  {
    role: "catalog_square",
    format: "webp",
    width: 800,
    height: 800,
    quality: 82,
  },
  { role: "card_4x5", format: "webp", width: 960, height: 1200, quality: 84 },
  { role: "card_4x5", format: "avif", width: 960, height: 1200, quality: 58 },
  {
    role: "gallery_3x4",
    format: "webp",
    width: 1200,
    height: 1600,
    quality: 86,
  },
  {
    role: "gallery_3x4",
    format: "avif",
    width: 1200,
    height: 1600,
    quality: 60,
  },
  {
    role: "editorial_16x9",
    format: "webp",
    width: 1600,
    height: 900,
    quality: 84,
  },
  { role: "og", format: "jpeg", width: 1200, height: 630, quality: 86 },
] as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function normalizeFocalPoint(point: FocalPoint): FocalPoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError("Focal point must contain finite values.");
  }
  return { x: clamp(point.x, 0, 1), y: clamp(point.y, 0, 1) };
}

export function calculateNormalizedCrop({
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  focalPoint,
}: {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  focalPoint: FocalPoint;
}): NormalizedCrop {
  if (
    ![sourceWidth, sourceHeight, targetWidth, targetHeight].every(
      (value) => Number.isSafeInteger(value) && value > 0,
    )
  ) {
    throw new RangeError("Crop dimensions must be positive integers.");
  }
  const focal = normalizeFocalPoint(focalPoint);
  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;
  if (sourceAspect > targetAspect) {
    const width = targetAspect / sourceAspect;
    return {
      x: clamp(focal.x - width / 2, 0, 1 - width),
      y: 0,
      width,
      height: 1,
    };
  }
  const height = sourceAspect / targetAspect;
  return {
    x: 0,
    y: clamp(focal.y - height / 2, 0, 1 - height),
    width: 1,
    height,
  };
}

export function cropToPixels(
  crop: NormalizedCrop,
  sourceWidth: number,
  sourceHeight: number,
) {
  const left = Math.round(crop.x * sourceWidth);
  const top = Math.round(crop.y * sourceHeight);
  const width = Math.min(
    sourceWidth - left,
    Math.round(crop.width * sourceWidth),
  );
  const height = Math.min(
    sourceHeight - top,
    Math.round(crop.height * sourceHeight),
  );
  return { left, top, width, height };
}
