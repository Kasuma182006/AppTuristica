import Link from "next/link";
import { CONTACT_PATH, DISCLAIMER_PATH, SOURCES_PATH, TERMS_PATH } from "@/lib/routes";

/** The legal pages and the API docs (HU-92, RF-25). */
const FOOTER_LINKS = [
  { href: TERMS_PATH, label: "Términos de uso" },
  { href: DISCLAIMER_PATH, label: "Aviso de responsabilidad" },
  { href: SOURCES_PATH, label: "Fuentes y atribuciones" },
  { href: CONTACT_PATH, label: "Contacto para retiro" },
  { href: "/api-docs", label: "Documentación de la API" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 text-sm text-muted">
        <p>Buscador turístico · Valle del Cauca, Colombia</p>
        <p className="mt-1">
          Proyecto personal experimental, sin ánimo de lucro, con datos abiertos.
        </p>
        <nav aria-label="Legal y documentación" className="mt-2">
          <ul className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-5">
            {FOOTER_LINKS.map(({ href, label }) => (
              <li key={href}>
                {/* On every page: not worth downloading all of them each time. */}
                <Link
                  href={href}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-fg"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
