import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
        <Logo />
        <nav aria-label="Principal" className="shrink-0">
          <Link
            href="/proponer"
            className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium whitespace-nowrap text-on-primary"
          >
            Proponer lugar
          </Link>
        </nav>
      </div>
    </header>
  );
}
