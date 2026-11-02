import type { ConfidenceLevel } from "./confidence-level";

/** The level as three dots; decorative, the label next to it says the same. */
export function ConfidenceDots({ dots }: Pick<ConfidenceLevel, "dots">) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {[1, 2, 3].map((dot) => (
        <span
          key={dot}
          className={`size-2 rounded-full border border-primary ${dot <= dots ? "bg-primary" : ""}`}
        />
      ))}
    </span>
  );
}
