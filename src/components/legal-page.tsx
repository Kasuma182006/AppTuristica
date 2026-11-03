import type { ReactNode } from "react";

export const legalLinkClass = "text-primary underline underline-offset-4";

/** The title of a legal page (RF-25) and when its text last changed. */
export function LegalPageHeader({
  title,
  updated,
}: {
  title: string;
  updated: { iso: string; text: string };
}) {
  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="text-muted">
        Última actualización: <time dateTime={updated.iso}>{updated.text}</time>.
      </p>
    </header>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}
