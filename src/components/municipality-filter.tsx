"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import type { FilterOption } from "@/modules/places/types";
import {
  matchByWordStart,
  moveActive,
  normalizeForSearch,
  placeCountLabel,
} from "./municipality-search";
import { useFilterValue, useInitialValue } from "./filter-panel-state";

/** URL parameter of the Lugar filter. */
const PARAM = "lugar";

const fieldClass =
  "h-11 w-full rounded-md border border-border bg-bg px-3 text-base text-fg placeholder:text-muted";

interface Props {
  options: FilterOption[];
  /** The municipality's slug in the address. */
  initial?: string;
}

/**
 * Lugar filter (HU-44): one municipality with autocomplete, as an ARIA combobox (WAI-ARIA APG
 * "list autocomplete"). Needs JavaScript, like the rest of the search (decided in HU-44).
 */
export function MunicipalityFilter({ options, initial: fromAddress }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const initial = useInitialValue(fromAddress);
  // Starts with the municipality in the address (HU-51), if it exists.
  const [selected, setSelected] = useState(() => options.find((o) => o.slug === initial));
  const [query, setQuery] = useState(selected?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  useFilterValue(PARAM, selected?.slug ?? "");

  // With a choice made, reopening shows every municipality, not just the chosen one.
  const suggestions = selected ? options : matchByWordStart(options, query);
  const activeOption = open ? suggestions[active] : undefined;

  function choose(option: FilterOption) {
    setSelected(option);
    setQuery(option.name);
    setOpen(false);
    setActive(-1);
  }

  function clear() {
    setSelected(undefined);
    setQuery("");
    setActive(-1);
  }

  /** Only catalog values: an exact name is accepted, anything else is discarded. */
  function settle() {
    setOpen(false);
    setActive(-1);
    if (selected) {
      setQuery(selected.name);
      return;
    }
    const exact = options.find(
      (option) => normalizeForSearch(option.name) === normalizeForSearch(query),
    );
    if (exact) choose(exact);
    else setQuery("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        setOpen(true);
        setActive(moveActive(active, event.key === "ArrowDown" ? 1 : -1, suggestions.length));
        break;
      case "Enter":
        // Picks the highlighted suggestion instead of submitting the form.
        if (activeOption) {
          event.preventDefault();
          choose(activeOption);
        }
        break;
      case "Escape":
        if (open) setOpen(false);
        else clear();
        break;
    }
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-medium">
        Lugar
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          placeholder="Escribe un municipio"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-describedby={hintId}
          aria-activedescendant={activeOption ? `${listId}-${activeOption.slug}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(undefined);
            setOpen(true);
            setActive(event.target.value.trim() ? 0 : -1);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onBlur={settle}
          onKeyDown={onKeyDown}
          className={`${fieldClass} ${selected ? "pr-11" : ""}`}
        />
        {selected ? (
          <button
            type="button"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            aria-label={`Quitar ${selected.name}`}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-xl text-muted hover:text-fg"
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
        <ul
          id={listId}
          role="listbox"
          aria-label="Municipios"
          hidden={!open}
          className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          {suggestions.map((option, index) => (
            <li
              key={option.slug}
              id={`${listId}-${option.slug}`}
              role="option"
              aria-selected={index === active}
              // Keeps focus in the input, so blur does not discard the click.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseMove={() => setActive(index)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 ${
                index === active ? "bg-primary text-on-primary" : ""
              }`}
            >
              <span>{option.name}</span>
              <span
                className={`shrink-0 text-sm ${index === active ? "text-on-primary" : "text-muted"}`}
              >
                {placeCountLabel(option.placeCount)}
              </span>
            </li>
          ))}
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-muted">Ningún municipio coincide.</li>
          ) : null}
        </ul>
      </div>
      <p id={hintId} className="sr-only">
        Escribe para ver sugerencias; usa las flechas y Enter para elegir.
      </p>
      <p aria-live="polite" className="sr-only">
        {open ? `${suggestions.length} municipios` : ""}
      </p>
      {selected ? <input type="hidden" name={PARAM} value={selected.slug} /> : null}
    </div>
  );
}
