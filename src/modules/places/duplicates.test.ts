import { describe, expect, it } from "vitest";
import { approximateLocation, roundCoordinate } from "@/lib/geo";
import type { NearbyPlaceRow } from "./repository";
import { possibleDuplicates } from "./service";

const row = (
  name: string,
  lat: number,
  lng: number,
  sensitivity: NearbyPlaceRow["sensitivity"] = "normal",
): NearbyPlaceRow => ({
  slug: name.toLowerCase().replaceAll(" ", "-"),
  name,
  sensitivity,
  location: { lat, lng },
});

const METERS_PER_DEGREE = 111_195;
const north = (lat: number, meters: number) => lat + meters / METERS_PER_DEGREE;

describe("possibleDuplicates: normal sites", () => {
  const site = row("Charco del Burro", 3.65, -76.69);

  it("warns about a similar name closer than 200 m", () => {
    const point = { lat: north(3.65, 150), lon: -76.69 };
    expect(possibleDuplicates([site], point, "Charco el Burro")).toEqual([
      { slug: "charco-del-burro", name: "Charco del Burro" },
    ]);
  });

  it("does not warn at 200 m or more", () => {
    const point = { lat: north(3.65, 250), lon: -76.69 };
    expect(possibleDuplicates([site], point, "Charco del Burro")).toEqual([]);
  });

  it("does not warn about a different name, however close", () => {
    expect(possibleDuplicates([site], { lat: 3.65, lon: -76.69 }, "Mirador Alto")).toEqual([]);
  });

  it("gives the nearest first", () => {
    const far = row("Charco del Burro Alto", north(3.65, 180), -76.69);
    const near = row("Charco del Burro Bajo", north(3.65, 20), -76.69);
    const found = possibleDuplicates([far, near], { lat: 3.65, lon: -76.69 }, "Charco del Burro");
    expect(found.map((place) => place.slug)).toEqual([
      "charco-del-burro-bajo",
      "charco-del-burro-alto",
    ]);
  });
});

describe("possibleDuplicates: fragile sites never reveal their exact point", () => {
  // A cell center of the 0.02° grid, and two exact points in opposite corners of that cell.
  const center = approximateLocation({ lat: 3.865, lng: -76.365 });
  const corner = (dLat: number, dLng: number) => ({
    lat: roundCoordinate(center.lat + dLat),
    lng: roundCoordinate(center.lng + dLng),
  });
  const placedAt = ({ lat, lng }: { lat: number; lng: number }) =>
    row("Laguna Escondida", lat, lng, "fragile");
  const inOneCorner = placedAt(corner(0.0099, 0.0099));
  const inOtherCorner = placedAt(corner(-0.0099, -0.0099));

  it("starts from two exact points in the same public area", () => {
    expect(approximateLocation(inOneCorner.location)).toEqual(center);
    expect(approximateLocation(inOtherCorner.location)).toEqual(center);
  });

  // Every distance from the center, in both directions, up to well past the 2 km area.
  const distances = Array.from({ length: 41 }, (_, step) => (step - 20) * 150);

  it("answers the same wherever the exact point is inside its public area", () => {
    for (const meters of distances) {
      const point = { lat: north(center.lat, meters), lon: center.lng };
      expect(possibleDuplicates([inOneCorner], point, "Laguna Escondida")).toEqual(
        possibleDuplicates([inOtherCorner], point, "Laguna Escondida"),
      );
    }
  });

  it("warns within 2 km of the area's center", () => {
    const point = { lat: north(center.lat, 1900), lon: center.lng };
    expect(possibleDuplicates([inOneCorner], point, "Laguna Escondida")).toHaveLength(1);
  });

  it("does not warn past 2 km from the center, even with the exact point close by", () => {
    // Just past the area on the corner's side: the exact point is about 1.5 km from here.
    const point = { lat: north(center.lat, 2100), lon: center.lng };
    expect(possibleDuplicates([inOneCorner], point, "Laguna Escondida")).toEqual([]);
  });
});
