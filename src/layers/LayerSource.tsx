import { Layer, Source } from "react-map-gl";
import { LayerI } from "./LayerTypes";
import { BoundsMatrix } from "../bounds";
import { makeMapBoxLayer } from "./LayerStyles";
import { makeWfsUrl, makeWmsUrl, parseCsvToGeoJson } from "./utils";
import { bagLayerId } from "./LayerTypes";
import { boundsNL } from "./constants";
import { transformGeoJSONFromRD } from "./rdTransform";
import { useState, useEffect, useRef } from "react";

interface LayerSourceProps {
  layer: LayerI;
  bounds: BoundsMatrix | null;
  onLoadingChange?: (layerId: string, loading: boolean) => void;
}

export function LayerSource({ layer, bounds = boundsNL, onLoadingChange }: LayerSourceProps) {
  let mapBoxLayers = makeMapBoxLayer(layer);
  const effectiveBounds = bounds || boundsNL;
  const [geojsonData, setGeojsonData] = useState<any>(null);
  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  const notifyLoading = (isLoading: boolean) => {
    const id = layer.uniqueId || layer.id;
    onLoadingChangeRef.current?.(id, isLoading);
  };

  const boundsRef = useRef(effectiveBounds);
  boundsRef.current = effectiveBounds;

  const layerUrl = layer.url;
  const layerId = layer.uniqueId || layer.id;

  useEffect(() => {
    if (layer.type === "raster") return;

    const hasJsonOutput = layerUrl?.includes("outputFormat=application/json") || layerUrl?.includes("f=geojson");
    const hasGetFeature = layerUrl?.includes("request=GetFeature") || layerUrl?.includes("REQUEST=GetFeature");
    const isArcGIS = layerUrl?.includes("/query?") && layerUrl?.includes("f=geojson");
    const isJsonLayer =
      layer.uniqueId?.startsWith("json-") ||
      layerUrl?.endsWith(".json") ||
      layerUrl?.endsWith(".geojson") ||
      isArcGIS ||
      (hasJsonOutput && hasGetFeature);

    const isCsvLayer =
      layer.uniqueId?.startsWith("csv-") ||
      layerUrl?.toLowerCase().endsWith(".csv") ||
      layerUrl?.toLowerCase().includes(".csv?");

    let wfsUrl = layerUrl || "";

    if (!isJsonLayer && !isCsvLayer) {
      wfsUrl = makeWfsUrl(layer, boundsRef.current);
    }

    console.log(`📡 Fetching data for ${layer.name} from ${wfsUrl}`);

    let cancelled = false;
    notifyLoading(true);

    const fetchAllData = async (): Promise<any> => {
      if (isCsvLayer) {
        const response = await fetch(wfsUrl);
        const text = await response.text();
        return parseCsvToGeoJson(text);
      }

      if (isArcGIS) {
        const allFeatures: any[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          if (cancelled) return null;
          const pagedUrl = `${wfsUrl}&resultOffset=${offset}`;
          const response = await fetch(pagedUrl);
          const data = await response.json();
          const features = data.features || [];
          allFeatures.push(...features);
          const exceeded = data.exceededTransferLimit === true || data.properties?.exceededTransferLimit === true;
          hasMore = exceeded && features.length > 0;
          offset += features.length;
          if (hasMore) {
            console.log(`📡 Fetched ${allFeatures.length} features so far for ${layer.name}...`);
          }
        }

        console.log(`✅ Fetched ${allFeatures.length} total features for ${layer.name}`);
        return { type: "FeatureCollection", features: allFeatures };
      }

      const response = await fetch(wfsUrl);
      return response.json();
    };

    fetchAllData()
      .then((data) => {
        if (cancelled || !data) return;
        const crsName = data.crs?.properties?.name;
        const isRD =
          crsName?.includes("28992") || crsName?.includes("EPSG::28992");

        let finalData = data;
        if (Array.isArray(data)) {
          finalData = {
            type: "FeatureCollection",
            features: data.filter(
              (item) =>
                item && typeof item === "object" && item.type === "Feature",
            ),
          };
        }

        if (isRD) {
          const transformed = transformGeoJSONFromRD(finalData);
          setGeojsonData(transformed);
        } else {
          setGeojsonData(finalData);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(`❌ Error fetching data for ${layer.name}:`, error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          notifyLoading(false);
        }
      });

    return () => {
      cancelled = true;
      notifyLoading(false);
    };
  }, [layerId, layerUrl]);

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
