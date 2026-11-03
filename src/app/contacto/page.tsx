import type { Metadata } from "next";
import { LegalPageHeader, LegalSection } from "@/components/legal-page";
import { pageMetadata } from "@/lib/page-metadata";
import { CONTACT_PATH } from "@/lib/routes";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Contacto para retiro de contenido",
  description:
    "Cómo pedir que se retire o se revise un contenido del buscador turístico del Valle del Cauca, y qué datos incluir en la solicitud.",
  path: CONTACT_PATH,
});

/** Change it whenever the text below changes. */
const LAST_UPDATED = { iso: "2026-11-02", text: "2 de noviembre de 2026" };

const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Solicitud de retiro de contenido")}`;

/** Where to ask for content to be removed (HU-91, RF-25). */
export default function ContactPage() {
  return (
    <article className="max-w-prose space-y-6">
      <LegalPageHeader title="Contacto para retiro de contenido" updated={LAST_UPDATED} />

      <p>
        Escríbenos si un contenido de este sitio es incorrecto o te afecta, por ejemplo si muestra
        un lugar de tu propiedad o tus datos personales, o si un sitio se ocultó por error.
      </p>

      <LegalSection id="correo" title="Correo">
        <p>
          <a
            href={MAILTO}
            className="inline-flex min-h-11 items-center font-medium break-all text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>

      <LegalSection id="que-incluir" title="Qué incluir en tu solicitud">
        <ul className="list-disc space-y-1 pl-6">
          <li>La dirección de la página, por ejemplo la de la ficha del sitio.</li>
          <li>Qué contenido quieres que retiremos o corrijamos, y por qué.</li>
          <li>Cómo te afecta, por ejemplo si eres el propietario del lugar.</li>
        </ul>
        <p>No hace falta que envíes documentos ni más datos personales de los necesarios.</p>
      </LegalSection>

      <LegalSection id="que-pasa" title="Qué pasa después">
        <p>
          Este es un proyecto personal: respondemos lo antes posible. Usamos tu correo solo para
          atender tu solicitud.
        </p>
        <p>
          Retirar un sitio de aquí no lo cambia en sus fuentes. Si el dato viene de OpenStreetMap o
          de otra fuente abierta, también puede seguir publicado allá.
        </p>
      </LegalSection>

      <p className="text-sm text-muted">
        Este correo no atiende emergencias: en ese caso, llama al 123.
      </p>
    </article>
  );
}
