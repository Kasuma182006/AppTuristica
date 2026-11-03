import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageHeader, LegalSection, legalLinkClass } from "@/components/legal-page";
import { DATA_SOURCES, RNT_SOURCE } from "@/lib/data-sources";
import { DATA_LICENSE } from "@/lib/openapi";
import { pageMetadata } from "@/lib/page-metadata";
import { SOURCES_PATH, TERMS_PATH } from "@/lib/routes";

export const metadata: Metadata = pageMetadata({
  title: "Fuentes y atribuciones",
  description:
    "De dónde salen los datos del buscador turístico del Valle del Cauca: OpenStreetMap, Wikidata, Wikimedia Commons, el RNT y OpenFreeMap, con sus licencias.",
  path: SOURCES_PATH,
});

/** Change it whenever the text below changes. */
const LAST_UPDATED = { iso: "2026-11-02", text: "2 de noviembre de 2026" };

function NewTabLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={legalLinkClass}>
      {children}
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}

/** The sources of the site and their licenses (HU-90, RF-25). */
export default function SourcesPage() {
  return (
    <article className="max-w-prose space-y-6">
      <LegalPageHeader title="Fuentes y atribuciones" updated={LAST_UPDATED} />

      <p>
        Todo lo que ves aquí viene de fuentes abiertas o de la comunidad. No copiamos textos ni
        fotos de otras páginas: las descripciones de los sitios se generan con plantillas, salvo las
        que escribe quien propone un sitio.
      </p>

      <LegalSection id="fuentes" title="Nuestras fuentes">
        <ul className="space-y-3">
          {DATA_SOURCES.map((source) => (
            <li
              key={source.id}
              className="space-y-1 rounded-xl border border-border bg-surface p-4"
            >
              <h3 className="font-semibold">
                <NewTabLink href={source.url}>{source.name}</NewTabLink>
              </h3>
              <p>{source.use}</p>
              <p className="text-sm">
                Licencia: <NewTabLink href={source.license.url}>{source.license.name}</NewTabLink>
              </p>
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection id="otros" title="Wikipedia y la comunidad">
        <p>
          De Wikipedia solo enlazamos el artículo de algunos sitios: no copiamos su texto. Los
          sitios propuestos por la comunidad se publican sin verificar y bajo{" "}
          {DATA_LICENSE.identifier}, como explican los{" "}
          <Link href={TERMS_PATH} className={legalLinkClass}>
            Términos de uso
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="atribucion" title="Atribución y licencia de los datos">
        <p>Los datos de los sitios se basan en OpenStreetMap: © OpenStreetMap contributors.</p>
        <p>
          Los datos de los sitios, incluidos los de nuestra{" "}
          <Link href="/api-docs" className={legalLinkClass}>
            API
          </Link>
          , se publican bajo la licencia{" "}
          <NewTabLink href={DATA_LICENSE.url}>{DATA_LICENSE.name}</NewTabLink>. Puedes reutilizarlos
          citando la fuente y manteniendo la licencia. Dos excepciones conservan la suya: las fotos,
          cada una con su autor y licencia, y las agencias, bajo {RNT_SOURCE.license}.
        </p>
      </LegalSection>
    </article>
  );
}
