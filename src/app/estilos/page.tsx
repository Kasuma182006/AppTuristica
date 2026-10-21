import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guía de estilos",
  robots: { index: false, follow: false },
};

const swatches = [
  { name: "bg", className: "bg-bg text-fg" },
  { name: "surface", className: "bg-surface text-fg" },
  { name: "primary", className: "bg-primary text-on-primary" },
  { name: "secondary", className: "bg-secondary text-on-secondary" },
  { name: "accent", className: "bg-accent text-on-accent" },
] as const;

export default function StyleGuidePage() {
  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Guía de estilos</h1>
        <p className="text-muted">Tokens de color y tipografía del buscador turístico.</p>
      </header>

      <section aria-labelledby="colores" className="space-y-4">
        <h2 id="colores" className="text-xl font-semibold">
          Colores
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {swatches.map((swatch) => (
            <li
              key={swatch.name}
              className={`rounded-lg border border-border p-4 font-mono text-sm ${swatch.className}`}
            >
              {swatch.name}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tipografia" className="space-y-3">
        <h2 id="tipografia" className="text-xl font-semibold">
          Tipografía
        </h2>
        <p className="text-4xl font-bold">Cascada La Sirena</p>
        <p className="text-2xl font-semibold">Sendero al mirador</p>
        <p>
          Texto base: un recorrido de dificultad media por bosque de niebla, con río y miradores
          sobre el valle.
        </p>
        <p className="text-sm text-muted">Texto secundario · Dagua, Valle del Cauca</p>
        <p className="font-mono text-sm">font-mono · 3.4512, -76.5320</p>
      </section>

      <section aria-labelledby="componentes" className="space-y-4">
        <h2 id="componentes" className="text-xl font-semibold">
          Componentes de prueba
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary"
          >
            Buscar lugares
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-4 py-2 font-medium"
          >
            Limpiar filtros
          </button>
          <span className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-on-accent">
            Comunidad
          </span>
        </div>
        <article className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <h3 className="font-semibold">Charco Azul</h3>
          <p className="text-sm text-muted">Río · Dificultad baja</p>
          <a href="#" className="mt-2 inline-block text-sm font-medium text-secondary underline">
            Ver ficha
          </a>
        </article>
      </section>
    </div>
  );
}
