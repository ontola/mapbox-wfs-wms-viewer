import { Cross1Icon, MagnifyingGlassIcon, EyeOpenIcon, EyeClosedIcon, PlusIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { useContext, useEffect, useMemo, useState, useRef } from "react";

import { AppContext } from "./App";
import "./Layers.css";
import "./components/Legend.css";
import { BoundsMatrix } from "./bounds";
import { LayerGroup } from "./layers/LayerGroup";
import { LayerI } from "./layers/LayerTypes";
import { useLayerGroups } from "./layers/useLayerGroups";
import { services } from "./layers/defaultServices";
import "./components/CustomCheckbox.css";
import { detectServiceType } from "./layers/detectService";
import { useAllServices } from "./layers/useGEOServices";
import { Legend } from "./components/Legend";
import { getServiceUrlFromUrl } from "./urlState";

export const bagLayerId = "points";

/** Fetches and displays available map layers */
export function LayerSelector() {
  // Context hooks must be at the top
  const {
    showLayerSelector,
    setShowLayerSelector,
    layers,
    setLayers,
  } = useContext(AppContext);

  // All useState hooks must be called before any conditional logic
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceUrl, setServiceUrl] = useState("");
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [serviceSuccess, setServiceSuccess] = useState<string | null>(null);
  // Add a counter to track service updates
  const [serviceUpdateCounter, setServiceUpdateCounter] = useState(0);
  const [autoSelectServiceUrl, setAutoSelectServiceUrl] = useState<string | null>(null);
  const autoSelectedRef = useRef(false);

  // Use our new hook to fetch all services at once
  const { allLayers: serviceLayers, isLoading, errors } = useAllServices(services, serviceUpdateCounter);

  // Group layers using the hook
  const layerGroups = useLayerGroups(layers);

  // Get selected layers
  const selectedLayers = useMemo(() => {
    return layers.filter(layer => layer.visible);
  }, [layers]);

  // Filter layer groups based on search term
  const filteredLayerGroups = useMemo(() => {
    if (!searchTerm) return layerGroups;

    const searchTermLower = searchTerm.toLowerCase();
    return layerGroups.map(group => ({
      ...group,
      layers: group.layers.filter(layer => {
        const matchesName = layer.name.toLowerCase().includes(searchTermLower);
        const matchesId = layer.id.toLowerCase().includes(searchTermLower);
        const matchesService = group.title.toLowerCase().includes(searchTermLower);

        // Check service descriptions
        let matchesDescription = false;
        if (group.serviceId) {
          matchesDescription = services.find(s => s.name === layer.serviceId)?.description?.toLowerCase().includes(searchTermLower) || false;
        }

        return matchesName || matchesId || matchesService || matchesDescription;
      })
    })).filter(group => group.layers.length > 0);
  }, [layerGroups, searchTerm]);

  // Handle service parameter from URL
  useEffect(() => {
    const urlService = getServiceUrlFromUrl();
    if (urlService) {
      // Check if it's already in services
      const exists = services.some(s => s.url === urlService);

      if (!exists) {
        setIsAddingService(true);
        detectServiceType(urlService).then(result => {
          if (result.service) {
             // check existence again to be safe
             const existsNow = services.some(s => s.url === result.service?.url);
             if (!existsNow) {
               services.push(result.service);
               setServiceUpdateCounter(c => c + 1);
               console.log(`Auto-added service from URL: ${result.service.name}`);
             }
          }
          setIsAddingService(false);
        }).catch(err => {
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
      setLayers(prevLayers => {
        const updatedLayers = [...prevLayers];
        let hasChanges = false;
        let autoSelected = false;

        serviceLayers.forEach(serviceLayer => {
          const existingLayerIndex = updatedLayers.findIndex(layer =>
            // Check for duplicate by ID and URL
            (layer.id === serviceLayer.id && layer.url === serviceLayer.url) ||
            // Also check for duplicate by ID and service ID
            (layer.id === serviceLayer.id && layer.serviceId === serviceLayer.serviceId)
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

        // Handle auto-selection of first layer for shared service
        if (autoSelectServiceUrl && !autoSelectedRef.current) {
           // Check if any visible layers exist (to avoid overriding user selection if any)
           // If we are sharing, we assume we want to show this source.
           // Filter for layers matching the autoSelectServiceUrl

           // Find the first layer that matches the service URL
           // We look in updatedLayers to ensure we get the fresh one
           const matchingLayerIndex = updatedLayers.findIndex(l =>
             (l.url && (l.url === autoSelectServiceUrl || l.url.startsWith(autoSelectServiceUrl))) &&
             !l.visible
           );

           if (matchingLayerIndex !== -1) {
             console.log(`Auto-selecting layer: ${updatedLayers[matchingLayerIndex].name}`);
             updatedLayers[matchingLayerIndex] = { ...updatedLayers[matchingLayerIndex], visible: true };
             hasChanges = true;
             autoSelected = true;
           }
        }

        if (autoSelected) {
           autoSelectedRef.current = true;
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

  // Event handlers and other functions
  // Handle removing a layer
  const handleRemoveLayer = (layerId: string, uniqueId?: string, serviceId?: string, url?: string) => {
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        // If uniqueId is provided, use it for comparison
        if (uniqueId) {
          const currentUniqueId = layer.uniqueId || `${layer.serviceId || 'noservice'}-${layer.url || 'nourl'}-${layer.id}`;
          return uniqueId === currentUniqueId ? { ...layer, visible: false } : layer;
        }
        // Otherwise fall back to just comparing IDs (for backward compatibility)
        return layer.id === layerId ? { ...layer, visible: false } : layer;
      })
    );
  };

  // Function to select the first layer from filtered results
  const selectFirstFilteredLayer = () => {
    // Find the first available layer from filtered groups
    for (const group of filteredLayerGroups) {
      if (group.layers.length > 0) {
        const firstLayer = group.layers[0];
        // Only select if not already visible
        if (!firstLayer.visible) {
          setLayers(prevLayers =>
            prevLayers.map(layer => {
              // Create a composite ID for comparison if uniqueId is not available
              const firstLayerUniqueId = firstLayer.uniqueId ||
                `${firstLayer.serviceId || 'noservice'}-${firstLayer.url || 'nourl'}-${firstLayer.id}`;
              const currentUniqueId = layer.uniqueId ||
                `${layer.serviceId || 'noservice'}-${layer.url || 'nourl'}-${layer.id}`;

              // Compare using uniqueId or composite ID
              return firstLayerUniqueId === currentUniqueId ? { ...layer, visible: true } : layer;
            })
          );
          // Clear the search term after selection
          setSearchTerm("");
        }
        break;
      }
    }
  };

  // Handle key press in search input
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      selectFirstFilteredLayer();
    }
  };

  // Function to handle adding a new service
  const handleAddService = async () => {
    if (!serviceUrl.trim()) {
      setServiceError("Please enter a valid URL");
      return;
    }

    setIsAddingService(true);
    setServiceError(null);
    setServiceSuccess(null);

    try {
      const result = await detectServiceType(serviceUrl);

      // If we have a service but also an error, it's a warning
      if (result.service && result.error && result.type) {
        // We can still add the service, but show the warning
        const warningMessage = result.error;

        // Check if service already exists
        const exists = services.some(s => s.url === result.service?.url);
        if (!exists && result.service) {
          services.push(result.service);
          setServiceSuccess(`Added ${result.type} service: ${result.service.name} (with warning: ${warningMessage})`);
          setServiceUrl("");
          // Increment the counter to trigger a re-fetch
          setServiceUpdateCounter(prev => prev + 1);
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
      const exists = services.some(s => s.url === result.service?.url);
      if (!exists && result.service) {
        services.push(result.service);
        setServiceSuccess(`Added ${result.type} service: ${result.service.name}`);
        setServiceUrl("");
        // Increment the counter to trigger a re-fetch
        setServiceUpdateCounter(prev => prev + 1);
      } else {
        setServiceError("This service is already added");
      }
    } catch (error) {
      console.error("Error in handleAddService:", error);
      setServiceError(`Error adding service: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAddingService(false);
    }
  };

  // Render component
  return (
    <div className={`Sidebar filter-panel ${showLayerSelector ? "filter-panel--open" : ""}`}>
      <div className="Titlebar">
        <h3>Lagen</h3>
        <button title="Lagen sluiten" onClick={() => setShowLayerSelector(false)}>
          <Cross1Icon />
        </button>
      </div>
      <div className="selected-layers">
        <h4>Geselecteerde lagen</h4>
        <div className="selected-layers-list">
          {selectedLayers.map(layer => (
            <div
              key={layer.uniqueId || `${layer.serviceId || 'noservice'}-${layer.url || 'nourl'}-${layer.id}`}
              className="selected-layer-item-container"
            >
              <div className="selected-layer-item">
                <span>{layer.name}</span>
                <button
                  onClick={() => handleRemoveLayer(layer.id, layer.uniqueId, layer.serviceId, layer.url)}
                  title="Verwijder laag"
                  className="remove-layer-button"
                >
                  <Cross1Icon />
                </button>
              </div>
              <Legend layer={layer} />
            </div>
          ))}
        </div>
      </div>

      <div className="add-service-container">
        <div className="service-header">
          <h4>Voeg service toe</h4>
          <div className="service-info-tooltip">
            <InfoCircledIcon className="info-icon" />
            <div className="tooltip-content">
              <p>Voeg een WFS of WMS service toe door de URL in te voeren.</p>
              <p>Bijvoorbeeld:</p>
              <ul>
                <li>https://service.pdok.nl/hwh/luchtfotocir/wms/v1_0</li>
                <li>https://service.pdok.nl/kadaster/bestuurlijkegebieden/wfs/v1_0</li>
              </ul>
              <p>Het systeem detecteert automatisch of het een WFS of WMS service is.</p>
            </div>
          </div>
        </div>
        <div className="service-input-container">
          <input
            type="text"
            placeholder="Service URL..."
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddService()}
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
        {serviceSuccess && <div className="service-success">{serviceSuccess}</div>}
      </div>

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
        {filteredLayerGroups.map(group => (
          <LayerGroup
            key={group.serviceId}
            title={group.title}
            layers={group.layers}
            isExpanded={
              !!searchTerm ||
              (!!autoSelectServiceUrl && group.layers.some(l => l.url && (l.url === autoSelectServiceUrl || l.url.startsWith(autoSelectServiceUrl))))
            }
            setSearchTerm={setSearchTerm}
          />
        ))}
        {isLoading && (
          <div className="loading-message">Loading services...</div>
        )}
      </div>

    </div>
  );
}

/** This should describe Utrecht bounds */
const boundsUtrecht: BoundsMatrix = [
  4.93038,
  51.986783,
  5.25482,
  52.166141,
];

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
    bbox: `${bounds.join(",")},EPSG:4326`
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
      key.toLowerCase() === "bbox" ? `${key}=${value}` : `${key}=${encodeURIComponent(value)}`
    )
    .join("&");

  return `${layer.url}?${queryString}`;
}
