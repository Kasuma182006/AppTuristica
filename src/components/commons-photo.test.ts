import { describe, expect, it } from "vitest";
import { commonsThumbUrl, displayAuthor } from "./commons-photo";

const file =
  "https://upload.wikimedia.org/wikipedia/commons/1/14/Lago_Calima.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo";

describe("commonsThumbUrl", () => {
  it("asks for the smallest allowed width that covers the request", () => {
    expect(commonsThumbUrl(file, 300, 1280)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Lago_Calima.jpg/330px-Lago_Calima.jpg",
    );
    expect(commonsThumbUrl(file, 400, 1280)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Lago_Calima.jpg/500px-Lago_Calima.jpg",
    );
  });

  it("never asks for more than the largest allowed width", () => {
    expect(commonsThumbUrl(file, 1920, 3000)).toContain("/500px-Lago_Calima.jpg");
  });

  it("uses the file itself, without tracking parameters, when it is already small", () => {
    expect(commonsThumbUrl(file, 500, 480)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/1/14/Lago_Calima.jpg",
    );
  });

  it("keeps encoded names", () => {
    const encoded =
      "https://upload.wikimedia.org/wikipedia/commons/0/02/Ciclomonta%C3%B1ismo_a_orillas_del_Lago_Calima.JPG";
    expect(commonsThumbUrl(encoded, 330, 3648)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Ciclomonta%C3%B1ismo_a_orillas_del_Lago_Calima.JPG/330px-Ciclomonta%C3%B1ismo_a_orillas_del_Lago_Calima.JPG",
    );
  });

  it("leaves other images alone", () => {
    expect(commonsThumbUrl("https://example.org/a.jpg?x=1", 330, null)).toBe(
      "https://example.org/a.jpg",
    );
    const svg = "https://upload.wikimedia.org/wikipedia/commons/a/ab/Map.svg";
    expect(commonsThumbUrl(svg, 330, 1000)).toBe(svg);
  });
});

describe("displayAuthor", () => {
  it("keeps the name Commons assumed", () => {
    expect(
      displayAuthor(
        "No machine-readable author provided. Chilangoco assumed (based on copyright claims).",
      ),
    ).toBe("Chilangoco");
  });

  it("leaves real names as they are", () => {
    expect(displayAuthor("Alejandro Bayer Tamayo from Armenia, Colombia")).toBe(
      "Alejandro Bayer Tamayo from Armenia, Colombia",
    );
  });
});
