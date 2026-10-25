// Field normalization for RNT agencies (HU-32). Only businesses keep their contact data: an
// agency registered by a natural person has their own phone and email (CLAUDE.md: no personal
// data in the MVP), so it is saved with its name, RNT number and municipality only.

/** Subcategories imported: wholesalers sell to other agencies, not to visitors. */
export const AGENCY_SUBCATEGORIES: readonly string[] = [
  "AGENCIA DE VIAJES Y DE TURISMO",
  "AGENCIA DE VIAJES OPERADORAS",
];

/** A company NIT: nine digits starting with 8 or 9. A natural person's NIT is their cédula. */
export function isCompanyNit(nit: string | undefined): boolean {
  return /^[89]\d{8}$/.test((nit ?? "").replace(/\D/g, ""));
}

// Fixed lines in Valle del Cauca have dialed 602 + seven digits since 2021.
const VALLE_FIXED_PREFIX = "602";

/** A phone as ten digits (mobile 3…, fixed 60…), completing old seven-digit fixed lines; else null. */
function phoneOf(value: string | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "");
  if (/^(3\d{9}|60\d{8})$/.test(digits)) return digits;
  if (/^\d{7}$/.test(digits)) return VALLE_FIXED_PREFIX + digits;
  return null;
}

/** The first valid phone, mobile field first (the RNT's fixed-line field is often "Sin dato"). */
export function normalizePhone(
  mobile: string | undefined,
  fixed: string | undefined,
): string | null {
  return phoneOf(mobile) ?? phoneOf(fixed);
}

// Same rule as the agencies_email_format check.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(value: string | undefined): string | null {
  const email = (value ?? "").trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

// Lowercase inside a name, except as its first word. Not "e", "o" or "u": in RNT names they are
// usually initials ("J E TOURS").
const CONNECTORS: ReadonlySet<string> = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "en",
  "para",
  "por",
  "y",
]);
// Company types, kept uppercase: "SAS", "LTDA", "SA."
const COMPANY_TYPES: ReadonlySet<string> = new Set(["sas", "sa", "ltda", "eu"]);

function capitalize(word: string): string {
  // Also after "&", "-", "(" or "/": "c&d" → "C&D".
  return word.replace(
    /(^|[&\-(/])(\p{L})/gu,
    (_, before: string, letter: string) => before + letter.toLocaleUpperCase("es"),
  );
}

function formatWord(word: string, index: number): string {
  const lower = word.toLocaleLowerCase("es");
  if (COMPANY_TYPES.has(lower.replace(/\.$/, ""))) return word.toLocaleUpperCase("es");
  // Initials such as "S.A.S." or "A.M.T." stay uppercase.
  if (/^(\p{L}\.)+\p{L}?\.?$/u.test(word)) return word.toLocaleUpperCase("es");
  // Web addresses: "COLOMBIAVIAJA.COM" → "colombiaviaja.com".
  if (/\.(com|co|net|org)$/.test(lower)) return lower;
  if (index > 0 && CONNECTORS.has(lower)) return lower;
  return capitalize(lower);
}

/** Title case for RNT names, which come in uppercase: "VIAJES CIRCULAR SAS" → "Viajes Circular SAS". */
export function titleCaseName(name: string): string {
  return name.trim().split(/\s+/).map(formatWord).join(" ");
}
