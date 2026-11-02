import { describe, expect, it } from "vitest";
import { shareDataFor } from "./share";

describe("shareDataFor", () => {
  const calima = {
    slug: "embalse-de-calima",
    name: "Embalse de Calima",
    municipality: { slug: "calima", name: "Calima" },
  };

  it("shares the production address of the site page", () => {
    expect(shareDataFor(calima)).toEqual({
      url: "https://app-turistica.vercel.app/lugar/embalse-de-calima",
      title: "Embalse de Calima",
      text: "Embalse de Calima, Calima",
      whatsapp:
        "https://wa.me/?text=Embalse%20de%20Calima%2C%20Calima%3A%20https%3A%2F%2Fapp-turistica.vercel.app%2Flugar%2Fembalse-de-calima",
    });
  });

  it("encodes accents and symbols in the WhatsApp message", () => {
    const tulua = {
      slug: "rio-tulua-tulua",
      name: "Río Tuluá & Co",
      municipality: { slug: "tulua", name: "Tuluá" },
    };
    const message = new URL(shareDataFor(tulua).whatsapp).searchParams.get("text");

    expect(message).toBe(
      "Río Tuluá & Co, Tuluá: https://app-turistica.vercel.app/lugar/rio-tulua-tulua",
    );
  });
});
