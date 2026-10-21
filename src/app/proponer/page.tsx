import type { Metadata } from "next";

// Placeholder until the proposal form (epic 8).
export const metadata: Metadata = {
  title: "Proponer lugar",
  robots: { index: false, follow: false },
};

export default function ProposePlacePage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proponer lugar</h1>
      <p className="mt-2 text-muted">
        Próximamente podrás proponer lugares poco conocidos para que otros los descubran.
      </p>
    </>
  );
}
