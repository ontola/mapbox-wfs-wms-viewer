import { Layer, Source } from "react-map-gl";
import { LayerI } from "./LayerTypes";
import { BoundsMatrix } from "../bounds";
import { makeMapBoxLayer } from "./LayerStyles";
import { makeWfsUrl, makeWmsUrl } from "./utils";
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
      const isJsonLayer = layer.uniqueId?.startsWith('json-');
      const wfsUrl = isJsonLayer && layer.url ? layer.url : makeWfsUrl(layer, effectiveBounds);
      const isArcGIS = layer.url?.includes("arcgis");

      console.log(`📡 Fetching data for ${layer.name} from ${wfsUrl}`);

      fetch(wfsUrl)
        .then((response) => response.json())
        .then((data) => {
          // Check if this is RD data that needs transformation
          const crsName = data.crs?.properties?.name;
          const isRD =
            crsName?.includes("28992") || crsName?.includes("EPSG::28992");

          if (isArcGIS && isRD) {
            console.log(
              `🔄 Layer ${layer.name} is in EPSG:28992, transforming...`,
            );
            const transformed = transformGeoJSONFromRD(data);
            setGeojsonData(transformed);
          } else {
            console.log(`✅ Layer ${layer.name} is ready`);
            setGeojsonData(data);
          }
        })
        .catch((error) => {
          console.error(`❌ Error fetching data for ${layer.name}:`, error);
        });
    }
  }, [layer, effectiveBounds]);

  if (layer.type == "raster") {
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
