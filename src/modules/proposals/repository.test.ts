import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { insertPlaceStatement, isUniqueViolation, type NewCommunityPlace } from "./repository";

const withCode = (code: string) => Object.assign(new Error("database"), { code });

describe("isUniqueViolation", () => {
  it("finds the code in the error or in what caused it", () => {
    expect(isUniqueViolation(withCode("23505"))).toBe(true);
    expect(isUniqueViolation(new Error("Failed query", { cause: withCode("23505") }))).toBe(true);
  });

  it("does not take other errors for it", () => {
    // The trigger that rejects a point outside the municipality.
    expect(isUniqueViolation(withCode("23514"))).toBe(false);
    expect(isUniqueViolation(new Error("network down"))).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });
});

describe("insertPlaceStatement", () => {
  const place: NewCommunityPlace = {
    name: "Charco del Burro",
    placeTypeSlug: "rio",
    activitySlugs: ["camping", "fotografia"],
    municipalitySlug: "dagua",
    municipalityId: 7,
    location: { lat: 3.65, lng: -76.69 },
    description: "Pozo de agua fría rodeado de bosque.",
    cost: "free",
    sensitivity: "fragile",
    confidence: 40,
  };
  const { sql, params } = new PgDialect().sqlToQuery(
    insertPlaceStatement(place, "charco-del-burro-dagua"),
  );

  it("saves the site, its activities and its source in a single statement", () => {
    expect(sql.match(/INSERT INTO/g)).toHaveLength(3);
    expect(sql).toContain("INSERT INTO places");
    expect(sql).toContain("INSERT INTO place_activities");
    expect(sql).toContain("INSERT INTO place_sources");
    expect(sql).not.toMatch(/;\s*\S/);
  });

  it("always marks it as a community site", () => {
    expect(sql).toContain("'community',");
    expect(sql).toContain("SELECT created.id, 'community' FROM created");
  });

  it("sends what was written as parameters, never inside the SQL", () => {
    expect(params).toEqual([
      "charco-del-burro-dagua",
      "Charco del Burro",
      "rio",
      7,
      -76.69,
      3.65,
      "Pozo de agua fría rodeado de bosque.",
      "free",
      "fragile",
      40,
      '["camping","fotografia"]',
    ]);
    expect(sql).not.toContain("Charco del Burro");
  });
});
