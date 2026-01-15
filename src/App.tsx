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

  // Handle service URL parameter logic moved to LayerSelector
  useEffect(() => {
    // This hook previously handled auto-loading services from URL but caused infinite reloads.
    // The logic has been moved to LayerSelector.tsx which is better equipped to handle
    // service loading and layer selection.
  }, []);

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
