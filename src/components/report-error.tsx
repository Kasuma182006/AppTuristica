"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ReportForm, REPORT_TITLE_ID } from "./report-form";

/**
 * "Reportar un error" on a site's page (HU-84, RF-22), opening a native dialog: it keeps the focus
 * inside, closes with Esc and gives the focus back to the button. Without Turnstile's key nothing
 * can be sent, so nothing is offered.
 */
export function ReportError({ placeSlug, placeName }: { placeSlug: string; placeName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return null;

  const openDialog = () => {
    // The form must be on the page for the browser to focus it when the dialog opens.
    flushSync(() => setOpen(true));
    dialogRef.current?.showModal();
  };

  return (
    <div className="space-y-1">
      <h3 className="font-medium">¿Ves algo incorrecto?</h3>
      <p className="text-sm text-muted">
        Avísanos si el sitio no existe, está mal ubicado o es peligroso.
      </p>
      <button
        type="button"
        onClick={openDialog}
        className="mt-1 inline-flex min-h-11 items-center justify-center rounded-md border border-border px-6 font-medium hover:border-primary"
      >
        Reportar un error
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={REPORT_TITLE_ID}
        onClose={() => setOpen(false)}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-xl border border-border bg-bg p-4 text-fg backdrop:bg-black/60 sm:p-6"
      >
        {open ? (
          <ReportForm
            placeSlug={placeSlug}
            placeName={placeName}
            onClose={() => dialogRef.current?.close()}
          />
        ) : null}
      </dialog>
    </div>
  );
}
