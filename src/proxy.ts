import { NextResponse, type NextRequest } from "next/server";
import { placeExists } from "@/modules/places/service";

/** The static page served, with HTTP 404, in place of an unknown or hidden site. */
const NOT_FOUND_PATH = "/sitio-no-encontrado";

/**
 * HU-69: an unknown or hidden site gets a real HTTP 404. The site page streams (its skeleton goes
 * out first) and the status can no longer change once streaming starts, so the check runs here,
 * before rendering, and the address stays the same for the visitor.
 */
export async function proxy(request: NextRequest) {
  const slug = decodeURIComponent(request.nextUrl.pathname.slice("/lugar/".length));
  try {
    if (await placeExists(slug)) return NextResponse.next();
  } catch {
    // Database trouble: let the page show its error and "Reintentar".
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

export const config = {
  matcher: "/lugar/:slug",
};
