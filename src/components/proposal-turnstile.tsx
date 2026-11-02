"use client";

import Script from "next/script";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

/** The part of Cloudflare's script used here. */
interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      language: string;
      size: "flexible";
      "error-callback": () => void;
    },
  ) => string | undefined;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const UNAVAILABLE =
  "No pudimos cargar la verificación. Revisa si un bloqueador de contenido la impide y recarga la página.";

export interface ProposalTurnstileHandle {
  /** A new token: each one works only once. */
  reset: () => void;
}

/**
 * Cloudflare Turnstile in the proposal form (HU-79). The widget leaves its token in a hidden field
 * inside the form, which the server checks. Its mode is set in Cloudflare's dashboard.
 */
export function ProposalTurnstile({ ref }: { ref: Ref<ProposalTurnstileHandle> }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | undefined>(undefined);
  const [scriptReady, setScriptReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
    },
  }));

  useEffect(() => {
    const api = window.turnstile;
    if (!scriptReady || !siteKey || !api || !containerRef.current) return;
    const widgetId = api.render(containerRef.current, {
      sitekey: siteKey,
      language: "es",
      size: "flexible",
      "error-callback": () => setFailed(true),
    });
    widgetIdRef.current = widgetId;
    return () => {
      if (widgetId) api.remove(widgetId);
      widgetIdRef.current = undefined;
    };
  }, [scriptReady, siteKey]);

  if (!siteKey) {
    return <p className="text-sm font-medium">{UNAVAILABLE}</p>;
  }

  return (
    <div className="space-y-1">
      <Script
        src={SCRIPT_URL}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setFailed(true)}
      />
      {/* The widget's height, so the page does not jump when it appears. */}
      <div ref={containerRef} className="min-h-[65px]" />
      {failed ? (
        <p role="alert" className="text-sm font-medium">
          <span aria-hidden="true">⚠︎ </span>
          {UNAVAILABLE}
        </p>
      ) : null}
    </div>
  );
}
