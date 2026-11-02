"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { roundCoordinate } from "@/lib/geo";
import type { Bounds } from "@/modules/catalogs/types";
import {
  pointFromText,
  type ProposalErrors,
  type ProposalField,
} from "@/modules/proposals/schemas";
import type { PickedPoint } from "./location-picker-canvas";
import {
  borderClass,
  errorId,
  FieldError,
  fieldClass,
  FieldLabel,
  fieldId,
} from "./proposal-field";

const mapSize = "h-80 sm:h-96";

// MapLibre (~250 KB) only loads in the browser. Choosing a point is what this form is for, so it
// starts loading with the page.
const LocationPickerCanvas = dynamic(() => import("./location-picker-canvas"), {
  ssr: false,
  loading: () => (
    <div
      className={`${mapSize} flex w-full animate-pulse items-center justify-center rounded-xl border border-border bg-surface`}
    >
      <p className="text-muted">Cargando mapa…</p>
    </div>
  ),
});

interface Props {
  errors: ProposalErrors;
  clearError: (field: ProposalField) => void;
  /** The chosen municipality's area, which the map moves to. */
  frame: Bounds | null;
}

/**
 * Where the site is (HU-75, RF-19): a marker on the map and the two coordinates, kept in step.
 * The fields are what the form sends, and they work without a mouse or without WebGL.
 */
export function ProposalLocationField({ errors, clearError, frame }: Props) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  // Half-written coordinates leave the marker out until they are valid.
  const point = pointFromText(latitude, longitude);

  const handlePick = ({ lat, lng }: PickedPoint) => {
    setLatitude(String(roundCoordinate(lat)));
    setLongitude(String(roundCoordinate(lng)));
    clearError("latitude");
    clearError("longitude");
  };

  const coordinateField = (
    field: "latitude" | "longitude",
    label: string,
    example: string,
    value: string,
    setValue: (text: string) => void,
  ) => {
    const hintId = `${fieldId(field)}-hint`;
    return (
      <div className="space-y-1">
        <FieldLabel field={field}>{label}</FieldLabel>
        <input
          id={fieldId(field)}
          name={field}
          type="text"
          // Not "decimal": the keyboard of iPhones would have no minus sign for the longitude.
          inputMode="text"
          required
          value={value}
          aria-invalid={errors[field] ? true : undefined}
          aria-describedby={[hintId, ...(errors[field] ? [errorId(field)] : [])].join(" ")}
          onChange={(event) => {
            setValue(event.target.value);
            clearError(field);
          }}
          className={`${fieldClass} h-11 ${borderClass(errors[field])}`}
        />
        <p id={hintId} className="text-sm text-muted">
          Ejemplo: {example}
        </p>
        <FieldError field={field} message={errors[field]} />
      </div>
    );
  };

  return (
    <fieldset className="space-y-3">
      <legend className="font-medium">
        Ubicación <span aria-hidden="true">*</span>
      </legend>
      <p className="text-sm text-muted">
        Toca el mapa donde queda el sitio y arrastra el marcador para ajustarlo. Si ya tienes las
        coordenadas, escríbelas debajo del mapa.
      </p>
      <LocationPickerCanvas point={point} onPick={handlePick} frame={frame} className={mapSize} />
      <div className="grid gap-4 sm:grid-cols-2">
        {coordinateField("latitude", "Latitud", "3.45123", latitude, setLatitude)}
        {coordinateField("longitude", "Longitud", "-76.53201", longitude, setLongitude)}
      </div>
    </fieldset>
  );
}
