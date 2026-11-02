"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as z from "zod/mini";
import type { CatalogItem } from "@/modules/catalogs/types";
import { EXPLORE_PATH } from "./filter-url";
import { municipalityFromSlug, slugFromPath } from "./municipality-from-slug";

const catalogsResponse = z.object({
  data: z.object({ municipalities: z.array(z.object({ slug: z.string(), name: z.string() })) }),
});

/**
 * "Ver sitios en Cali" when the missing site's address ends with a municipality (HU-69). The
 * 404 page is static (that is what gives it a real 404 status), so the address and the
 * municipalities are read in the browser, from the public API.
 */
export function MunicipalitySuggestion() {
  const [municipality, setMunicipality] = useState<CatalogItem>();

  useEffect(() => {
    const slug = slugFromPath(window.location.pathname);
    if (!slug) return;
    const controller = new AbortController();
    fetch("/api/v1/catalogs", { signal: controller.signal })
      .then((response) => response.json())
      .then((json: unknown) => {
        const parsed = catalogsResponse.safeParse(json);
        if (parsed.success) {
          setMunicipality(municipalityFromSlug(slug, parsed.data.data.municipalities));
        }
      })
      // Without the suggestion the page still offers "Explorar sitios".
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!municipality) return null;
  return (
    <Link
      href={`${EXPLORE_PATH}?lugar=${encodeURIComponent(municipality.slug)}`}
      prefetch={false}
      className="inline-flex h-11 items-center text-primary underline underline-offset-4"
    >
      Ver sitios en {municipality.name}
    </Link>
  );
}
