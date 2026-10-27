import Link from "next/link";
import type { PlaceSummary } from "@/modules/places/types";
import { CardPhoto } from "./card-photo";
import { displayAuthor } from "./commons-photo";
import { confidenceLevel } from "./confidence-level";
import { PlaceTypeImage } from "./place-type-image";

const imageClass = "aspect-[16/9] w-full";

/**
 * A search result (HU-52, RF-05): cover photo or the type's generic image, name, lugar, type,
 * activities and confidence. The whole card opens the site page.
 */
export function PlaceCard({ place }: { place: PlaceSummary }) {
  const { photo } = place;
  const confidence = confidenceLevel(place.confidence);

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface hover:border-primary has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-primary">
      <figure>
        {photo ? (
          <>
            <CardPhoto photo={photo} placeTypeSlug={place.placeType.slug} className={imageClass} />
            {/* Commons licenses ask for the author and the license next to the photo. */}
            <figcaption className="truncate px-4 pt-2 text-xs text-muted">
              Foto: {displayAuthor(photo.author)} · {photo.license}
            </figcaption>
          </>
        ) : (
          <PlaceTypeImage slug={place.placeType.slug} className={imageClass} />
        )}
      </figure>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 font-semibold">
          {/* Stretched over the card, so a click anywhere opens the site page. */}
          <Link
            href={`/lugar/${place.slug}`}
            prefetch={false}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {place.name}
          </Link>
        </h3>
        <p className="text-sm text-muted">
          {place.municipality.name} · {place.placeType.name}
        </p>
        {place.activities.length > 0 ? (
          <p className="text-sm">
            <span className="sr-only">Actividades: </span>
            {place.activities.map((activity) => activity.name).join(" · ")}
          </p>
        ) : null}
        <p className="mt-auto flex items-center gap-2 pt-2 text-sm text-muted">
          <span aria-hidden="true" className="flex gap-1">
            {[1, 2, 3].map((dot) => (
              <span
                key={dot}
                className={`size-2 rounded-full border border-primary ${
                  dot <= confidence.dots ? "bg-primary" : ""
                }`}
              />
            ))}
          </span>
          {confidence.label}
          <span className="sr-only"> (confianza {place.confidence} de 100)</span>
        </p>
      </div>
    </article>
  );
}
