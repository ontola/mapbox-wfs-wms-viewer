// Custom styles
import "./reset.css";
import "./App.css";
import "./global.css";

import React, { createContext, useEffect } from "react";
import { Map } from "./Map";
import { MapProvider } from "react-map-gl";
import { LayerI } from "./layers/LayerTypes";
import { LayerSelector } from "./Layers";
import { getLayersFromUrl, setLayersInUrl, getServiceUrlFromUrl, getThemeFromUrl, Theme } from "./urlState";
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
  theme?: Theme;
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
    React.useState<InteractionOrigin>(undefined);
  const [layers, setLayers] = React.useState<LayerI[]>([]);
  const [showLayerSelector, setShowLayerSelector] = React.useState(() => {
    const urlLayers = getLayersFromUrl();
    const urlService = getServiceUrlFromUrl();
    return urlLayers.length > 0 || !!urlService;
  });
  const [theme, setTheme] = React.useState<Theme | undefined>();

  // Initialize layers and theme from URL on mount
  useEffect(() => {
    const urlLayers = getLayersFromUrl();
    if (urlLayers.length > 0) {
      // Directly set layers from URL - they have all the info needed
      setLayers(urlLayers);
    }

    // Check for theme parameters
    const urlTheme = getThemeFromUrl();
    if (Object.keys(urlTheme).length > 0) {
      setTheme(urlTheme);

      // Apply theme to document
      if (urlTheme.color) {
        document.documentElement.style.setProperty('--primary-color', urlTheme.color);
      }
      if (urlTheme.name) {
        document.title = urlTheme.name;
      }
      if (urlTheme.favicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = urlTheme.favicon;
      }
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
        theme,
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
