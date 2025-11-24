// Custom styles
import "./reset.css";
import "./App.css";
import "./global.css";

import React, { createContext } from "react";
import { Map } from "./Map";
import { MapProvider } from "react-map-gl";
import { LayerI } from "./layers/LayerTypes";
import { LayerSelector } from "./Layers";

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
