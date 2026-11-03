import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DATA_LICENSE } from "@/lib/openapi";
import { pageMetadata } from "@/lib/page-metadata";
import { TERMS_PATH } from "@/lib/routes";
import { REPORT_RETENTION_DAYS } from "@/modules/reports/schemas";

export const metadata: Metadata = pageMetadata({
  title: "Términos de uso",
  description:
    "Cómo usar el buscador turístico del Valle del Cauca, qué se puede publicar, bajo qué licencia se publican los aportes y cómo pedir el retiro de contenido.",
  path: TERMS_PATH,
});

const linkClass = "text-primary underline underline-offset-4";

/** Change it whenever the text below changes. */
const LAST_UPDATED = { iso: "2026-11-02", text: "2 de noviembre de 2026" };

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The Terms of use (HU-78, HU-88, RF-25): use of the site, what can be published, license of the
 * contributions and removal. The removal channel depends on HU-91.
 */
export default function TermsPage() {
  return (
    <article className="max-w-prose space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Términos de uso</h1>
        <p className="text-muted">
          Última actualización: <time dateTime={LAST_UPDATED.iso}>{LAST_UPDATED.text}</time>.
        </p>
      </header>

      <Section id="uso" title="Uso del sitio">
        <p>
          Este sitio es un proyecto personal, experimental y sin ánimo de lucro. Ayuda a encontrar
          lugares turísticos poco conocidos del Valle del Cauca, con datos abiertos y aportes de la
          comunidad, y su uso es gratuito.
        </p>
        <p>
          La información puede estar incompleta o desactualizada: antes de ir, confirma el estado
          del lugar, el acceso y los permisos que pida. Cada persona visita estos lugares bajo su
          propia responsabilidad.
        </p>
      </Section>

      <Section id="aportes" title="Tus aportes">
        <p>
          Al proponer un sitio, declaras que sus datos son ciertos hasta donde sabes y que
          escribiste la descripción con tus palabras, sin copiar textos de otras páginas. Tu aporte
          se publica de inmediato, sin revisión previa, y aparece como propuesto por la comunidad.
        </p>
        <p>
          Lo publicamos bajo la licencia{" "}
          <a href={DATA_LICENSE.url} className={linkClass}>
            {DATA_LICENSE.name}
          </a>
          , la misma de los datos de nuestra API: cualquiera puede usarlo y compartirlo citando la
          fuente y manteniendo la licencia.
        </p>
      </Section>

      <Section id="no-permitido" title="Qué no se puede publicar">
        <ul className="list-disc space-y-1 pl-6">
          <li>Lugares inventados o información que sabes que es falsa.</li>
          <li>Contenido ofensivo, discriminatorio o que promueva actividades ilegales.</li>
          <li>Datos de personas, como nombres, teléfonos o correos.</li>
          <li>Publicidad de negocios o servicios.</li>
          <li>Textos copiados de otras páginas.</li>
        </ul>
        <p>
          Podemos corregir o retirar cualquier aporte que incumpla estas reglas, sin previo aviso.
        </p>
      </Section>

      <Section id="reportes" title="Reportes de errores">
        <p>
          Cualquier persona puede reportar un error desde la ficha de un sitio. Cuenta un reporte
          por conexión y sitio, y tres reportes de conexiones distintas ocultan el sitio de forma
          automática, sin revisión previa. No reportes un sitio si no hay un problema real.
        </p>
      </Section>

      <Section id="datos" title="Datos que guardamos">
        <p>
          No pedimos cuenta, nombre ni correo, así que no incluyas datos personales en tus aportes
          ni en tus reportes. Para frenar el spam guardamos tu IP solo en forma cifrada, y los
          formularios usan Cloudflare Turnstile, un servicio externo que comprueba que quien envía
          es una persona. Los reportes, con su comentario y su IP cifrada, se borran pasados{" "}
          {REPORT_RETENTION_DAYS} días.
        </p>
        <p>
          Tu navegador recuerda que cerraste el aviso de primera visita y tu última búsqueda. Eso se
          queda en tu dispositivo: no nos llega.
        </p>
      </Section>

      <Section id="api" title="Uso de los datos y de la API">
        <p>
          Los datos del sitio y de la{" "}
          <Link href="/api-docs" className={linkClass}>
            API
          </Link>{" "}
          están bajo {DATA_LICENSE.identifier}: puedes reutilizarlos citando la fuente y manteniendo
          la licencia. Los que vienen de OpenStreetMap llevan su atribución, y cada foto conserva su
          propio autor y licencia.
        </p>
      </Section>

      <Section id="retiro" title="Retiro de contenido">
        <p>
          Si un contenido es incorrecto o te afecta, o si un sitio se ocultó por error, puedes
          pedirnos que lo revisemos. Pronto publicaremos aquí el canal para hacerlo.
        </p>
      </Section>

      <Section id="cambios" title="Cambios y ley aplicable">
        <p>
          Podemos cambiar estos términos: la fecha de arriba indica la última versión. Se rigen por
          las leyes de Colombia.
        </p>
      </Section>
    </article>
  );
}
