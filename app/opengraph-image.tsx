import { ImageResponse } from "next/og";

export const alt = "ÉPOCA — Collector’s Index";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "76px 84px",
        color: "#241e18",
        background: "#eee8dc",
        border: "18px solid #241e18",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 22,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        Collector’s Index · Tbilisi
      </div>
      <div style={{ display: "flex", fontSize: 118, lineHeight: 1 }}>ÉPOCA</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "2px solid #241e18",
          paddingTop: 22,
          fontSize: 25,
        }}
      >
        <span>Carpets, recorded with care.</span>
        <span>epoca</span>
      </div>
    </div>,
    size,
  );
}
