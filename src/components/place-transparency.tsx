import type { PlaceDetail } from "@/modules/places/types";
import { ConfidenceDots } from "./confidence-dots";
import { confidenceLevel } from "./confidence-level";
import { ReportError } from "./report-error";
import { confidenceMissing, formatDate, groupSources, type SourceGroup } from "./transparency";

const linkClass = "text-primary underline underline-offset-4";

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
      {children}
      <span className="sr-only"> (se abre en otra pestaña)</span>
    </a>
  );
}

function SourceLinks({ group, fragile }: { group: SourceGroup; fragile: boolean }) {
  if (group.urls.length === 0) {
    if (fragile) return <span className="text-muted"> (sin enlace para proteger el sitio)</span>;
    return null;
  }
  if (group.urls.length === 1) {
    return (
      <>
        {" — "}
        <ExternalLink href={group.urls[0]!}>Ver elemento</ExternalLink>
      </>
    );
  }
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-primary underline-offset-4 hover:underline">
        <span aria-hidden="true" className="transition-transform group-open:rotate-90">
          ▸
        </span>
        Ver los {group.urls.length} elementos
      </summary>
      <ol className="grid grid-cols-3 gap-x-3 gap-y-2 pt-1 text-sm whitespace-nowrap sm:grid-cols-5">
        {group.urls.map((url, index) => (
          <li key={url}>
            <ExternalLink href={url}>{`Elemento ${index + 1}`}</ExternalLink>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** HU-65 (RF-15): where the data comes from, how complete it is and when it was confirmed. */
export function PlaceTransparency({ place }: { place: PlaceDetail }) {
  const groups = groupSources(place.sources);
  const level = confidenceLevel(place.confidence);
  const missing = confidenceMissing(place);

  return (
    <section
      aria-labelledby="sobre-los-datos"
      className="max-w-3xl space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-6"
    >
      <h2 id="sobre-los-datos" className="text-lg font-semibold">
        Sobre estos datos
      </h2>

      <div className="space-y-1">
        <h3 className="font-medium">Fuentes</h3>
        <ul className="space-y-1">
          {groups.map((group) => (
            <li key={group.label}>
              {group.label}
              {group.count > 1 && group.urls.length === 0 ? ` (${group.count} elementos)` : ""}
              <SourceLinks group={group} fragile={place.fragile} />
            </li>
          ))}
        </ul>
        {groups.some((group) => group.label === "OpenStreetMap") ? (
          <p className="text-sm text-muted">
            Datos de OpenStreetMap ©{" "}
            <ExternalLink href="https://www.openstreetmap.org/copyright">
              colaboradores de OpenStreetMap
            </ExternalLink>
            , bajo licencia ODbL.
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <h3 className="font-medium">Confianza</h3>
        <p className="flex flex-wrap items-center gap-x-2">
          <ConfidenceDots dots={level.dots} />
          {level.label} · {place.confidence} de 100
        </p>
        <p className="text-sm text-muted">
          Mide qué tan completa está la información, no la calidad ni la seguridad del sitio.
        </p>
        {missing.length > 0 ? (
          <p className="text-sm text-muted">Sumaría con: {missing.join(", ")}.</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <h3 className="font-medium">Última actualización</h3>
        <p>
          <time dateTime={place.updatedAt}>{formatDate(place.updatedAt)}</time>
        </p>
        <p className="text-sm text-muted">Última vez que las fuentes confirmaron el sitio.</p>
      </div>

      <ReportError placeSlug={place.slug} placeName={place.name} />
    </section>
  );
}
