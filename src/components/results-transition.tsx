"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";

interface NavigateOptions {
  /** Replace the history entry (filters, order) instead of adding one (pages). */
  replace?: boolean;
  scroll?: boolean;
}

type Navigate = (href: string, options?: NavigateOptions) => void;

interface ResultsTransitionState {
  /** True while the results of a new address load. */
  pending: boolean;
  navigate: Navigate;
}

const ResultsTransitionContext = createContext<ResultsTransitionState | null>(null);

/**
 * Wraps /explorar so every change of filters, order or page (HU-51 to HU-55) runs in one
 * Transition: the current results stay visible, dimmed, until the new ones arrive (HU-56).
 */
export function ResultsTransition({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = useCallback<Navigate>(
    (href, { replace = false, scroll = true } = {}) =>
      startTransition(() => {
        if (replace) router.replace(href, { scroll });
        else router.push(href, { scroll });
      }),
    [router],
  );

  const state = useMemo(() => ({ pending, navigate }), [pending, navigate]);
  return <ResultsTransitionContext value={state}>{children}</ResultsTransitionContext>;
}

/**
 * Navigates inside the results Transition when there is one (outside /explorar, directly).
 * Stable while the results load, so callers' effects do not run again.
 */
export function useResultsNavigate(): Navigate {
  const inTransition = useContext(ResultsTransitionContext)?.navigate;
  const router = useRouter();
  return useCallback<Navigate>(
    (href, options = {}) => {
      if (inTransition) return inTransition(href, options);
      if (options.replace) router.replace(href, { scroll: options.scroll });
      else router.push(href, { scroll: options.scroll });
    },
    [inTransition, router],
  );
}

/**
 * The results while they update: dimmed and marked busy, with a "Actualizando…" notice that
 * stays in view without moving the page.
 */
export function ResultsRegion({ children }: { children: ReactNode }) {
  const pending = useContext(ResultsTransitionContext)?.pending ?? false;
  return (
    <div aria-busy={pending} className="relative space-y-3">
      <div
        role="status"
        className="pointer-events-none sticky top-4 z-10 flex h-0 items-start justify-center overflow-visible"
      >
        {pending ? (
          <span className="mt-12 rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-lg">
            Actualizando…
          </span>
        ) : null}
      </div>
      <div className={`space-y-3 transition-opacity ${pending ? "opacity-50" : ""}`}>
        {children}
      </div>
    </div>
  );
}

type LinkProps = ComponentProps<typeof Link> & { href: string; replace?: boolean };

/** A link whose navigation dims the results while they load, like the panel's changes. */
export function ResultsLink({ href, replace, scroll, onClick, ...props }: LinkProps) {
  const navigate = useResultsNavigate();
  return (
    <Link
      {...props}
      href={href}
      replace={replace}
      scroll={scroll}
      prefetch={false}
      onClick={(event) => {
        onClick?.(event);
        // New tabs and windows keep the browser's own behavior.
        const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
        if (event.defaultPrevented || modified || event.button !== 0) return;
        event.preventDefault();
        navigate(href, { replace, scroll: scroll ?? true });
      }}
    />
  );
}
