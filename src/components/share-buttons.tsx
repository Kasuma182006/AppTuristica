"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ShareData } from "./share";

/** How long "Enlace copiado" stays before the button reads "Copiar enlace" again. */
const COPIED_MS = 2500;

const noSubscription = () => () => {};
// The server cannot know: the button only appears once the page runs in the browser.
const canShareNatively = () => typeof navigator.share === "function";

const buttonClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:border-primary";

type CopyState = "idle" | "copied" | "failed";

/** HU-68 (RF-18): copy the link, send it by WhatsApp or, on phones, use the system's menu. */
export function ShareButtons({ data }: { data: ShareData }) {
  const [copy, setCopy] = useState<CopyState>("idle");
  const nativeShare = useSyncExternalStore(noSubscription, canShareNatively, () => false);

  useEffect(() => {
    if (copy !== "copied") return;
    const timer = setTimeout(() => setCopy("idle"), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copy]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      setCopy("copied");
    } catch {
      // No clipboard permission (or an old browser): the address is shown to copy by hand.
      setCopy("failed");
    }
  };

  const shareNatively = async () => {
    try {
      await navigator.share({ title: data.title, text: data.text, url: data.url });
    } catch {
      // Closing the menu also rejects; there is nothing to report.
    }
  };

  return (
    <div className="space-y-2">
      {/* Three fit in one row on a 375 px phone. */}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={copyLink} className={buttonClass}>
          {copy === "copied" ? <span aria-hidden="true">✓</span> : null}
          {copy === "copied" ? "Enlace copiado" : "Copiar enlace"}
        </button>
        <a href={data.whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          WhatsApp
          <span className="sr-only"> (se abre en otra pestaña)</span>
        </a>
        {nativeShare ? (
          <button type="button" onClick={shareNatively} className={buttonClass}>
            Compartir
          </button>
        ) : null}
      </div>
      <p role="status" className="text-sm text-muted">
        {copy === "copied" ? <span className="sr-only">Enlace copiado.</span> : null}
        {copy === "failed" ? (
          <>
            No se pudo copiar. Copia esta dirección:{" "}
            <span className="break-all text-fg select-all">{data.url}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
