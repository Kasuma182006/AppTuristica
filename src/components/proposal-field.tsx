import type { ProposalField } from "@/modules/proposals/schemas";

export const fieldClass = "w-full rounded-md border bg-bg px-3 text-base text-fg";

/** A field with a problem also says so in words below it: color is never the only sign. */
export const borderClass = (error: string | undefined) =>
  error ? "border-accent" : "border-border";

export const fieldId = (field: ProposalField) => `propuesta-${field}`;

export const errorId = (field: ProposalField) => `propuesta-${field}-error`;

export function FieldLabel({ field, children }: { field: ProposalField; children: string }) {
  return (
    <label htmlFor={fieldId(field)} className="block font-medium">
      {children} <span aria-hidden="true">*</span>
    </label>
  );
}

export function FieldError({
  field,
  message,
}: {
  field: ProposalField;
  message: string | undefined;
}) {
  if (!message) return null;
  return (
    <p id={errorId(field)} className="text-sm font-medium text-fg">
      <span aria-hidden="true">⚠︎ </span>
      {message}
    </p>
  );
}
