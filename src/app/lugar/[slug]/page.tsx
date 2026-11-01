import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { BackToResults } from "@/components/last-search";
import { LoadError } from "@/components/load-error";
import { placeFacts } from "@/components/place-facts";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { getPlace } from "@/modules/places/service";

/** One query per request, shared by the metadata and the page. */
const loadPlace = cache((slug: string) =>
  withDeadline(getPlace(slug), PAGE_DATA_DEADLINE_MS, "el sitio"),
);

export async function generateMetadata({ params }: PageProps<"/lugar/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  let place;
  try {
    place = await loadPlace(slug);
  } catch {
    // The page shows the error and "Reintentar"; the title can stay generic.
    return {};
  }
  if (!place) notFound();
  return {
    title: `${place.name}, ${place.municipality.name}`,
    description: place.description ?? undefined,
  };
}

/** HU-59 (RF-10): what the site is and what can be done there. */
async function PlaceContent({ params }: { params: PageProps<"/lugar/[slug]">["params"] }) {
  await connection();
  const { slug } = await params;
  const place = await loadPlace(slug);
  // Unknown or hidden (HU-69).
  if (!place) notFound();

  const facts = placeFacts(place);

  return (
    <article className="space-y-6">
      <BackToResults municipality={place.municipality} />

      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{place.name}</h1>
        <p className="text-lg text-muted">
          {place.placeType.name} · {place.municipality.name}
        </p>
      </header>

      <section aria-labelledby="descripcion" className="max-w-prose space-y-3">
        <h2 id="descripcion" className="sr-only">
          Descripción
        </h2>
        {place.description ? <p>{place.description}</p> : null}
        {/* CC0 text from Wikidata (HU-27): shown as Wikidata's, never as the site's own. */}
        {place.wikidataDescription ? (
          <p className="text-sm text-muted">Según Wikidata: «{place.wikidataDescription}».</p>
        ) : null}
        {place.wikipediaUrl ? (
          <p>
            <a
              href={place.wikipediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
            >
              Leer más en Wikipedia
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </p>
        ) : null}
      </section>

      {place.activities.length > 0 || facts.length > 0 ? (
        <section
          aria-labelledby="datos"
          className="rounded-xl border border-border bg-surface p-4 sm:p-6"
        >
          <h2 id="datos" className="mb-3 text-lg font-semibold">
            Qué hacer y qué saber
          </h2>
          <dl className="space-y-3">
            {place.activities.length > 0 ? (
              <div>
                <dt className="text-sm text-muted">Actividades</dt>
                <dd>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {place.activities.map((activity) => (
                      <li
                        key={activity.slug}
                        className="rounded-full border border-border px-3 py-1 text-sm"
                      >
                        {activity.name}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-sm text-muted">{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
    </article>
  );
}

/** Placeholders shaped like the page while the site loads. */
function PlaceSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando el sitio…
      </p>
      <div aria-hidden="true" className="space-y-6">
        <div className="h-11 w-48 animate-pulse rounded-md bg-surface" />
        <div className="space-y-2">
          <div className="h-8 w-3/4 animate-pulse rounded bg-surface" />
          <div className="h-6 w-1/2 animate-pulse rounded bg-surface" />
        </div>
        <div className="h-16 max-w-prose animate-pulse rounded bg-surface" />
        <div className="h-32 animate-pulse rounded-xl bg-surface" />
      </div>
    </>
  );
}

/** The page of one site (RF-09); the following stories of épica 6 add its other sections. */
export default function PlacePage({ params }: PageProps<"/lugar/[slug]">) {
  return (
    <LoadError what="el sitio">
      <Suspense fallback={<PlaceSkeleton />}>
        <PlaceContent params={params} />
      </Suspense>
    </LoadError>
  );
}
