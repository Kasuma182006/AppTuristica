import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import { EXPLORE_PATH } from "@/components/filter-url";
import { RememberSearch } from "@/components/last-search";
import { LoadError } from "@/components/load-error";
import { placeCountLabel } from "@/components/municipality-search";
import { PaginationBar } from "@/components/pagination-bar";
import { PlaceCard } from "@/components/place-card";
import { ResultsSkeleton } from "@/components/results-skeleton";
import { ResultsLink, ResultsRegion, ResultsTransition } from "@/components/results-transition";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { municipalityPath } from "@/lib/routes";
import { toUrlSearchParams } from "@/lib/search-params";
import { getMunicipality } from "@/modules/catalogs/service";
import { parsePlaceQuery } from "@/modules/places/filters";
import { searchPlaces } from "@/modules/places/service";
import { PAGE_SIZE } from "@/modules/places/types";

/** One query per request, shared by the metadata and the page. */
const loadMunicipality = cache((slug: string) =>
  withDeadline(getMunicipality(slug), PAGE_DATA_DEADLINE_MS, "el municipio"),
);

export async function generateMetadata({ params }: PageProps<"/lugar/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  let municipality;
  try {
    municipality = await loadMunicipality(slug);
  } catch {
    // The page shows the error and "Reintentar"; the title can stay generic.
    return {};
  }
  if (!municipality) notFound();
  return { title: `Sitios turísticos en ${municipality.name}` };
}

const buttonClass = "inline-flex h-11 items-center justify-center rounded-md px-5 font-medium";

/** The page number in the address; only ?pagina counts here, other parameters are ignored. */
function pageOf(params: URLSearchParams): number | undefined {
  const pagina = params.get("pagina");
  const query = parsePlaceQuery(new URLSearchParams(pagina === null ? {} : { pagina }));
  return query.ok ? query.value.page : undefined;
}

/**
 * HU-70 (RF-09): every published site of a municipality, most complete first, 24 per page, with
 * a way to filter them in /explorar. Municipalities without sites keep their page and invite to
 * propose one.
 */
async function MunicipalityContent({
  params,
  searchParams,
}: Pick<PageProps<"/lugar/[slug]">, "params" | "searchParams">) {
  await connection();
  const { slug } = await params;
  const municipality = await loadMunicipality(slug);
  if (!municipality) notFound();

  const page = pageOf(toUrlSearchParams(await searchParams));
  const header = (count?: number) => (
    <header className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{municipality.name}</h1>
      <p className="text-lg text-muted">
        {municipality.department}
        {count === undefined ? null : ` · ${placeCountLabel(count)}`}
      </p>
    </header>
  );

  if (page === undefined) {
    return (
      <div className="space-y-4">
        {header()}
        <p role="alert" className="text-muted">
          El número de página no es válido.{" "}
          <Link href={municipalityPath(slug)} prefetch={false} className="text-primary underline">
            Ir a la primera página
          </Link>
        </p>
      </div>
    );
  }

  const result = await withDeadline(
    searchPlaces({
      filters: { municipality: slug, freeAccessOnly: false },
      sort: "confianza",
      page,
      pageSize: PAGE_SIZE.default,
    }),
    PAGE_DATA_DEADLINE_MS,
    "los sitios",
  );
  // The municipality exists, so its slug is a valid filter.
  if (!result.ok) throw new Error(result.message);
  const { total, items, totalPages } = result.value;

  if (total === 0) {
    return (
      <div className="space-y-4">
        {header(0)}
        <p className="max-w-prose">
          Aún no tenemos sitios en {municipality.name}. Si conoces uno poco conocido, propónlo para
          que otros lo descubran.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/proponer"
            prefetch={false}
            className={`${buttonClass} bg-primary text-on-primary`}
          >
            Proponer un sitio
          </Link>
          <Link
            href={EXPLORE_PATH}
            prefetch={false}
            className={`${buttonClass} border border-border hover:border-primary`}
          >
            Explorar otros municipios
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* The site pages link back to this page of the list (HU-59). */}
      <RememberSearch href={municipalityPath(slug, page)} />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        {header(total)}
        <Link
          href={`${EXPLORE_PATH}?lugar=${encodeURIComponent(slug)}`}
          prefetch={false}
          className={`${buttonClass} border border-border hover:border-primary`}
        >
          Filtrar estos sitios
        </Link>
      </div>
      <ResultsTransition>
        <section aria-labelledby="sitios">
          <h2 id="sitios" className="sr-only">
            Sitios en {municipality.name}
          </h2>
          <ResultsRegion>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((place) => (
                <li key={place.slug}>
                  <PlaceCard place={place} />
                </li>
              ))}
            </ul>
            {items.length === 0 ? (
              <p className="text-muted">
                La página {page} no existe.{" "}
                <ResultsLink
                  href={municipalityPath(slug, totalPages)}
                  className="text-primary underline"
                >
                  Ir a la última página
                </ResultsLink>
              </p>
            ) : null}
            <PaginationBar
              page={page}
              totalPages={totalPages}
              hrefFor={(target) => municipalityPath(slug, target)}
            />
          </ResultsRegion>
        </section>
      </ResultsTransition>
    </div>
  );
}

function MunicipalitySkeleton() {
  return (
    <div className="space-y-4">
      <div aria-hidden="true" className="space-y-3">
        <div className="h-9 w-56 animate-pulse rounded-md bg-surface" />
        <div className="h-6 w-40 animate-pulse rounded-md bg-surface" />
      </div>
      <ResultsSkeleton />
    </div>
  );
}

export default function MunicipalityPage({ params, searchParams }: PageProps<"/lugar/[slug]">) {
  return (
    <LoadError what="los sitios del municipio">
      <Suspense fallback={<MunicipalitySkeleton />}>
        <MunicipalityContent params={params} searchParams={searchParams} />
      </Suspense>
    </LoadError>
  );
}
