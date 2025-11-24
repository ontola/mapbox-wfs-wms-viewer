import proj4 from "proj4";

// Define EPSG:28992 (RD New - Dutch coordinate system) with RDNAPTRANS Helmert transformation
// These are the official transformation parameters for EPSG:28992 to ETRS89/WGS84
proj4.defs(
  "EPSG:28992",
  "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 " +
  "+x_0=155000 +y_0=463000 +ellps=bessel " +
  "+towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 " +
  "+units=m +no_defs"
);

/**
 * Transform a single coordinate from EPSG:28992 to EPSG:4326
 */
export function transformRDToWGS84(x: number, y: number): [number, number] {
  const result = proj4("EPSG:28992", "EPSG:4326", [x, y]);
  return [result[0], result[1]];
}

/**
 * Transform GeoJSON coordinates recursively
 */
function transformCoordinates(coords: any): any {
  if (typeof coords[0] === "number") {
    // This is a coordinate pair [x, y] or [x, y, z]
    const [x, y, ...rest] = coords;
    const [lng, lat] = transformRDToWGS84(x, y);
    return [lng, lat, ...rest];
  } else {
    // This is an array of coordinates
    return coords.map(transformCoordinates);
  }
}

/**
 * Transform GeoJSON from EPSG:28992 to EPSG:4326
 */
export function transformGeoJSONFromRD(geojson: any): any {
  console.log("🔄 Transforming GeoJSON from EPSG:28992 to EPSG:4326");

  // Deep clone to avoid mutating the original
  const transformed = JSON.parse(JSON.stringify(geojson));

  // Transform each feature's geometry
  if (transformed.type === "FeatureCollection") {
    transformed.features = transformed.features.map((feature: any) => {
      if (feature.geometry && feature.geometry.coordinates) {
        feature.geometry.coordinates = transformCoordinates(feature.geometry.coordinates);
      }
      return feature;
    });
    console.log(`✅ Transformed ${transformed.features.length} features`);
  } else if (transformed.type === "Feature") {
    if (transformed.geometry && transformed.geometry.coordinates) {
      transformed.geometry.coordinates = transformCoordinates(transformed.geometry.coordinates);
    }
    console.log("✅ Transformed 1 feature");
  }

  // Update CRS to EPSG:4326
  if (transformed.crs) {
    transformed.crs = {
      type: "name",
      properties: { name: "EPSG:4326" }
    };
  }

  return transformed;
}
