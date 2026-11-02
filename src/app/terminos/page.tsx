import type { Metadata } from "next";
import { DATA_LICENSE } from "@/lib/openapi";
import { pageMetadata } from "@/lib/page-metadata";
import { TERMS_PATH } from "@/lib/routes";

// A short first version, so what the proposal form asks to accept exists (HU-78). HU-88 completes
// it, and then it is indexed and added to the sitemap.
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Términos de uso",
    description:
      "Cómo usar el buscador turístico del Valle del Cauca, bajo qué licencia se publican los aportes y cómo pedir el retiro de contenido.",
    path: TERMS_PATH,
  }),
  robots: { index: false, follow: true },
};

/** The Terms of use (HU-78): use of the site, license of the contributions and removal. */
export default function TermsPage() {
  return (
    <article className="max-w-prose space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Términos de uso</h1>
        <p className="text-muted">Esta es una primera versión, corta. La iremos completando.</p>
      </header>

      <section aria-labelledby="uso" className="space-y-2">
        <h2 id="uso" className="text-lg font-semibold">
          Uso del sitio
        </h2>
        <p>
          Este sitio ayuda a encontrar lugares turísticos poco conocidos del Valle del Cauca, con
          datos abiertos y aportes de la comunidad. La información puede estar incompleta o
          desactualizada: antes de ir, confirma el estado del lugar, el acceso y los permisos que
          pida. Cada persona visita estos lugares bajo su propia responsabilidad.
        </p>
      </section>

      <section aria-labelledby="aportes" className="space-y-2">
        <h2 id="aportes" className="text-lg font-semibold">
          Tus aportes
        </h2>
        <p>
          Al proponer un sitio, declaras que sus datos son ciertos hasta donde sabes y que
          escribiste la descripción con tus palabras, sin copiar textos de otras páginas. Tu aporte
          se publica de inmediato, sin revisión previa, y aparece como propuesto por la comunidad.
        </p>
        <p>
          Lo publicamos bajo la licencia{" "}
          <a href={DATA_LICENSE.url} className="text-primary underline underline-offset-4">
            {DATA_LICENSE.name}
          </a>
          , la misma de los datos de nuestra API: cualquiera puede usarlo y compartirlo citando la
          fuente y manteniendo la licencia.
        </p>
        <p>
          No pedimos cuenta, nombre ni correo, así que no incluyas datos personales en tu aporte.
          Para frenar el spam guardamos tu IP solo en forma cifrada, y el formulario usa Cloudflare
          Turnstile, un servicio externo que comprueba que quien envía es una persona.
        </p>
      </section>

      <section aria-labelledby="retiro" className="space-y-2">
        <h2 id="retiro" className="text-lg font-semibold">
          Retiro de contenido
        </h2>
        <p>
          Si un contenido es incorrecto o te afecta, puedes pedir que lo retiremos. Pronto
          publicaremos aquí el canal para hacerlo.
        </p>
      </section>
    </article>
  );
}
