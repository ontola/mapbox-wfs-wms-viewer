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
  const [allLayers, setAllLayers] = useState<LayerI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Error[]>([]);

  // Use refs to store service data
  const [wfsResults, setWfsResults] = useState<ServiceResult[]>([]);
  const [wmsResults, setWmsResults] = useState<ServiceResult[]>([]);

  // Fetch both WFS and WMS services in parallel
  useEffect(() => {
    // Start both fetches in parallel
    const fetchAllServices = async () => {
      // Start WMS services first as they typically take longer
      const wmsPromise = fetchWmsServices();
      const wfsPromise = fetchWfsServices();

      // Wait for both to complete
      await Promise.all([wmsPromise, wfsPromise]);
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
    ];

    setErrors(allErrors);

    const wfsLayers = wfsResults.flatMap((result) => result.layers);
    const wmsLayers = wmsResults.flatMap((result) => result.layers);

    // Check for duplicate layers and create a unique set
    const uniqueLayers: LayerI[] = [];
    const seenIds = new Set<string>();

    // Process WFS layers first
    wfsLayers.forEach((layer) => {
      // Use uniqueId if available, otherwise create a composite ID
      const uniqueId =
        (layer as any).uniqueId ||
        `${layer.serviceId || "noservice"}-${layer.url || "nourl"}-${layer.id}`;

      if (seenIds.has(uniqueId)) {
        console.log(
          `Skipping duplicate WFS layer: ${layer.id} from service ${layer.serviceId}`
        );
      } else {
        seenIds.add(uniqueId);
        uniqueLayers.push(layer);
      }
    });

    wmsLayers.forEach((layer) => {
      // Use uniqueId if available, otherwise create a composite ID
      const uniqueId =
        (layer as any).uniqueId ||
        `${layer.serviceId || "noservice"}-${layer.url || "nourl"}-${layer.id}`;

      if (seenIds.has(uniqueId)) {
        console.log(
          `Skipping duplicate WMS layer: ${layer.id} from service ${layer.serviceId}`
        );
      } else {
        seenIds.add(uniqueId);
        uniqueLayers.push(layer);
      }
    });
    setAllLayers(uniqueLayers);

    // Only set isLoading to false when we have results for both WFS and WMS services
    // and the number of results matches the number of services
    const wfsLoaded =
      wfsServices.length > 0 ? wfsResults.length === wfsServices.length : true;
    const wmsLoaded =
      wmsServices.length > 0 ? wmsResults.length === wmsServices.length : true;

    setIsLoading(!(wfsLoaded && wmsLoaded));
  }, [wfsResults, wmsResults, wfsServices, wmsServices]);

  return { allLayers, isLoading, errors };
}
