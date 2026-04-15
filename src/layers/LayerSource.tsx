import { Layer, Source } from "react-map-gl";
import { LayerI } from "./LayerTypes";
import { BoundsMatrix } from "../bounds";
import { makeMapBoxLayer } from "./LayerStyles";
import { makeWfsUrl, makeWmsUrl, parseCsvToGeoJson } from "./utils";
import { bagLayerId } from "./LayerTypes";
import { boundsNL } from "./constants";
import { transformGeoJSONFromRD } from "./rdTransform";
import { useState, useEffect } from "react";

interface LayerSourceProps {
  layer: LayerI;
  bounds: BoundsMatrix | null;
}

export function LayerSource({ layer, bounds = boundsNL }: LayerSourceProps) {
  let mapBoxLayers = makeMapBoxLayer(layer);
  const effectiveBounds = bounds || boundsNL;
  const [geojsonData, setGeojsonData] = useState<any>(null);

  // For GeoJSON sources from ArcGIS, fetch and transform from EPSG:28992
  useEffect(() => {
    if (layer.type !== "raster") {
      // Check if it's a direct JSON file layer
      const isJsonLayer =
        layer.uniqueId?.startsWith("json-") ||
        layer.url?.includes("outputFormat=application/json") ||
        layer.url?.endsWith(".json") ||
        layer.url?.endsWith(".geojson") ||
        layer.url?.includes("f=geojson");

      // Check if it's a CSV layer
      const isCsvLayer =
        layer.uniqueId?.startsWith("csv-") ||
        layer.url?.toLowerCase().endsWith(".csv") ||
        layer.url?.toLowerCase().includes(".csv?");

      let wfsUrl = layer.url || "";

      if (!isJsonLayer && !isCsvLayer) {
        wfsUrl = makeWfsUrl(layer, effectiveBounds);
      } else if (
        !isCsvLayer && 
        (wfsUrl.includes("request=GetFeature") ||
        wfsUrl.includes("REQUEST=GetFeature"))
      ) {
        // Skip bbox filtering for JSON layers - the bbox would be in EPSG:4326 but the data
        // might be in EPSG:28992 (like Utrecht data), causing the filter to return empty results.
        // Mapbox will handle client-side filtering after coordinate transformation.
        // The bbox is already removed by makeWfsUrl in utils.ts for non-JSON WFS layers.
      }
      const isArcGIS = layer.url?.includes("arcgis");

      console.log(`📡 Fetching data for ${layer.name} from ${wfsUrl}`);

      fetch(wfsUrl)
        .then(async (response) => {
          if (isCsvLayer) {
            const text = await response.text();
            return parseCsvToGeoJson(text);
          } else {
            return response.json();
          }
        })
        .then((data) => {
          // Check if this is RD data that needs transformation
          const crsName = data.crs?.properties?.name;
          const isRD =
            crsName?.includes("28992") || crsName?.includes("EPSG::28992");

          // Ensure it's a valid GeoJSON FeatureCollection
          let finalData = data;
          if (Array.isArray(data)) {
            console.log(
              `🔄 Wrapping array in FeatureCollection for ${layer.name}`,
            );
            finalData = {
              type: "FeatureCollection",
              features: data.filter(
                (item) =>
                  item && typeof item === "object" && item.type === "Feature",
              ),
            };
          }

          if (isRD) {
            console.log(
              `🔄 Layer ${layer.name} is in EPSG:28992, transforming...`,
            );
            const transformed = transformGeoJSONFromRD(finalData);
            setGeojsonData(transformed);
          } else {
            console.log(`✅ Layer ${layer.name} is ready`);
            setGeojsonData(finalData);
          }
        })
        .catch((error) => {
          console.error(`❌ Error fetching data for ${layer.name}:`, error);
        });
    }
  }, [layer, effectiveBounds]);

  if (layer.type === "raster") {
    return (
      <Source
        type="raster"
        tileSize={512}
        bounds={effectiveBounds}
        tiles={[makeWmsUrl(layer)]}
        scheme="xyz"
      >
        {mapBoxLayers.map((mapBoxLayer) => (
          <Layer {...mapBoxLayer} key={mapBoxLayer.id} />
        ))}
      </Source>
    );
  }

  // For GeoJSON sources, wait for data to be fetched and potentially transformed
  if (!geojsonData) {
    return null;
  }

  return (
    <Source id={layer.id} type="geojson" data={geojsonData}>
      {mapBoxLayers.map((mapBoxLayer) => (
        <Layer {...mapBoxLayer} key={mapBoxLayer.id} />
      ))}
    </Source>
  );
}
