import { connection } from "next/server";
import { PAGE_DATA_DEADLINE_MS, withDeadline } from "@/lib/deadline";
import { getMunicipalityAgencies } from "@/modules/agencies/service";
import type { CatalogItem } from "@/modules/catalogs/types";
import { formatPhone, phoneHref } from "./phone";

const numberFormat = new Intl.NumberFormat("es-CO");
const linkClass = "text-primary underline underline-offset-4 break-all";

/**
 * HU-66 (RF-16): some registered agencies of the site's municipality, chosen at random on each
 * visit so none is favored. No section when the municipality has none.
 */
export async function MunicipalityAgencies({ municipality }: { municipality: CatalogItem }) {
  await connection();
  const { total, shown } = await withDeadline(
    getMunicipalityAgencies(municipality.slug),
    PAGE_DATA_DEADLINE_MS,
    "las agencias",
  );
  if (total === 0) return null;

  return (
    <section aria-labelledby="agencias" className="max-w-3xl space-y-3">
      <h2 id="agencias" className="text-lg font-semibold">
        Agencias de turismo en {municipality.name}
      </h2>
      <p className="text-muted">
        {total > shown.length
          ? `${numberFormat.format(total)} agencias activas en el Registro Nacional de Turismo (RNT); mostramos ${shown.length} al azar en cada visita.`
          : `${total === 1 ? "Agencia activa" : "Agencias activas"} en el Registro Nacional de Turismo (RNT).`}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {shown.map((agency) => (
          <li
            key={agency.rntNumber}
            className="space-y-1 rounded-xl border border-border bg-surface p-4"
          >
            <p className="font-medium">{agency.name}</p>
            <p className="text-sm text-muted">RNT {agency.rntNumber}</p>
            {agency.phone ? (
              <p className="text-sm">
                Teléfono:{" "}
                <a href={phoneHref(agency.phone)} className={linkClass}>
                  {formatPhone(agency.phone)}
                </a>
              </p>
            ) : null}
            {agency.email ? (
              <p className="text-sm">
                Correo:{" "}
                <a href={`mailto:${agency.email}`} className={linkClass}>
                  {agency.email}
                </a>
              </p>
            ) : null}
            {!agency.phone && !agency.email ? (
              <p className="text-sm text-muted">Sin contacto publicado.</p>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Este listado no es una recomendación ni un patrocinio: son agencias inscritas en el RNT.
        Verifica su registro y sus condiciones antes de contratar.
      </p>
    </section>
  );
}
