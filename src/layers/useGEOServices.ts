import { useState, useEffect, useMemo } from "react";
import { LayerI, Service } from "./LayerTypes";
import {
  isArcGISWfsUrl,
  getFeatureServiceUrl,
  findLayerIdByName,
  fetchArcGISLayerMetadata,
} from "./arcgis";
import {
  fetchCapabilities,
  parseWFSCapabilities,
  parseWMSCapabilities,
} from "./capabilities";
import bbox from "@turf/bbox";
import { transformRDToWGS84 } from "./rdTransform";

interface ServiceResult {
  layers: LayerI[];
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook to manage all WFS and WMS services in one place
 * This avoids the React hooks order issue by ensuring a fixed number of hooks
 */
export function useAllServices(
  services: Service[],
  serviceUpdateCounter: number = 0
): {
  allLayers: LayerI[];
  isLoading: boolean;
  errors: Error[];
} {
  // Filter services by type using useMemo to prevent infinite loop
  const wfsServices = useMemo(
    () => services.filter((s) => s.type === "WFS"),
    [services, serviceUpdateCounter]
  );
  const wmsServices = useMemo(
    () => services.filter((s) => s.type === "WMS"),
    [services, serviceUpdateCounter]
  );
  const jsonServices = useMemo(
    () => services.filter((s) => s.type === "JSON"),
    [services, serviceUpdateCounter]
  );
  const csvServices = useMemo(
    () => services.filter((s) => s.type === "CSV"),
    [services, serviceUpdateCounter]
  );
  const arcgisServices = useMemo(
    () => services.filter((s) => s.type === "ArcGIS_FeatureServer"),
    [services, serviceUpdateCounter]
  );

  const [allLayers, setAllLayers] = useState<LayerI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Error[]>([]);

  // Use refs to store service data
  const [wfsResults, setWfsResults] = useState<ServiceResult[]>([]);
  const [wmsResults, setWmsResults] = useState<ServiceResult[]>([]);
  const [jsonResults, setJsonResults] = useState<ServiceResult[]>([]);
  const [csvResults, setCsvResults] = useState<ServiceResult[]>([]);
  const [arcgisResults, setArcgisResults] = useState<ServiceResult[]>([]);

  // Fetch both WFS and WMS services in parallel
  useEffect(() => {
    // Start both fetches in parallel
    const fetchAllServices = async () => {
      // Start WMS services first as they typically take longer
      const wmsPromise = fetchWmsServices();
      const wfsPromise = fetchWfsServices();
      const jsonPromise = fetchJsonServices();
      const csvPromise = fetchCsvServices();
      const arcgisPromise = fetchArcgisServices();

      // Wait for both to complete
      await Promise.all([wmsPromise, wfsPromise, jsonPromise, csvPromise, arcgisPromise]);
    };

    // Function to fetch ArcGIS FeatureServer services
    const fetchArcgisServices = async () => {
      if (arcgisServices.length === 0) {
        setArcgisResults([]);
        return;
      }

      const servicePromises = arcgisServices.map(async (service) => {
        try {
          const response = await fetch(`${service.url}?f=json`);
          if (!response.ok) throw new Error("Failed to fetch ArcGIS metadata");
          
          const data = await response.json();
          
          if (!data.layers) {
            throw new Error("No layers found in ArcGIS service");
          }

          // Extract bounds from fullExtent if available
          let bounds: [number, number, number, number] | undefined;
          const ext = data.fullExtent || data.initialExtent;
          if (ext) {
            const isRD = ext.spatialReference?.wkid === 28992 || ext.spatialReference?.latestWkid === 28992;
            if (isRD) {
              const sw = transformRDToWGS84(ext.xmin, ext.ymin);
              const ne = transformRDToWGS84(ext.xmax, ext.ymax);
              bounds = [sw[0], sw[1], ne[0], ne[1]];
            } else {
              bounds = [ext.xmin, ext.ymin, ext.xmax, ext.ymax];
            }
          }

          const layers: LayerI[] = data.layers.map((l: any) => {
            const layerUrl = `${service.url}/${l.id}/query?where=1=1&outFields=*&f=geojson`;

            return {
              id: l.id.toString(),
              name: l.name,
              type: "vector",
              visible: false,
              url: layerUrl,
              serviceId: service.name,
              uniqueId: `arcgis-${service.url}-${l.id}`,
              description: l.description || service.description,
              bounds,
            };
          });

          return {
            layers,
            loading: false,
            error: null,
          };
        } catch (err) {
          console.error("Error processing ArcGIS service:", err);
          return {
            layers: [],
            loading: false,
            error: err instanceof Error ? err : new Error("Failed to process ArcGIS service"),
          };
        }
      });

      const serviceResults = await Promise.all(servicePromises);
      setArcgisResults(serviceResults);
    };

    // Function to fetch JSON services
    const fetchJsonServices = async () => {
      if (jsonServices.length === 0) {
        setJsonResults([]);
        return;
      }

      const servicePromises = jsonServices.map(async (service) => {
        try {
          let layerBounds: [number, number, number, number] | undefined;
          
          // Only fetch the JSON to get its bounds if it's not a potentially huge WFS GetFeature request
          // or if it explicitly limits the features
          const isHugeWfs = (service.url.includes('request=GetFeature') || service.url.includes('REQUEST=GetFeature')) && 
                            !service.url.includes('count=') && 
                            !service.url.includes('maxFeatures=');
                            
          if (!isHugeWfs) {
            try {
              const response = await fetch(service.url);
              const data = await response.json();
              
              if (data.type === 'FeatureCollection' || data.type === 'Feature') {
                const calculatedBbox = bbox(data);
                layerBounds = [calculatedBbox[0], calculatedBbox[1], calculatedBbox[2], calculatedBbox[3]];
              }
            } catch (e) {
              console.warn("Could not calculate bounds for JSON:", e);
            }
          }

          // For JSON, we just create a single layer that points to the JSON file
          const layer: LayerI = {
            id: service.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
            name: service.name,
            type: "vector", // Default to vector, will be handled by LayerSource
            visible: true,
            url: service.url,
            serviceId: service.name,
            uniqueId: `json-${service.url}`,
            description: service.description,
            bounds: layerBounds
          };

          return {
            layers: [layer],
            loading: false,
            error: null,
          };
        } catch (err) {
          console.error("Error processing JSON service:", err);
          return {
            layers: [],
            loading: false,
            error: err instanceof Error ? err : new Error("Failed to process JSON service"),
          };
        }
      });

      const serviceResults = await Promise.all(servicePromises);
      setJsonResults(serviceResults);
    };

    // Function to fetch CSV services
    const fetchCsvServices = async () => {
      if (csvServices.length === 0) {
        setCsvResults([]);
        return;
      }

      const servicePromises = csvServices.map(async (service) => {
        try {
          // For CSV, we just create a single layer that points to the CSV file
          // Real processing happens in LayerSource.tsx
          const layer: LayerI = {
            id: service.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
            name: service.name,
            type: "vector", // Default to vector, will be handled by LayerSource
            visible: true,
            url: service.url,
            serviceId: service.name,
            uniqueId: `csv-${service.url}`,
            description: service.description
          };

          return {
            layers: [layer],
            loading: false,
            error: null,
          };
        } catch (err) {
          console.error("Error processing CSV service:", err);
          return {
            layers: [],
            loading: false,
            error: err instanceof Error ? err : new Error("Failed to process CSV service"),
          };
        }
      });

      const serviceResults = await Promise.all(servicePromises);
      setCsvResults(serviceResults);
    };

    // Function to fetch WMS services
    const fetchWmsServices = async () => {
      if (wmsServices.length === 0) {
        setWmsResults([]);
        return;
      }
      const results: ServiceResult[] = [];

      // Create an array of promises for all WMS services
      const servicePromises = wmsServices.map(async (service) => {
        try {
          const { xmlDoc, text } = await fetchCapabilities(service.url, "WMS");

          const layers = parseWMSCapabilities(xmlDoc, text, service);

          return {
            layers,
            loading: false,
            error: null,
          };
        } catch (err) {
          console.error("Error fetching WMS capabilities:", err);
          return {
            layers: [],
            loading: false,
            error:
              err instanceof Error
                ? err
                : new Error("Failed to fetch WMS capabilities"),
          };
        }
      });

      // Wait for all service promises to resolve
      const serviceResults = await Promise.all(servicePromises);
      setWmsResults(serviceResults);
    };

    // Function to fetch WFS services
    const fetchWfsServices = async () => {
      if (wfsServices.length === 0) {
        setWfsResults([]);
        return;
      }
      const results: ServiceResult[] = [];

      // Create an array of promises for all WFS services
      const servicePromises = wfsServices.map(async (service) => {
        try {
          const { xmlDoc, text } = await fetchCapabilities(service.url, "WFS");

          const layers = parseWFSCapabilities(xmlDoc, text, service);

          // Check if this is an ArcGIS service and try to fetch style info
          if (isArcGISWfsUrl(service.url)) {
            const featureServiceUrl = getFeatureServiceUrl(service.url);

            // Try to match layers to FeatureService layers
            // We do this in parallel for all layers in this service
            const layersWithStyle = await Promise.all(
              layers.map(async (layer) => {
                try {
                  // Find the corresponding layer ID in the Feature Service
                  const layerId = await findLayerIdByName(
                    featureServiceUrl,
                    layer.name
                  );

                  if (layerId) {
                    const metadata = await fetchArcGISLayerMetadata(
                      featureServiceUrl,
                      layerId
                    );

                    if (
                      metadata &&
                      metadata.drawingInfo &&
                      metadata.drawingInfo.renderer
                    ) {
                      return {
                        ...layer,
                        styleInfo: metadata.drawingInfo.renderer,
                      };
                    }
                  }
                } catch (styleError) {
                  console.warn(
                    `Failed to fetch style for layer ${layer.name}:`,
                    styleError
                  );
                }
                return layer;
              })
            );

            return {
              layers: layersWithStyle,
              loading: false,
              error: null,
            };
          }

          return {
            layers,
            loading: false,
            error: null,
          };
        } catch (err) {
          console.error("Error fetching WFS capabilities:", err);
          return {
            layers: [],
            loading: false,
            error:
              err instanceof Error
                ? err
                : new Error("Failed to fetch WFS capabilities"),
          };
        }
      });

      // Wait for all service promises to resolve
      const serviceResults = await Promise.all(servicePromises);
      setWfsResults(serviceResults);
    };

    fetchAllServices();
  }, [services, serviceUpdateCounter]);

  // Combine all layers and update loading state
  useEffect(() => {
    const allErrors: Error[] = [
      ...wfsResults.filter((r) => r.error).map((r) => r.error!),
      ...wmsResults.filter((r) => r.error).map((r) => r.error!),
      ...jsonResults.filter((r) => r.error).map((r) => r.error!),
      ...csvResults.filter((r) => r.error).map((r) => r.error!),
      ...arcgisResults.filter((r) => r.error).map((r) => r.error!),
    ];

    setErrors(allErrors);

    const wfsLayers = wfsResults.flatMap((result) => result.layers);
    const wmsLayers = wmsResults.flatMap((result) => result.layers);
    const jsonLayers = jsonResults.flatMap((result) => result.layers);
    const csvLayers = csvResults.flatMap((result) => result.layers);
    const arcgisLayers = arcgisResults.flatMap((result) => result.layers);

    // Check for duplicate layers and create a unique set
    const uniqueLayers: LayerI[] = [];
    const seenIds = new Set<string>();

    // Helper function to process layers
    const processLayers = (layers: LayerI[], type: string) => {
      layers.forEach((layer) => {
        const uniqueId =
          (layer as any).uniqueId ||
          `${layer.serviceId || "noservice"}-${layer.url || "nourl"}-${layer.id}`;

        if (seenIds.has(uniqueId)) {
          console.log(
            `Skipping duplicate ${type} layer: ${layer.id} from service ${layer.serviceId}`
          );
        } else {
          seenIds.add(uniqueId);
          uniqueLayers.push(layer);
        }
      });
    };

    processLayers(wfsLayers, "WFS");
    processLayers(wmsLayers, "WMS");
    processLayers(jsonLayers, "JSON");
    processLayers(csvLayers, "CSV");
    processLayers(arcgisLayers, "ArcGIS");

    setAllLayers(uniqueLayers);

    // Only set isLoading to false when we have results for all services
    const wfsLoaded = wfsServices.length > 0 ? wfsResults.length === wfsServices.length : true;
    const wmsLoaded = wmsServices.length > 0 ? wmsResults.length === wmsServices.length : true;
    const jsonLoaded = jsonServices.length > 0 ? jsonResults.length === jsonServices.length : true;
    const csvLoaded = csvServices.length > 0 ? csvResults.length === csvServices.length : true;
    const arcgisLoaded = arcgisServices.length > 0 ? arcgisResults.length === arcgisServices.length : true;

    setIsLoading(!(wfsLoaded && wmsLoaded && jsonLoaded && csvLoaded && arcgisLoaded));
  }, [wfsResults, wmsResults, jsonResults, csvResults, arcgisResults, wfsServices, wmsServices, jsonServices, csvServices, arcgisServices]);

  return { allLayers, isLoading, errors };
}
