"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { PlacePhoto } from "@/modules/places/types";
import { slideAt } from "./carousel";
import { commonsThumbUrl, displayAuthor } from "./commons-photo";
import { PlaceTypeImage } from "./place-type-image";

interface Props {
  photos: PlacePhoto[];
  placeName: string;
  /** Shown instead of a photo Commons does not serve (e.g. rate limited). */
  placeTypeSlug: string;
}

const linkClass = "underline underline-offset-2 hover:text-fg";

/**
 * Author and license under each photo, as Commons licenses ask (RF-11). Fragile sites have no
 * link to the file's page: it would reveal where the photo was taken.
 */
function PhotoCaption({ photo }: { photo: PlacePhoto }) {
  return (
    <figcaption className="pt-2 text-sm text-muted">
      Foto: {displayAuthor(photo.author)} ·{" "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
      {photo.sourceUrl ? (
        <>
          {" · "}
          <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Ver en Commons
          </a>
        </>
      ) : null}
    </figcaption>
  );
}

const arrowClass =
  "absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-bg/80 text-2xl leading-none text-fg shadow disabled:hidden";

/**
 * HU-60: the site's photos, one at a time. Swipe or use the arrows; only the photo in view and
 * the next one are downloaded, since Commons refuses many downloads in a row (HTTP 429).
 */
export function PhotoGallery({ photos, placeName, placeTypeSlug }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const [current, setCurrent] = useState(0);
  // Photos stay once downloaded; the next one is ready before the visitor swipes to it.
  const [reached, setReached] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set());
  const count = photos.length;

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const index = slideAt(el.scrollLeft, el.clientWidth, count);
    setCurrent(index);
    setReached((before) => Math.max(before, index));
  };

  const go = (index: number) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: index * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section aria-label="Fotos" aria-roledescription="carrusel" className="max-w-3xl">
      <div className="relative">
        <ul
          ref={track}
          onScroll={onScroll}
          // Focusable so the arrow keys scroll it too.
          tabIndex={0}
          aria-label={`Fotos de ${placeName}`}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {photos.map((photo, index) => (
            <li
              key={photo.url}
              aria-roledescription="foto"
              aria-label={`${index + 1} de ${count}`}
              className="w-full shrink-0 snap-center"
            >
              <figure>
                <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-black">
                  {failed.has(index) ? (
                    <PlaceTypeImage slug={placeTypeSlug} className="size-full" />
                  ) : index <= reached + 1 ? (
                    <Image
                      src={photo.url}
                      loader={({ width }) => commonsThumbUrl(photo.url, width, photo.width, 960)}
                      alt={`Foto ${index + 1} de ${count} de ${placeName}`}
                      fill
                      sizes="(min-width: 800px) 768px, 100vw"
                      preload={index === 0}
                      loading={index === 0 ? undefined : "eager"}
                      onError={() => setFailed((before) => new Set(before).add(index))}
                      // Whole photo: many are portrait and would lose most of it when cropped.
                      className="object-contain"
                    />
                  ) : null}
                </div>
                <PhotoCaption photo={photo} />
              </figure>
            </li>
          ))}
        </ul>
        {count > 1 ? (
          // Over the photo, not its caption.
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[16/9] [&>button]:pointer-events-auto">
            <button
              type="button"
              onClick={() => go(current - 1)}
              disabled={current === 0}
              aria-label="Foto anterior"
              className={`${arrowClass} left-2`}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={() => go(current + 1)}
              disabled={current === count - 1}
              aria-label="Foto siguiente"
              className={`${arrowClass} right-2`}
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        ) : null}
      </div>
      {count > 1 ? (
        <p aria-live="polite" className="text-right text-sm text-muted">
          {current + 1} de {count}
        </p>
      ) : null}
    </section>
  );
}
