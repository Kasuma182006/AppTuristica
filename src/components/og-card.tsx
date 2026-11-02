import { ImageResponse } from "next/og";
import { isWaterType, placeTypeIcon } from "./place-type-image";

/** Open Graph images are 1200×630 (HU-71). */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// The light theme of globals.css: shared links show on light and dark backgrounds alike.
const COLORS = {
  bg: "#f7f5ef",
  fg: "#1c2321",
  muted: "#5b6661",
  border: "#ddd8cc",
  land: "#1f6f4a",
  landTint: "#e1ebe3",
  water: "#1e6e8c",
  waterTint: "#dfebee",
};

/** Data in the shared image changes at most weekly (ingest); the CDN keeps it a day. */
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/**
 * The image of a page in shared links and search results (HU-71): the place type's drawing, a
 * title and a line under it, with the site's name. No photos: only 2 sites have one, and their
 * license would have to be written on the image.
 */
export function ogCard({
  title,
  subtitle,
  typeSlug,
}: {
  title: string;
  subtitle: string;
  typeSlug: string;
}): ImageResponse {
  const water = isWaterType(typeSlug);
  const titleSize = title.length > 60 ? 56 : title.length > 32 ? 68 : 84;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 64,
        padding: "72px 80px",
        background: COLORS.bg,
        color: COLORS.fg,
      }}
    >
      <div
        style={{
          width: 300,
          height: 300,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 48,
          background: water ? COLORS.waterTint : COLORS.landTint,
        }}
      >
        <svg
          width="200"
          height="200"
          viewBox="0 0 24 24"
          fill="none"
          stroke={water ? COLORS.water : COLORS.land}
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {placeTypeIcon(typeSlug)}
        </svg>
      </div>
      {/* 1200 - 2 × 80 padding - 300 drawing - 64 gap: without a width the text overflows. */}
      <div style={{ display: "flex", flexDirection: "column", width: 676, height: "100%" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexGrow: 1,
            gap: 24,
          }}
        >
          <div
            style={{
              display: "block",
              fontSize: titleSize,
              lineHeight: 1.1,
              letterSpacing: -1,
              lineClamp: 3,
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 36, color: COLORS.muted }}>{subtitle}</div>
        </div>
        <div
          style={{
            display: "flex",
            paddingTop: 24,
            borderTop: `2px solid ${COLORS.border}`,
            fontSize: 30,
            color: COLORS.land,
          }}
        >
          Buscador turístico · Valle del Cauca
        </div>
      </div>
    </div>,
    { ...OG_SIZE, headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
