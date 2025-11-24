// Custom styles
import "./reset.css";
import "./App.css";
import "./global.css";

import React, { createContext, useEffect } from "react";
import { Map } from "./Map";
import { MapProvider } from "react-map-gl";
import { LayerI } from "./layers/LayerTypes";
import { LayerSelector } from "./Layers";
import { getLayersFromUrl, setLayersInUrl, getServiceUrlFromUrl } from "./urlState";
import { detectServiceType } from "./layers/detectService";

type InteractionOrigin = "mapMove" | "mapClick" | "query" | "filter" | undefined;

export interface AppContextI {
  layers: LayerI[];
  setLayers: React.Dispatch<React.SetStateAction<LayerI[]>>;
  showLayerSelector: boolean;
  setShowLayerSelector: (b: boolean) => void;
  /** Where the user had its last interaction */
  lastInteractionOrigin: InteractionOrigin;
  setLastInteractionOrigin: (origin: InteractionOrigin) => void;
}

export const AppContext = createContext<AppContextI>(undefined);
export const hitCount = 150;

const AppProvider = () => {
  return (
    <App
    />
  );
};

const App = () => {
  const [lastInteractionOrigin, setLastInteractionOrigin] =
    React.useState(undefined);
  const [layers, setLayers] = React.useState<LayerI[]>([]);
  const [showLayerSelector, setShowLayerSelector] = React.useState(false);

  // Initialize layers from URL on mount
  useEffect(() => {
    const urlLayers = getLayersFromUrl();
    if (urlLayers.length > 0) {
      // Directly set layers from URL - they have all the info needed
      setLayers(urlLayers);
    }
  }, []);

  // Handle service URL parameter - auto-detect and load first layer
  useEffect(() => {
    const serviceUrl = getServiceUrlFromUrl();
    if (serviceUrl && layers.length === 0) {
      // Only auto-load if no layers are already loaded
      detectServiceType(serviceUrl).then(result => {
        if (result.service && result.type) {
          console.log(`Auto-loading service from URL: ${result.service.name}`);
          // Import services dynamically to add the new service
          import('./layers/defaultServices').then(({ services }) => {
            // Check if service already exists
            const exists = services.some(s => s.url === result.service?.url);
            if (!exists && result.service) {
              services.push(result.service);
              // Force a re-render by updating a counter or similar
              // The useAllServices hook will pick up the new service
              window.location.reload(); // Simple approach: reload to pick up new service
            }
          });
        } else {
          console.error(`Failed to detect service from URL: ${serviceUrl}`, result.error);
        }
      });
    }
  }, [layers.length]);

  // Sync visible layers to URL when they change
  useEffect(() => {
    const visibleLayers = layers.filter(layer => layer.visible);
    setLayersInUrl(visibleLayers);
  }, [layers]);

  return (
    <AppContext.Provider
      value={{
        layers,
        setLayers,
        showLayerSelector,
        setShowLayerSelector,
        lastInteractionOrigin,
        setLastInteractionOrigin,
      }}
    >
      <MapProvider>
          <div className="app">
            <div className="app__columns">
              <LayerSelector />
              <Map />
            </div>
          </div>
      </MapProvider>
    </AppContext.Provider>
  );
};

export default AppProvider;
