import type { ReactNode } from "react";

/** Line drawings on a 24×24 grid, one per place type (db/seeds/place-types.ts). */
const ICONS: Record<string, ReactNode> = {
  cascada: (
    <>
      <path d="M3 5h10l1 3" />
      <path d="M7 5v11M10 5v13M13 8v8" />
      <path d="M3 20c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
    </>
  ),
  rio: (
    <>
      <path d="M3 7c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
      <path d="M3 12c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
      <path d="M3 17c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
    </>
  ),
  mirador: (
    <>
      <circle cx="7" cy="15" r="3.5" />
      <circle cx="17" cy="15" r="3.5" />
      <path d="M10.5 15h3M4.5 12.5 6.5 6h2.5l1 6M19.5 12.5 17.5 6H15l-1 6" />
    </>
  ),
  cerro: (
    <>
      <path d="M2 20 9 8l4 6 3-4 6 10Z" />
      <path d="m7.5 10.5 1.5 1.5 1.5-1.5" />
    </>
  ),
  sendero: (
    <>
      <path d="M7 21c0-4 10-3.5 10-8S7 9.5 9 3" strokeDasharray="2.5 2.5" />
      <path d="M17 3v6M17 3h4l-1 1.5 1 1.5h-4" />
    </>
  ),
  lago: (
    <>
      <ellipse cx="12" cy="14" rx="9.5" ry="5.5" />
      <path d="M7.5 13.5c1.5-1 3-1 4.5 0s3 1 4.5 0" />
      <path d="M5 8 8 4l2.5 3" />
    </>
  ),
  "reserva-natural": (
    <>
      <path d="M12 3 17 10h-2.5l4 6h-13l4-6H7Z" />
      <path d="M12 16v5" />
    </>
  ),
  balneario: (
    <>
      <path d="M8 3v12M14 3v12M8 6.5h6M8 10.5h6" />
      <path d="M3 19c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0" />
    </>
  ),
  playa: (
    <>
      <circle cx="17" cy="6.5" r="2.5" />
      <path d="M2 15c2.5-2 5-2 7.5 0s5 2 7.5 0 3.5-1.5 5 0" />
      <path d="M2 20h20" />
    </>
  ),
};

/** Types shown in blue (water) instead of green (land). */
const WATER_TYPES = new Set(["cascada", "rio", "lago", "balneario", "playa"]);

/**
 * The generic image of a place type, for sites without photos (RF-05, RF-11): the type's line
 * icon on a soft tint. Decorative: the type is always written next to it. Unknown types get the
 * mountain.
 */
export function PlaceTypeImage({ slug, className = "" }: { slug: string; className?: string }) {
  const tone = WATER_TYPES.has(slug)
    ? "bg-secondary/10 text-secondary"
    : "bg-primary/10 text-primary";
  return (
    <div className={`flex items-center justify-center ${tone} ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-16"
      >
        {ICONS[slug] ?? ICONS.cerro}
      </svg>
    </div>
  );
}
