const storagePathPattern = /^[a-f0-9-]+\/[a-f0-9-]+\/original$/;

export function isSafeOriginalStoragePath(path: string) {
  return (
    storagePathPattern.test(path) && !path.includes("..") && path.length <= 500
  );
}

export function renditionStoragePath({
  assetId,
  recipeVersion,
  role,
  width,
  format,
}: {
  assetId: string;
  recipeVersion: number;
  role: string;
  width: number;
  format: "jpeg" | "webp" | "avif";
}) {
  if (!/^[a-f0-9-]{36}$/.test(assetId) || !/^[a-z0-9_]+$/.test(role)) {
    throw new RangeError("Invalid rendition storage identity.");
  }
  if (
    !Number.isSafeInteger(recipeVersion) ||
    recipeVersion < 1 ||
    !Number.isSafeInteger(width) ||
    width < 16
  ) {
    throw new RangeError("Invalid rendition recipe values.");
  }
  return `${assetId}/v${recipeVersion}/${role}-${width}.${format}`;
}
