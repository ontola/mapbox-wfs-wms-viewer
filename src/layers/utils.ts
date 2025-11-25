import { BoundsMatrix } from "../bounds";
import { LayerI } from "./LayerTypes";

export function makeWfsUrl(layer: LayerI, bounds: BoundsMatrix) {
  const url = new URL(layer.url);

  // ESRI ArcGIS WFS services use WFS 2.0.0 and different parameter names
  const isEsriService = layer.url.includes('arcgis');

  if (isEsriService) {
    const params = {
      SERVICE: "WFS",
      VERSION: "2.0.0",
      REQUEST: "GetFeature",
      OUTPUTFORMAT: "GEOJSON",
      TYPENAMES: layer.id,
      SRSNAME: "urn:ogc:def:crs:EPSG::28992", // Request native RD coordinates for client-side transformation
      // Note: BBOX filtering seems to not work correctly with this service
      // Mapbox will handle the filtering client-side
    };
    url.search = new URLSearchParams(params).toString();
  } else {
    const params = {
      SERVICE: "WFS",
      VERSION: "1.1.0",
      REQUEST: "GetFeature",
      outputFormat: "application/json",
      acceptsFormat: "application/json",
      typeNames: layer.id,
      srsName: "EPSG:4326",
      bbox: `${bounds.join(",")}${
        layer.url.includes("utrecht") ? ",EPSG:4326" : ""
      }`,
    };
    url.search = new URLSearchParams(params).toString();
  }

  return url.toString();
}

export function makeWmsUrl(layer: LayerI) {
  const url = new URL(layer.url);

  const params = {
    SERVICE: "WMS",
    VERSION: "1.3.0",
    REQUEST: "GetMap",
    FORMAT: "image/png",
    TRANSPARENT: "true",
    LAYERS: layer.id,
    DPI: "113",
    CRS: "EPSG:3857",
    FORMAT_OPTIONS: "dpi:113",
    WIDTH: "1000",
    HEIGHT: "1000",
    STYLES: "",
    // We'll handle bbox separately to preserve the template
  };

  // Set parameters, overwriting existing ones to avoid duplicates
  Object.entries(params).forEach(([key, value]) => {
    // Check if the parameter already exists (case-insensitive)
    // If so, remove it first to ensure we use our casing and value
    const existingKey = Array.from(url.searchParams.keys()).find(
      k => k.toLowerCase() === key.toLowerCase()
    );
    if (existingKey) {
      url.searchParams.delete(existingKey);
    }
    url.searchParams.set(key, value);
  });

  // Handle bbox specially
  // Mapbox expects {bbox-epsg-3857} which URLSearchParams would encode
  // We'll add a placeholder and then replace it in the string
  url.searchParams.set("bbox", "BBOX_PLACEHOLDER");

  let urlString = url.toString();

  // Replace the placeholder with the unencoded template
  return urlString.replace("BBOX_PLACEHOLDER", "{bbox-epsg-3857}");
}

export function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 256;
  return `hsl(${h}, 90%, 50%)`;
}
