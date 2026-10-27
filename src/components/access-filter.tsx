import { useId } from "react";
import { FREE_ACCESS } from "@/modules/places/filters";
import { placeCountLabel } from "./municipality-search";

/**
 * Hide restricted access (HU-49): unchecked by default; checked, it sends ?acceso=libre, which
 * leaves out protected areas and private property. A plain checkbox: no JavaScript needed.
 */
export function AccessFilter({ restrictedCount }: { restrictedCount: number }) {
  const id = useId();
  return (
    <fieldset className="space-y-1">
      <legend className="font-medium">Acceso</legend>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name="acceso"
          value={FREE_ACCESS}
          aria-describedby={id}
          className="size-5 accent-primary"
        />
        <span>Ocultar sitios con acceso restringido</span>
      </label>
      <p id={id} className="pl-8 text-sm text-muted">
        Excluye áreas protegidas y propiedad privada ({placeCountLabel(restrictedCount)}).
      </p>
    </fieldset>
  );
}
