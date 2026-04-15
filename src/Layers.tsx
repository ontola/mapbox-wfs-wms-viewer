import {
  Cross1Icon,
  MagnifyingGlassIcon,
  PlusIcon,
  GearIcon,
} from "@radix-ui/react-icons";
import { useContext, useEffect, useMemo, useState, useRef } from "react";

import { AppContext } from "./App";
import "./Layers.css";
import "./components/Legend.css";
import { BoundsMatrix } from "./bounds";
import { LayerCheckbox } from "./layers/LayerCheckbox";
import { LayerI } from "./layers/LayerTypes";
import { services } from "./layers/defaultServices";
import "./components/CustomCheckbox.css";
import "./components/DemoUrls.css";
import { detectServiceType } from "./layers/detectService";
import { useAllServices } from "./layers/useGEOServices";
import { Legend } from "./components/Legend";
import { getServiceUrlFromUrl } from "./urlState";
import { DemoUrls } from "./components/DemoUrls";

export const bagLayerId = "points";

/** Fetches and displays available map layers */
export function LayerSelector() {
  // Context hooks must be at the top
  const { showLayerSelector, setShowLayerSelector, layers, setLayers, theme } =
    useContext(AppContext);

  // All useState hooks must be called before any conditional logic
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceSuccess, setServiceSuccess] = useState<string | null>(null);
  // Add a counter to track service updates
  const [serviceUpdateCounter, setServiceUpdateCounter] = useState(0);
  const [autoSelectServiceUrl, setAutoSelectServiceUrl] = useState<
    string | null
  >(null);
  const autoSelectedRef = useRef(false);

  const [showDevTools, setShowDevTools] = useState(false);

  // Use our new hook to fetch all services at once
  const {
    allLayers: serviceLayers,
    isLoading,
    errors,
  } = useAllServices(services, serviceUpdateCounter);

  // Filter layers based on search term
  const filteredLayers = useMemo(() => {
    if (!searchTerm) return layers;
    const searchTermLower = searchTerm.toLowerCase();
    return layers.filter((layer) => {
      const matchesName = layer.name.toLowerCase().includes(searchTermLower);
      const matchesId = layer.id.toLowerCase().includes(searchTermLower);
      return matchesName || matchesId;
    });
  }, [layers, searchTerm]);

  // Handle service parameter from URL
  useEffect(() => {
    const urlService = getServiceUrlFromUrl();
    if (urlService) {
      // Check if it's already in services
      const exists = services.some((s) => s.url === urlService);

      if (!exists) {
        setIsAddingService(true);
        detectServiceType(urlService)
          .then((result) => {
            if (result.service) {
              // check existence again to be safe
              const existsNow = services.some(
                (s) => s.url === result.service?.url,
              );
              if (!existsNow) {
                services.push(result.service);
                setServiceUpdateCounter((c) => c + 1);
                console.log(
                  `Auto-added service from URL: ${result.service.name}`,
                );
              }
            }
            setIsAddingService(false);
          })
          .catch((err) => {
            console.error("Error auto-adding service:", err);
            setIsAddingService(false);
          });
      }

      // Set auto-select logic to run when layers are loaded
      setAutoSelectServiceUrl(urlService);
    }
  }, []);

  // Add service layers to existing layers if not already present, or update them if they have new info
  useEffect(() => {
    if (serviceLayers.length > 0) {
      setLayers((prevLayers) => {
        const updatedLayers = [...prevLayers];
        let hasChanges = false;
        let autoSelected = false;

        serviceLayers.forEach((serviceLayer) => {
          const existingLayerIndex = updatedLayers.findIndex(
            (layer) =>
              // Check for duplicate by ID and URL
              (layer.id === serviceLayer.id &&
                layer.url === serviceLayer.url) ||
              // Also check for duplicate by ID and service ID
              (layer.id === serviceLayer.id &&
                layer.serviceId === serviceLayer.serviceId),
          );

          if (existingLayerIndex === -1) {
            // New layer
            updatedLayers.push(serviceLayer);
            hasChanges = true;
          } else {
            // Existing layer - check if we need to update it (e.g. styleInfo or bounds added)
            const existingLayer = updatedLayers[existingLayerIndex];
            let layerChanged = false;
            let newLayerState = { ...existingLayer };

            if (serviceLayer.styleInfo && !existingLayer.styleInfo) {
              newLayerState.styleInfo = serviceLayer.styleInfo;
              layerChanged = true;
            }

            // Update bounds if available in service layer but missing in existing layer
            if (serviceLayer.bounds && !existingLayer.bounds) {
              newLayerState.bounds = serviceLayer.bounds;
              layerChanged = true;
            }

            if (layerChanged) {
              updatedLayers[existingLayerIndex] = newLayerState;
              hasChanges = true;
            }
          }
        });

        // Auto-select first layer if none are visible
        if (!autoSelectedRef.current) {
          const hasVisible = updatedLayers.some((l) => l.visible);
          if (!hasVisible && updatedLayers.length > 0) {
            updatedLayers[0] = { ...updatedLayers[0], visible: true };
            hasChanges = true;
            autoSelectedRef.current = true;
          }
        }

        return hasChanges ? updatedLayers : prevLayers;
      });
    }
  }, [serviceLayers, setLayers, autoSelectServiceUrl]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (serviceSuccess) {
      const timer = setTimeout(() => {
        setServiceSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [serviceSuccess]);

  // Select first filtered layer on Enter
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim() !== "") {
      const firstLayer = filteredLayers.find((l) => !l.visible);
      if (firstLayer) {
        const targetId =
          firstLayer.uniqueId ||
          `${firstLayer.serviceId || "noservice"}-${firstLayer.url || "nourl"}-${firstLayer.id}`;
        setLayers((prev) =>
          prev.map((layer) => {
            const id =
              layer.uniqueId ||
              `${layer.serviceId || "noservice"}-${layer.url || "nourl"}-${layer.id}`;
            return id === targetId ? { ...layer, visible: true } : layer;
          }),
        );
        setSearchTerm("");
      }
    }
  };

  // Function to handle adding a new service
  const handleAddService = async (overrideUrl?: string | React.MouseEvent) => {
    const urlToUse = typeof overrideUrl === 'string' ? overrideUrl : serviceUrl;
    if (!urlToUse.trim()) {
      setServiceError("Please enter a valid URL");
      return;
    }

    setIsAddingService(true);
    setServiceError(null);
    setServiceSuccess(null);

    try {
      const result = await detectServiceType(urlToUse);

      // If we have a service but also an error, it's a warning
      if (result.service && result.error && result.type) {
        // We can still add the service, but show the warning
        const warningMessage = result.error;

        // Check if service already exists
        const exists = services.some((s) => s.url === result.service?.url);
        if (!exists && result.service) {
          services.push(result.service);
          setServiceSuccess(
            `Added ${result.type} service: ${result.service.name} (with warning: ${warningMessage})`,
          );
          setServiceUrl("");
          // Increment the counter to trigger a re-fetch
          setServiceUpdateCounter((prev) => prev + 1);
          setAutoSelectServiceUrl(result.service.url);
          autoSelectedRef.current = false;
        } else {
          setServiceError("This service is already added");
        }
        return;
      }

      if (!result.type || !result.service) {
        setServiceError(result.error || "Could not detect a valid service");
        return;
      }

      // Add the service to the unified list
      // Check if service already exists
      const exists = services.some((s) => s.url === result.service?.url);
      if (!exists && result.service) {
        services.push(result.service);
        setServiceSuccess(
          `Added ${result.type} service: ${result.service.name}`,
        );
        setServiceUrl("");
        // Increment the counter to trigger a re-fetch
        setServiceUpdateCounter((prev) => prev + 1);
        setAutoSelectServiceUrl(result.service.url);
        autoSelectedRef.current = false;
      } else {
        setServiceError("This service is already added");
      }
    } catch (error) {
      console.error("Error in handleAddService:", error);
      setServiceError(
        `Error adding service: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsAddingService(false);
    }
  };

  // Render component
  return (
    <div
      className={`Sidebar filter-panel ${showLayerSelector ? "filter-panel--open" : ""}`}
    >
      <div className="Titlebar">
        {theme?.logo && (
          <img src={theme.logo} alt="Logo" className="theme-logo" />
        )}
        <div className="Titlebar__title">
          <h3>{theme?.name || "Lagen"}</h3>
          {services.length > 0 && (
            <span className="Titlebar__service-type">
              {services[0].type === "ArcGIS_FeatureServer" ? "ArcGIS" : services[0].type}
            </span>
          )}
        </div>
        <div className="Titlebar__actions">
          <button
            title="Developer tools"
            onClick={() => setShowDevTools(!showDevTools)}
            className={showDevTools ? "active" : ""}
          >
            <GearIcon />
          </button>
          <button
            title="Lagen sluiten"
            onClick={() => setShowLayerSelector(false)}
          >
            <Cross1Icon />
          </button>
        </div>
      </div>

      {showDevTools && (
        <div className="add-service-container">
          <div className="service-input-container">
            <input
              type="text"
              placeholder="Service URL..."
              value={serviceUrl}
              onChange={(e) => setServiceUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddService()}
              className="service-input"
              disabled={isAddingService}
            />
            <button
              onClick={handleAddService}
              title="Voeg service toe"
              className="add-service-button"
              disabled={isAddingService}
            >
              {isAddingService ? "..." : <PlusIcon />}
            </button>
          </div>
          {serviceError && <div className="service-error">{serviceError}</div>}
          {serviceSuccess && (
            <div className="service-success">{serviceSuccess}</div>
          )}
          <DemoUrls />
        </div>
      )}

      <div className="search-container">
        <MagnifyingGlassIcon className="search-icon" />
        <input
          type="text"
          placeholder="Zoek lagen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleSearchKeyPress}
          className="search-input"
        />
        {searchTerm && (
          <button
            className="search-clear-button"
            onClick={() => setSearchTerm("")}
            title="Zoekopdracht wissen"
          >
            <Cross1Icon />
          </button>
        )}
      </div>
      <div className="layers-checkboxes" data-testid="layer-selector">
        {filteredLayers.map((layer) => (
          <LayerCheckbox
            layer={layer}
            key={
              layer.uniqueId ||
              `${layer.serviceId || "noservice"}-${layer.url || "nourl"}-${layer.id}`
            }
            setSearchTerm={setSearchTerm}
          />
        ))}
        {isLoading && (
          <div className="loading-message">Laden...</div>
        )}
      </div>
    </div>
  );
}

/** This should describe Utrecht bounds */
const boundsUtrecht: BoundsMatrix = [4.93038, 51.986783, 5.25482, 52.166141];

// Convert object to searchParams
function objectToSearchParams(obj: { [key: string]: any }) {
  const params = new URLSearchParams();
  Object.keys(obj).forEach((key) => {
    params.set(key, obj[key]);
  });
  return params;
}

export function makeWfsUrl(layer: LayerI, bounds?: BoundsMatrix) {
  let url = new URL(layer.url);
  bounds = bounds ? bounds : boundsUtrecht;
  // See https://docs.geoserver.org/stable/en/user/services/wfs/reference.html
  let params = {
    SERVICE: "WFS",
    VERSION: "1.1.0",
    REQUEST: "GetFeature",
    outputFormat: "application/json",
    acceptsFormat: "application/json",
    typeNames: layer.id,
    srsName: "EPSG:4326",
    bbox: `${bounds.join(",")},EPSG:4326`,
  };
  url.search = objectToSearchParams(params).toString();
  return url.toString();
}

export function makeWmsUrl(layer: LayerI, _bounds?: BoundsMatrix) {
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

  // Build the query string manually to ensure the BBOX parameter is not encoded
  const queryString = Object.entries(params)
    .map(([key, value]) =>
      key.toLowerCase() === "bbox"
        ? `${key}=${value}`
        : `${key}=${encodeURIComponent(value)}`,
    )
    .join("&");

  return `${layer.url}?${queryString}`;
}
