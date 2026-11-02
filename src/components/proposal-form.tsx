"use client";

import { useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import type { Catalogs } from "@/modules/catalogs/types";
import {
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  PROPOSAL_FIELDS,
  proposalFormValues,
  validateProposalForm,
  type ProposalErrors,
  type ProposalField,
} from "@/modules/proposals/schemas";

const fieldClass = "w-full rounded-md border bg-bg px-3 text-base text-fg";

/** A field with a problem also says so in words below it: color is never the only sign. */
const borderClass = (error: string | undefined) => (error ? "border-accent" : "border-border");

const errorId = (field: ProposalField) => `propuesta-${field}-error`;

function FieldLabel({ field, children }: { field: ProposalField; children: string }) {
  return (
    <label htmlFor={`propuesta-${field}`} className="block font-medium">
      {children} <span aria-hidden="true">*</span>
    </label>
  );
}

function FieldError({ field, message }: { field: ProposalField; message: string | undefined }) {
  if (!message) return null;
  return (
    <p id={errorId(field)} className="text-sm font-medium text-fg">
      <span aria-hidden="true">⚠︎ </span>
      {message}
    </p>
  );
}

/**
 * The proposal form (HU-74, RF-19), with what is needed to describe a site. Nothing is saved yet:
 * that arrives with HU-80 and HU-83, so for now the button only checks the fields.
 */
export function ProposalForm({
  placeTypes,
  activities,
  municipalities,
}: Pick<Catalogs, "placeTypes" | "activities" | "municipalities">) {
  const [errors, setErrors] = useState<ProposalErrors>({});
  const [checked, setChecked] = useState(false);
  const [description, setDescription] = useState("");

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
          id="propuesta-placeName"
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
          id="propuesta-placeType"
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
          id="propuesta-municipality"
          name="municipality"
          required
          defaultValue=""
          aria-invalid={errors.municipality ? true : undefined}
          aria-describedby={errors.municipality ? errorId("municipality") : undefined}
          onChange={() => clearError("municipality")}
          className={`${fieldClass} h-11 ${borderClass(errors.municipality)}`}
        >
          <option value="">Elige un municipio</option>
          {municipalities.map((municipality) => (
            <option key={municipality.slug} value={municipality.slug}>
              {municipality.name}
            </option>
          ))}
        </select>
        <FieldError field="municipality" message={errors.municipality} />
      </div>

      <div className="space-y-1">
        <FieldLabel field="description">Descripción</FieldLabel>
        <p id="propuesta-description-hint" className="text-sm text-muted">
          Cuenta qué es y cómo es el lugar, con tus palabras. No copies textos de otras páginas.
        </p>
        <textarea
          id="propuesta-description"
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
