import { describe, expect, it } from "vitest";
import { directionsFor } from "./directions";

const calima = {
  municipality: { slug: "calima", name: "Calima" },
  department: "Valle del Cauca",
  location: { lat: 3.892485, lng: -76.501984, approximate: false, radiusM: null },
};

const fragile = {
  municipality: { slug: "sevilla", name: "Sevilla" },
  department: "Valle del Cauca",
  location: { lat: 4.27, lng: -75.93, approximate: true, radiusM: 2000 },
};

describe("directionsFor", () => {
  it("routes to the coordinates of exact sites", () => {
    expect(directionsFor(calima)).toEqual({
      googleMaps: "https://www.google.com/maps/dir/?api=1&destination=3.892485%2C-76.501984",
      openStreetMap:
        "https://www.openstreetmap.org/?mlat=3.892485&mlon=-76.501984#map=16/3.892485/-76.501984",
      municipalityOnly: false,
    });
  });

  it("routes fragile sites only to their municipality, with department and country", () => {
    const directions = directionsFor(fragile);

    expect(directions).toEqual({
      googleMaps:
        "https://www.google.com/maps/dir/?api=1&destination=Sevilla%2C%20Valle%20del%20Cauca%2C%20Colombia",
      openStreetMap:
        "https://www.openstreetmap.org/search?query=Sevilla%2C%20Valle%20del%20Cauca%2C%20Colombia",
      municipalityOnly: true,
    });
    // Not even the approximate location.
    expect(JSON.stringify(directions)).not.toContain("4.27");
    expect(JSON.stringify(directions)).not.toContain("75.93");
  });

  it("encodes accented names", () => {
    const tulua = { ...fragile, municipality: { slug: "tulua", name: "Tuluá" } };
    expect(directionsFor(tulua).googleMaps).toContain("destination=Tulu%C3%A1%2C%20Valle");
  });
});
