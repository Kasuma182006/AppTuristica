import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold tracking-tight">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6 shrink-0 text-primary"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 20 6.5-11 4 6.5 2.5-4L21 20Z" />
        <circle cx="17" cy="5" r="1.5" />
      </svg>
      <span className="truncate">Buscador turístico</span>
    </Link>
  );
}
