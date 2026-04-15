import { BoundsMatrix } from "../bounds";
import { LayerI } from "./LayerTypes";
import { transformGeoJSONFromRD } from "./rdTransform";

/**
 * Parses CSV text into a GeoJSON FeatureCollection
 * Supports both WGS84 (lat/lon) and RD (x/y) coordinates
 */
export function parseCsvToGeoJson(csvText: string): any {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return { type: "FeatureCollection", features: [] };

  // Simple CSV parser that handles quoted values
  const parseLine = (line: string) => {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
  
  // Find coordinate columns
  const lonIdx = headers.findIndex(h => ["longitude", "lon", "lng", "x", "rd_x", "rdx"].includes(h));
  const latIdx = headers.findIndex(h => ["latitude", "lat", "y", "rd_y", "rdy"].includes(h));

  if (lonIdx === -1 || latIdx === -1) {
    console.warn("Could not find coordinate columns in CSV. Headers:", headers);
    return { type: "FeatureCollection", features: [] };
  }

  const isRD = headers[lonIdx].startsWith("rd") || 
               (headers[lonIdx] === "x" && parseFloat(parseLine(lines[1])[lonIdx]) > 10000);

  const features = lines.slice(1).map(line => {
    const values = parseLine(line);
    const props: any = {};
    headers.forEach((h, i) => {
      props[h] = values[i];
    });

    const lon = parseFloat(values[lonIdx]);
    const lat = parseFloat(values[latIdx]);

    if (isNaN(lon) || isNaN(lat)) return null;

    return {
      type: "Feature",
      properties: props,
      geometry: {
        type: "Point",
        coordinates: [lon, lat]
      }
    };
  }).filter(f => f !== null);

  const geojson = {
    type: "FeatureCollection",
    features
  };

  if (isRD) {
    console.log("🔄 CSV contains RD coordinates, transforming...");
    return transformGeoJSONFromRD(geojson);
  }

  return geojson;
}

export function makeWfsUrl(layer: LayerI, bounds: BoundsMatrix) {
  const url = new URL(layer.url);

  // ESRI ArcGIS WFS services use WFS 2.0.0 and different parameter names
  const isEsriService = layer.url.includes("arcgis");

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
    const params: Record<string, string> = {
      SERVICE: "WFS",
      VERSION: "1.1.0",
      REQUEST: "GetFeature",
      outputFormat: "application/json",
      acceptsFormat: "application/json",
      typeNames: layer.id,
      srsName: "EPSG:28992", // Request native RD coordinates for client-side transformation
    };
    // Note: BBOX filtering is disabled because the data is in EPSG:28992 but our bounds are in EPSG:4326
    // Mapbox will handle the filtering client-side after transformation
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
    FORMAT_OPTIONS: "dpi:96",
    WIDTH: "1024",
    HEIGHT: "1024",
    STYLES: "",
    // We'll handle bbox separately to preserve the template
  };

  // Set parameters, overwriting existing ones to avoid duplicates
  Object.entries(params).forEach(([key, value]) => {
    // Check if the parameter already exists (case-insensitive)
    // If so, remove it first to ensure we use our casing and value
    const existingKey = Array.from(url.searchParams.keys()).find(
      (k) => k.toLowerCase() === key.toLowerCase(),
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
