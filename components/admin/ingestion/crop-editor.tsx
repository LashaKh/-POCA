"use client";

import { useState } from "react";

export function CropEditor({
  previewUrl,
  alt,
  labels,
}: {
  previewUrl: string;
  alt: string;
  labels: { focalX: string; focalY: string; preview: string };
}) {
  const [x, setX] = useState(0.5);
  const [y, setY] = useState(0.5);
  return (
    <div className="crop-editor">
      {/* The preview is an already processed private rendition, never the public original. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewUrl}
        alt={alt}
        width={800}
        height={1000}
        loading="lazy"
        decoding="async"
        style={{ objectPosition: `${x * 100}% ${y * 100}%` }}
      />
      <div className="crop-controls">
        <label>
          <span>{labels.focalX}</span>
          <input
            name="focalX"
            aria-label={labels.focalX}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={x}
            onChange={(event) => setX(event.currentTarget.valueAsNumber)}
          />
          <output>{Math.round(x * 100)}%</output>
        </label>
        <label>
          <span>{labels.focalY}</span>
          <input
            name="focalY"
            aria-label={labels.focalY}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={y}
            onChange={(event) => setY(event.currentTarget.valueAsNumber)}
          />
          <output>{Math.round(y * 100)}%</output>
        </label>
      </div>
      <span className="visually-hidden">{labels.preview}</span>
    </div>
  );
}
