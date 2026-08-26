"use client";

import Image from "next/image";
import { useState } from "react";

import { MediaFallback } from "@/components/ui";

export function ResponsiveProductImage({
  src,
  alt,
  width = 800,
  height = 1000,
  sizes = "(max-width: 48rem) 100vw, 33vw",
  fallbackLabel,
  priority = false,
}: {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  fallbackLabel?: string;
  priority?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  if (!src || failedSrc === src)
    return (
      <MediaFallback label={fallbackLabel ?? `${alt} image unavailable`} />
    );

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      quality={85}
      onError={() => setFailedSrc(src)}
    />
  );
}
