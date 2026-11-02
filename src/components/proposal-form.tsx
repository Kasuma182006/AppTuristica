"use client";

import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import type { Bounds, Catalogs } from "@/modules/catalogs/types";
import { TERMS_PATH } from "@/lib/routes";
import { COST_LABELS } from "@/modules/places/types";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  PROPOSAL_FIELDS,
  proposalFormValues,
  validateProposalForm,
  type ProposalErrors,
  type ProposalField,
} from "@/modules/proposals/schemas";
import {
  borderClass,
  errorId,
  FieldError,
  fieldClass,
  FieldLabel,
  fieldId,
} from "./proposal-field";
import { ProposalLocationField } from "./proposal-location-field";

/** "No sé" goes first and chosen: not knowing is the usual case, and it changes nothing. */
const COST_OPTIONS = [
  { value: "", label: "No sé" },
  { value: "gratis", label: COST_LABELS.gratis },
  { value: "pago", label: COST_LABELS.pago },
];

interface Props extends Pick<Catalogs, "placeTypes" | "activities" | "municipalities"> {
  /** The area of each municipality, by slug, to move the map there. */
  municipalityBounds: Record<string, Bounds>;
}

/**
 * The proposal form (HU-74, RF-19), with what is needed to describe a site. Nothing is saved yet:
 * that arrives with HU-80 and HU-83, so for now the button only checks the fields.
 */
