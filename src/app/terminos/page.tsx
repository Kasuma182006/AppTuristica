import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageHeader, LegalSection, legalLinkClass } from "@/components/legal-page";
import { RNT_SOURCE } from "@/lib/data-sources";
import { DATA_LICENSE } from "@/lib/openapi";
import { pageMetadata } from "@/lib/page-metadata";
import { CONTACT_PATH, DISCLAIMER_PATH, SOURCES_PATH, TERMS_PATH } from "@/lib/routes";
import { REPORT_RETENTION_DAYS } from "@/modules/reports/schemas";

export const metadata: Metadata = pageMetadata({
  title: "Términos de uso",
  description:
    "Cómo usar el buscador turístico del Valle del Cauca, qué se puede publicar, bajo qué licencia se publican los aportes y cómo pedir el retiro de contenido.",
  path: TERMS_PATH,
});

/** Change it whenever the text below changes. */
const LAST_UPDATED = { iso: "2026-11-02", text: "2 de noviembre de 2026" };

/**
 * The Terms of use (HU-78, HU-88, RF-25): use of the site, what can be published, license of the
 * contributions and removal.
 */
export default function TermsPage() {
  return (
    <article className="max-w-prose space-y-6">
      <LegalPageHeader title="Términos de uso" updated={LAST_UPDATED} />

      <LegalSection id="uso" title="Uso del sitio">
        <p>
          Este sitio es un proyecto personal, experimental y sin ánimo de lucro. Ayuda a encontrar
          lugares turísticos poco conocidos del Valle del Cauca, con datos abiertos y aportes de la
          comunidad, y su uso es gratuito.
        </p>
        <p>
          La información puede estar incompleta o desactualizada: antes de ir, confirma el estado
          del lugar, el acceso y los permisos que pida. Cada persona visita estos lugares bajo su
          propia responsabilidad: lee el{" "}
          <Link href={DISCLAIMER_PATH} className={legalLinkClass}>
            Aviso de responsabilidad
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="aportes" title="Tus aportes">
        <p>
          Al proponer un sitio, declaras que sus datos son ciertos hasta donde sabes y que
          escribiste la descripción con tus palabras, sin copiar textos de otras páginas. Tu aporte
          se publica de inmediato, sin revisión previa, y aparece como propuesto por la comunidad.
        </p>
        <p>
          Lo publicamos bajo la licencia{" "}
          <a href={DATA_LICENSE.url} className={legalLinkClass}>
            {DATA_LICENSE.name}
          </a>
          , la misma de los datos de nuestra API: cualquiera puede usarlo y compartirlo citando la
          fuente y manteniendo la licencia.
        </p>
      </LegalSection>

      <LegalSection id="no-permitido" title="Qué no se puede publicar">
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
      </LegalSection>

      <LegalSection id="reportes" title="Reportes de errores">
        <p>
          Cualquier persona puede reportar un error desde la ficha de un sitio. Cuenta un reporte
          por conexión y sitio, y tres reportes de conexiones distintas ocultan el sitio de forma
          automática, sin revisión previa. No reportes un sitio si no hay un problema real.
        </p>
      </LegalSection>

      <LegalSection id="datos" title="Datos que guardamos">
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
      </LegalSection>

      <LegalSection id="api" title="Uso de los datos y de la API">
        <p>
          Los datos de los sitios y de la{" "}
          <Link href="/api-docs" className={legalLinkClass}>
            API
          </Link>{" "}
          están bajo {DATA_LICENSE.identifier}: puedes reutilizarlos citando la fuente y manteniendo
          la licencia. Las fotos y las agencias conservan la suya: cada foto muestra su autor y su
          licencia, y las agencias vienen del RNT, bajo {RNT_SOURCE.license}. Lo explicamos en{" "}
          <Link href={SOURCES_PATH} className={legalLinkClass}>
            Fuentes y atribuciones
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="retiro" title="Retiro de contenido">
        <p>
          Si un contenido es incorrecto o te afecta, o si un sitio se ocultó por error, puedes
          pedirnos que lo revisemos: te explicamos cómo en{" "}
          <Link href={CONTACT_PATH} className={legalLinkClass}>
            Contacto para retiro de contenido
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="cambios" title="Cambios y ley aplicable">
        <p>
          Podemos cambiar estos términos: la fecha de arriba indica la última versión. Se rigen por
          las leyes de Colombia.
        </p>
      </LegalSection>
    </article>
  );
}
