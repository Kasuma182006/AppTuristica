import Link from "next/link";
import { DISCLAIMER_PATH } from "@/lib/routes";

/** Our own wording, not copied from the Leave No Trace program (CLAUDE.md: no third-party texts). */
export const LEAVE_NO_TRACE = [
  "Llévate toda tu basura.",
  "No salgas de los senderos.",
  "No alimentes ni molestes a los animales.",
  "No hagas fogatas.",
  "No te lleves plantas, piedras ni flores.",
  "Respeta a las comunidades y a los propietarios.",
] as const;

const box = "space-y-2 rounded-xl border border-border bg-surface p-4 sm:p-6";

/**
 * HU-64 (RF-14): the notices every site page shows, the same for every site. No site is ever
 * called safe: visitors are sent to local authorities and registered agencies instead.
 */
export function VisitNotices({ municipality }: { municipality: string }) {
  return (
    <section aria-labelledby="antes-de-ir" className="max-w-3xl space-y-3">
      <h2 id="antes-de-ir" className="text-lg font-semibold">
        Antes de ir
      </h2>

      <div className={box}>
        <h3 className="font-semibold">No deje rastro</h3>
        <p className="text-muted">Cuida el lugar para quienes vienen después.</p>
        {/* Native: opens without JavaScript and is keyboard accessible. */}
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1 text-primary underline-offset-4 hover:underline">
            <span aria-hidden="true" className="transition-transform group-open:rotate-90">
              ▸
            </span>
            <span className="group-open:hidden">Ver recomendaciones</span>
            <span className="hidden group-open:inline">Ocultar recomendaciones</span>
          </summary>
          <ul className="list-disc space-y-1 pt-1 pl-6">
            {LEAVE_NO_TRACE.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </details>
      </div>

      <div className={box}>
        <h3 className="font-semibold">Orden público</h3>
        <p>
          Las condiciones de seguridad cambian y no podemos garantizarlas. Antes de ir, consulta con
          la alcaldía o la Policía de {municipality}, o con una agencia de turismo registrada en el
          RNT.
        </p>
        <p>
          En una emergencia, llama al{" "}
          <a href="tel:123" className="font-semibold text-primary underline underline-offset-4">
            123
          </a>
          .
        </p>
        <p>
          <Link
            href={DISCLAIMER_PATH}
            prefetch={false}
            className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
          >
            Lee el aviso de responsabilidad
          </Link>
        </p>
      </div>
    </section>
  );
}
