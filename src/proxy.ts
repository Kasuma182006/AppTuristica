import { NextResponse, type NextRequest } from "next/server";
import { placePath } from "@/lib/routes";
import { getMunicipality } from "@/modules/catalogs/service";
import { placeExists } from "@/modules/places/service";

/** The static page served, with HTTP 404, in place of an unknown or hidden site. */
const NOT_FOUND_PATH = "/sitio-no-encontrado";

/**
 * HU-69: an unknown or hidden site gets a real HTTP 404. The site and municipality pages stream
 * (their skeleton goes out first) and the status can no longer change once streaming starts, so
 * the check runs here, before rendering, and the address stays the same for the visitor.
 * HU-70: /lugar/{slug} is a municipality page; site pages moved from there to /sitio/{slug}, so an
 * old site address is redirected. A municipality wins over a site with the same slug.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const [, section = "", slug = ""] = pathname.split("/");
  try {
    if (section === "sitio") {
      if (await placeExists(slug)) return NextResponse.next();
    } else {
      if (await getMunicipality(slug)) return NextResponse.next();
      if (await placeExists(slug)) {
        return NextResponse.redirect(new URL(placePath(slug) + search, request.url), 308);
      }
    }
  } catch {
    // Database trouble: let the page show its error and "Reintentar".
    return NextResponse.next();
  }
  return NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url));
}

export const config = {
  matcher: ["/lugar/:slug", "/sitio/:slug"],
};
