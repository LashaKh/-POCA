"use client";

import { useState } from "react";

import { ResponsiveProductImage } from "./responsive-product-image";

type GalleryImage = { id: string; alt: string; src: string | null };

export function ProductGallery({
  name,
  images,
  imageUnavailableLabel = "image unavailable",
  chooseImageLabel = "Choose image",
  galleryLabel = `${name} images`,
}: {
  name: string;
  images: GalleryImage[];
  imageUnavailableLabel?: string;
  chooseImageLabel?: string;
  galleryLabel?: string;
}) {
  const safeImages = images.length
    ? images
    : [{ id: "missing", alt: `${name}: ${imageUnavailableLabel}`, src: null }];
  const [selectedId, setSelectedId] = useState(safeImages[0]?.id);
  const selected =
    safeImages.find((image) => image.id === selectedId) ?? safeImages[0];

  return (
    <section className="product-gallery" aria-label={galleryLabel}>
      <div className="product-gallery-stage">
        <ResponsiveProductImage
          key={selected?.id}
          src={selected?.src ?? undefined}
          alt={selected?.alt ?? name}
          fallbackLabel={selected?.alt ?? `${name}: ${imageUnavailableLabel}`}
          width={1200}
          height={1500}
          sizes="(max-width: 768px) 100vw, 60vw"
          priority
        />
      </div>
      <div
        className="product-gallery-controls"
        role="group"
        aria-label={chooseImageLabel}
      >
        {safeImages.map((image, index) => (
          <button
            key={image.id}
            type="button"
            aria-label={image.alt || `Image ${index + 1}`}
            aria-current={image.id === selected?.id ? "true" : undefined}
            onClick={() => setSelectedId(image.id)}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </section>
  );
}
