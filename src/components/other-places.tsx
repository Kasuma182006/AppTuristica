import Link from "next/link";
import { connection } from "next/server";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { municipalityPath, placePath } from "@/lib/routes";
import { getOtherPlaces } from "@/modules/places/service";
import type { PlaceDetail } from "@/modules/places/types";
import { PlaceTypeImage } from "./place-type-image";

const numberFormat = new Intl.NumberFormat("es-CO");

/**
 * HU-67 (RF-17): up to 6 other sites of the municipality, as compact cards, and a link to all
 * of them. No section when the site is the only one.
 */
export async function OtherPlaces({
  place,
}: {
  place: Pick<PlaceDetail, "slug" | "municipality">;
}) {
  await connection();
  const { total, places } = await withDeadline(
    getOtherPlaces(place),
    PAGE_DATA_DEADLINE_MS,
    "otros sitios",
  );
  if (places.length === 0) return null;

  const { municipality } = place;
  return (
    <section aria-labelledby="otros-sitios" className="max-w-3xl space-y-3">
      <h2 id="otros-sitios" className="text-lg font-semibold">
        Otros sitios en {municipality.name}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {places.map((other) => (
          <li key={other.slug}>
            <Link
              href={placePath(other.slug)}
              prefetch={false}
              className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-surface p-2 pr-4 hover:border-primary"
            >
              <PlaceTypeImage
                slug={other.placeType.slug}
                className="size-12 shrink-0 rounded-lg [&>svg]:size-8"
              />
              <span className="min-w-0">
                <span className="block font-medium">{other.name}</span>
                <span className="block text-sm text-muted">{other.placeType.name}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p>
        <Link
          href={municipalityPath(municipality.slug)}
          prefetch={false}
          className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
        >
          Ver los {numberFormat.format(total)} sitios de {municipality.name}
        </Link>
      </p>
    </section>
  );
}
