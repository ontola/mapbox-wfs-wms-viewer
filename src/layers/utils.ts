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
    bbox: "{bbox-epsg-3857}",
  };
  const queryString = Object.entries(params)
    .map(([key, value]) =>
      key.toLowerCase() === "bbox"
        ? `${key}=${value}`
        : `${key}=${encodeURIComponent(value)}`
    )
    .join("&");
  return `${layer.url}?${queryString}`;
}

export function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 256;
  return `hsl(${h}, 90%, 50%)`;
}
