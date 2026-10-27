"use client";

import { useId, useState } from "react";
import { FREE_ACCESS } from "@/modules/places/filters";
import { useFilterValue, useInitialValue } from "./filter-panel-state";
import { placeCountLabel } from "./municipality-search";

/**
 * Hide restricted access (HU-49): unchecked by default; checked, it sends ?acceso=libre, which
 * leaves out protected areas and private property. A plain checkbox, so it works without
 * JavaScript; the state is tracked for "Limpiar filtros" (HU-50) and the address (HU-51).
 */
/** URL parameter of the access filter. */
const PARAM = "acceso";

interface Props {
  restrictedCount: number;
  /** The parameter's value in the address. */
  initial?: string;
}

export function AccessFilter({ restrictedCount, initial }: Props) {
  const id = useId();
  const [checked, setChecked] = useState(useInitialValue(initial) === FREE_ACCESS);
  useFilterValue(PARAM, checked ? FREE_ACCESS : "");
  return (
    <fieldset className="space-y-1">
      <legend className="font-medium">Acceso</legend>
      <label className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name={PARAM}
          value={FREE_ACCESS}
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
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
