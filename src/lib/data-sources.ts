/** The RNT on datos.gov.co, as its own page asks to credit it (CC BY-SA 4.0, by MinCIT). */
export const RNT_SOURCE = {
  name: "Registro Nacional de Turismo (RNT)",
  author: "Ministerio de Comercio, Industria y Turismo",
  url: "https://www.datos.gov.co/d/thwd-ivmp",
  license: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.es",
} as const;

export interface DataSource {
  id: string;
  name: string;
  url: string;
  /** What this site takes from it. */
  use: string;
  license: { name: string; url: string };
}

/**
 * Every source of what the site shows (HU-90, RF-25), biggest first. Community contributions are
 * not here: they have no address to link to. Their license is on /terminos.
 */
export const DATA_SOURCES: readonly DataSource[] = [
  {
    id: "openstreetmap",
    name: "OpenStreetMap",
    url: "https://www.openstreetmap.org/",
    use: "Los sitios: nombre, tipo, ubicación y características. También los límites de los municipios.",
    license: {
      name: "Open Database License (ODbL) 1.0",
      url: "https://www.openstreetmap.org/copyright",
    },
  },
  {
    id: "wikidata",
    name: "Wikidata",
    url: "https://www.wikidata.org/",
    use: "La descripción corta en español de algunos sitios, siempre mostrada como de Wikidata, y el enlace a su foto y a su artículo.",
    license: {
      name: "CC0 (dominio público)",
      url: "https://www.wikidata.org/wiki/Wikidata:Licensing",
    },
  },
  {
    id: "commons",
    name: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/",
    use: "Las fotos de los sitios. Solo con licencias libres, y cada una muestra su autor y su licencia.",
    license: {
      name: "La de cada foto",
      url: "https://commons.wikimedia.org/wiki/Commons:Licensing",
    },
  },
  {
    id: "rnt",
    name: RNT_SOURCE.name,
    url: RNT_SOURCE.url,
    use: `Las agencias de turismo de cada municipio, publicadas en datos.gov.co por el ${RNT_SOURCE.author}.`,
    license: { name: RNT_SOURCE.license, url: RNT_SOURCE.licenseUrl },
  },
  {
    id: "openfreemap",
    name: "OpenFreeMap",
    url: "https://openfreemap.org/",
    use: "Las teselas de los mapas, hechas con OpenMapTiles a partir de datos de OpenStreetMap. La atribución aparece en cada mapa.",
    license: {
      name: "Datos de OpenStreetMap, ODbL",
      url: "https://www.openstreetmap.org/copyright",
    },
  },
];
