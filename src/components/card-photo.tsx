"use client";

import Image from "next/image";
import { useState } from "react";
import type { PlacePhoto } from "@/modules/places/types";
import { commonsThumbUrl } from "./commons-photo";
import { PlaceTypeImage } from "./place-type-image";

interface Props {
  photo: PlacePhoto;
  /** Shown instead when Commons does not serve the photo (e.g. rate limited). */
  placeTypeSlug: string;
  className: string;
}

/** A card's cover photo, served by Commons as a thumbnail (no Vercel image quota). */
export function CardPhoto({ photo, placeTypeSlug, className }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return <PlaceTypeImage slug={placeTypeSlug} className={className} />;

  return (
    <div className={`relative ${className}`}>
      <Image
        src={photo.url}
        loader={({ width }) => commonsThumbUrl(photo.url, width, photo.width)}
        // The card's text names the site; the photo adds nothing a screen reader needs.
        alt=""
        fill
        sizes="(min-width: 640px) 330px, 100vw"
        onError={() => setFailed(true)}
        className="object-cover"
      />
    </div>
  );
}
