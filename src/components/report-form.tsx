"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { submitReport } from "@/app/sitio/[slug]/actions";
import {
  COMMENT_MAX_LENGTH,
  REPORT_FIELDS,
  REPORT_PLACE_FIELD,
  REPORT_REASONS,
  reportFormValues,
  validateReportForm,
  type ReportErrors,
  type ReportField,
} from "@/modules/reports/schemas";
import { borderClass, fieldClass } from "./proposal-field";
import { TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";

const NOT_VERIFIED = "No pudimos verificar que eres una persona. Inténtalo de nuevo.";
const NOT_SENT = "No pudimos enviar el reporte. Revisa tu conexión e inténtalo de nuevo.";
const NOT_FOUND = "Este sitio ya no está publicado, así que no hace falta reportarlo.";

/** The dialog takes its name from this heading, whichever step is showing. */
export const REPORT_TITLE_ID = "reporte-titulo";

const errorId = (field: ReportField) => `reporte-${field}-error`;

const primaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-6 font-medium text-on-primary";
const secondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-6 font-medium hover:border-primary";

function ReportFieldError({ field, message }: { field: ReportField; message?: string }) {
  if (!message) return null;
  return (
    <p id={errorId(field)} className="text-sm font-medium text-fg">
      <span aria-hidden="true">⚠︎ </span>
      {message}
    </p>
  );
}

/** The thank-you message (HU-84). */
function ReportThanks({ placeName, onClose }: { placeName: string; onClose: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // The form that had the focus is gone.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="space-y-3">
      <h2 id={REPORT_TITLE_ID} ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
        ¡Gracias por avisarnos!
      </h2>
      <p>
        Recibimos tu reporte sobre <span className="font-medium">{placeName}</span>. Nos ayuda a
        mantener la información correcta.
      </p>
      <button type="button" onClick={onClose} className={primaryButton}>
        Cerrar
      </button>
    </div>
  );
}

/**
 * Reporting an error on a site (HU-84, RF-22): a reason, an optional comment and Turnstile. It only
 * exists while the dialog is open, so Cloudflare's script is not loaded with every site's page.
 */
export function ReportForm({
  placeSlug,
  placeName,
  onClose,
}: {
  placeSlug: string;
  placeName: string;
  onClose: () => void;
}) {
  const [errors, setErrors] = useState<ReportErrors>({});
  const [comment, setComment] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [received, setReceived] = useState(false);
  const [sending, startSending] = useTransition();
  const turnstileRef = useRef<TurnstileHandle>(null);

  /** The error goes with the field, so the first one is focused only once it is on the page. */
  const showErrors = (form: HTMLFormElement, found: ReportErrors) => {
    flushSync(() => setErrors(found));
    const first = REPORT_FIELDS.find((field) => found[field]);
    const element = first ? form.elements.namedItem(first) : null;
    const target = element instanceof RadioNodeList ? element[0] : element;
    if (target instanceof HTMLElement) target.focus();
  };

  const send = (form: HTMLFormElement, data: FormData) => {
    setSendError(null);
    setErrors({});
    startSending(async () => {
      try {
        const sent = await submitReport(data);
        if (sent.status === "received") {
          setReceived(true);
          return;
        }
        if (sent.status === "not-verified") setSendError(NOT_VERIFIED);
        if (sent.status === "not-found") setSendError(NOT_FOUND);
        if (sent.status === "invalid") showErrors(form, sent.errors);
      } catch {
        setSendError(NOT_SENT);
      }
      // Cloudflare accepts each token once, whatever the result was.
      turnstileRef.current?.reset();
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = validateReportForm(reportFormValues(data));
    if (result.success) {
      send(form, data);
    } else {
      setSendError(null);
      showErrors(form, result.errors);
    }
  };

  if (received) return <ReportThanks placeName={placeName} onClose={onClose} />;

  return (
    <form noValidate autoComplete="off" onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h2 id={REPORT_TITLE_ID} className="text-lg font-semibold">
          Reportar un error
        </h2>
        <p className="text-sm text-muted">{placeName}</p>
      </div>
      <input type="hidden" name={REPORT_PLACE_FIELD} value={placeSlug} />

      <fieldset
        aria-describedby={errors.reason ? errorId("reason") : undefined}
        className="space-y-1"
      >
        <legend className="font-medium">
          ¿Qué está mal? <span aria-hidden="true">*</span>
        </legend>
        <ul>
          {REPORT_REASONS.map((reason) => (
            <li key={reason.value}>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name="reason"
                  value={reason.value}
                  required
                  onChange={() => setErrors((current) => ({ ...current, reason: undefined }))}
                  className="size-5 shrink-0 accent-primary"
                />
                {reason.label}
              </label>
            </li>
          ))}
        </ul>
        <ReportFieldError field="reason" message={errors.reason} />
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="reporte-comment" className="block font-medium">
          Comentario (opcional)
        </label>
        <p id="reporte-comment-hint" className="text-sm text-muted">
          Cuéntanos qué viste. No incluyas datos personales.
        </p>
        <textarea
          id="reporte-comment"
          name="comment"
          rows={3}
          value={comment}
          aria-invalid={errors.comment ? true : undefined}
          aria-describedby={[
            "reporte-comment-hint",
            "reporte-comment-count",
            ...(errors.comment ? [errorId("comment")] : []),
          ].join(" ")}
          onChange={(event) => {
            setComment(event.target.value);
            setErrors((current) => ({ ...current, comment: undefined }));
          }}
          className={`${fieldClass} py-2 ${borderClass(errors.comment)}`}
        />
        <p id="reporte-comment-count" className="text-sm text-muted">
          {comment.trim().length} de {COMMENT_MAX_LENGTH} caracteres
        </p>
        <ReportFieldError field="comment" message={errors.comment} />
      </div>

      <TurnstileWidget ref={turnstileRef} />

      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            aria-disabled={sending || undefined}
            className={`${primaryButton} ${sending ? "cursor-wait opacity-70" : ""}`}
          >
            {sending ? "Enviando…" : "Enviar reporte"}
          </button>
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancelar
          </button>
        </div>
        {/* On the page from the start, so screen readers announce the message when it appears. */}
        <p role="status" className="font-medium">
          {sendError ? (
            <>
              <span aria-hidden="true">⚠︎ </span>
              {sendError}
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
