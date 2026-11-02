import { expect, it } from "vitest";
import { SITE_URL } from "@/lib/site";
import robots from "./robots";

it("blocks only the API and points to the sitemap (HU-72)", () => {
  expect(robots()).toEqual({
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  });
});
