export type RenditionRole =
  | "catalog_square"
  | "card_4x5"
  | "gallery_3x4"
  | "editorial_16x9"
  | "og"
  | "thumbnail"
  | "placeholder";

export type RenditionFormat = "jpeg" | "webp" | "avif";

export type FocalPoint = { x: number; y: number };
export type NormalizedCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RenditionDefinition = {
  role: RenditionRole;
  format: RenditionFormat;
  width: number;
  height: number;
  quality: number;
};

export type ProcessedRendition = RenditionDefinition & {
  buffer: Buffer;
  checksumSha256: string;
  byteSize: number;
  crop: NormalizedCrop;
  focalPoint: FocalPoint;
};

export type InspectedImage = {
  actualMime: "image/jpeg" | "image/png" | "image/webp" | "image/tiff";
  byteSize: number;
  checksumSha256: string;
  pixelWidth: number;
  pixelHeight: number;
  orientation: number;
};