export function ProposalForm({
  placeTypes,
  activities,
  municipalities,
  municipalityBounds,
}: Props) {
  const [errors, setErrors] = useState<ProposalErrors>({});
  const [checked, setChecked] = useState(false);
  const [description, setDescription] = useState("");
  const [municipality, setMunicipality] = useState("");

  const clearError = (field: ProposalField) => {
    setChecked(false);
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  /** The error goes with the field, so the first one is focused only once it is on the page. */
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const result = validateProposalForm(proposalFormValues(new FormData(form)));
    if (result.success) {
      setErrors({});
      setChecked(true);
      return;
    }
    flushSync(() => {
      setChecked(false);
      setErrors(result.errors);
    });
    const first = PROPOSAL_FIELDS.find((field) => result.errors[field]);
    const element = first ? form.elements.namedItem(first) : null;
    if (element instanceof HTMLElement) element.focus();
  };

  return (
    <form noValidate autoComplete="off" onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <p className="text-sm text-muted">Los campos con * son obligatorios.</p>

      <div className="space-y-1">
        <FieldLabel field="placeName">Nombre del sitio</FieldLabel>
        <input
          id={fieldId("placeName")}
          name="placeName"
          type="text"
          required
          aria-invalid={errors.placeName ? true : undefined}
          aria-describedby={errors.placeName ? errorId("placeName") : undefined}
          onChange={() => clearError("placeName")}
          className={`${fieldClass} h-11 ${borderClass(errors.placeName)}`}
        />
        <FieldError field="placeName" message={errors.placeName} />
      </div>

      <div className="space-y-1">
        <FieldLabel field="placeType">Tipo de sitio</FieldLabel>
        <select
          id={fieldId("placeType")}
          name="placeType"
          required
          defaultValue=""
          aria-invalid={errors.placeType ? true : undefined}
          aria-describedby={errors.placeType ? errorId("placeType") : undefined}
          onChange={() => clearError("placeType")}
          className={`${fieldClass} h-11 ${borderClass(errors.placeType)}`}
        >
          <option value="">Elige un tipo</option>
          {placeTypes.map((type) => (
            <option key={type.slug} value={type.slug}>
              {type.name}
            </option>
          ))}
        </select>
        <FieldError field="placeType" message={errors.placeType} />
      </div>

      <fieldset className="space-y-2">
        <legend className="font-medium">Actividades (opcional)</legend>
        <ul className="grid gap-x-4 sm:grid-cols-2">
          {activities.map((activity) => (
            <li key={activity.slug}>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  name="activities"
                  value={activity.slug}
                  onChange={() => setChecked(false)}
                  className="size-5 shrink-0 accent-primary"
                />
                {activity.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="space-y-1">
        <FieldLabel field="municipality">Municipio</FieldLabel>
        <select
          id={fieldId("municipality")}
          name="municipality"
          required
          value={municipality}
          aria-invalid={errors.municipality ? true : undefined}
          aria-describedby={errors.municipality ? errorId("municipality") : undefined}
          onChange={(event) => {
            setMunicipality(event.target.value);
            clearError("municipality");
          }}
          className={`${fieldClass} h-11 ${borderClass(errors.municipality)}`}
        >
          <option value="">Elige un municipio</option>
          {municipalities.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.name}
            </option>
          ))}
        </select>
        <FieldError field="municipality" message={errors.municipality} />
      </div>

      <ProposalLocationField
        errors={errors}
        clearError={clearError}
        frame={municipalityBounds[municipality] ?? null}
      />

      <div className="space-y-1">
        <FieldLabel field="description">Descripción</FieldLabel>
        <p id="propuesta-description-hint" className="text-sm text-muted">
          Cuenta qué es y cómo es el lugar, con tus palabras. No copies textos de otras páginas.
        </p>
        <textarea
          id={fieldId("description")}
          name="description"
          rows={5}
          required
          value={description}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={[
            "propuesta-description-hint",
            "propuesta-description-count",
            ...(errors.description ? [errorId("description")] : []),
          ].join(" ")}
          onChange={(event) => {
            setDescription(event.target.value);
            clearError("description");
          }}
          className={`${fieldClass} py-2 ${borderClass(errors.description)}`}
        />
        <p id="propuesta-description-count" className="text-sm text-muted">
          {description.trim().length} de {DESCRIPTION_MAX_LENGTH} caracteres (mínimo{" "}
          {DESCRIPTION_MIN_LENGTH})
        </p>
        <FieldError field="description" message={errors.description} />
      </div>

      <fieldset className="space-y-2">
        <legend className="font-medium">Costo de entrada (opcional)</legend>
        <ul className="grid gap-x-4 sm:grid-cols-3">
          {COST_OPTIONS.map((option) => (
            <li key={option.value}>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name="cost"
                  value={option.value}
                  defaultChecked={option.value === ""}
                  onChange={() => clearError("cost")}
                  className="size-5 shrink-0 accent-primary"
                />
                {option.label}
              </label>
            </li>
          ))}
        </ul>
        <FieldError field="cost" message={errors.cost} />
      </fieldset>

      <div className="space-y-1">
        <label className="flex min-h-11 items-center gap-3 font-medium">
          <input
            type="checkbox"
            name="fragile"
            aria-describedby="propuesta-fragile-hint"
            onChange={() => setChecked(false)}
            className="size-5 shrink-0 accent-primary"
          />
          Es un sitio frágil
        </label>
        <p id="propuesta-fragile-hint" className="text-sm text-muted">
          Marca esta casilla si el lugar se daña con facilidad o está en un área protegida. No
          mostraremos su punto exacto a nadie: se verá un área de unos 2 km, y &quot;Cómo
          llegar&quot; solo llevará al municipio.
        </p>
      </div>

      <div className="space-y-1">
        <label className="flex items-start gap-3 py-2">
          <input
            id={fieldId("acceptedTerms")}
            type="checkbox"
            name="acceptedTerms"
            required
            aria-invalid={errors.acceptedTerms ? true : undefined}
            aria-describedby={errors.acceptedTerms ? errorId("acceptedTerms") : undefined}
            onChange={() => clearError("acceptedTerms")}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            Acepto los {/* In another tab, so what was written in the form is not lost. */}
            <a
              href={TERMS_PATH}
              target="_blank"
              rel="noopener"
              className="text-primary underline underline-offset-4"
            >
              Términos de uso
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>{" "}
            y que mi aporte se publique bajo la licencia abierta ODbL.{" "}
            <span aria-hidden="true">*</span>
          </span>
        </label>
        <FieldError field="acceptedTerms" message={errors.acceptedTerms} />
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 font-medium text-on-primary"
        >
          Enviar propuesta
        </button>
        {/* On the page from the start, so screen readers announce the message when it appears. */}
        <p role="status" className="font-medium">
          {checked
            ? "Los datos están completos, pero aún no recibimos propuestas: no se guardó nada."
            : null}
        </p>
      </div>
    </form>
  );
}
