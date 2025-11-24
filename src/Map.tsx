import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./Map.css";
import MapGL, {
  GeolocateControl,
  Layer,
  MapLayerMouseEvent,
  MapRef,
  NavigationControl,
  Source,
} from "react-map-gl";
import { LngLatBounds } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AppContext } from "./App";
import { GBPObject, getObjectType } from "./schema";
import { mapboxToken } from "./config";
import { ToolTip } from "./Tooltip";
import { Dialog } from "./Dialog";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as turf from "@turf/turf";
import { boundsLngLatToIS, boundsLngLatToMatrix } from "./bounds";
import { LayerSource } from "./layers/LayerSource";
import { bagLayerId } from "./layers/LayerTypes";
import { bagLayer } from "./layers/LayerStyles";
import { boundsUtrecht } from "./layers/constants";

export const mapStartState = {
  latitude: 52.0907,
  longitude: 5.1213,
  zoom: 11,
};

// Create startBoundsInstant from boundsUtrecht
export const startBoundsInstant = {
  northEast: { lng: boundsUtrecht[2], lat: boundsUtrecht[3] },
  southWest: { lng: boundsUtrecht[0], lat: boundsUtrecht[1] },
};

// Create startBounds from boundsUtrecht
export const startBounds = [
  boundsUtrecht[0], // Southwest longitude
  boundsUtrecht[1], // Southwest latitude
  boundsUtrecht[2], // Northeast longitude
  boundsUtrecht[3]  // Northeast latitude
];

export const zoomStreetLevel = 18;

/** Amount of ms to animate the map to the new bounds */
const animationDuration = 1000;

const queryHasNumber = (query: string) => {
  return /\d/.test(query);
};

export function Map() {
  const {
    setShowLayerSelector,
    lastInteractionOrigin,
    setLastInteractionOrigin,
    showLayerSelector,
    layers,
  } = useContext(AppContext);
  const mapRef = useRef<MapRef>();
  const [viewState, setViewState] = useState(mapStartState);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [clickedFeature, setClickedFeature] = useState(null);
  const [area, setArea] = useState<number | null>(null);
  const [lineLength, setLineLength] = useState<number | null>(null);
  const [currentBounds, setCurrentBounds] = useState<LngLatBounds | null>(null);
  // Add a ref to store the MapboxDraw instance
  const drawRef = useRef<any>(null);

  const handleHover = useCallback(
    (event) => {
      const { features, point } = event;
      const hoveredFeature = features && features[0];

      if (!mapRef.current) return;

      // Update cursor style based on whether a feature is hovered
      mapRef.current.getCanvas().style.cursor = hoveredFeature ? "pointer" : "";

      // Update hover info with feature and position
      setHoverInfo(hoveredFeature && { feature: hoveredFeature, x: point.x, y: point.y });
    },
    [layers],
  );

  const visibleLayers = useMemo(() => layers.filter(layer => layer.visible), [layers]);

  const interactiveLayers = useMemo(() => {
    // Get layer IDs from visible layers
    const visibleLayerIds = layers
      .filter(layer => layer.visible)
      .flatMap(layer =>
        layer.type === 'vector'
          ? [layer.id, `${layer.id}-symbol`]
          : [layer.id]
      );

    return visibleLayerIds;
  }, [layers]);

  const handleMapClick = useCallback(
    (evt: MapLayerMouseEvent) => {
      setLastInteractionOrigin("mapClick");

      // No features clicked
      if (!evt.features?.length) return;

      setClickedFeature(evt.features[0]);
    },
    [layers],
  );

  // Draw a polygon on the map and calculate the surface area
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Create the draw control if it doesn't exist
    if (!drawRef.current) {
      drawRef.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          line_string: true,
          trash: true,
        },
        // Ensure proper selection behavior
        defaultMode: 'simple_select',
        boxSelect: true,
        touchEnabled: true
      });

      // Add the control to the map - position it at the bottom-left
      map.addControl(drawRef.current, 'bottom-left');
    }

    // Consolidated function to calculate and update measurements
    const updateMeasurements = () => {
      if (!drawRef.current) return;

      const data = drawRef.current.getAll();

      // Calculate area for polygons
      const polygons = data.features.filter(f => f.geometry.type === 'Polygon');
      if (polygons.length > 0) {
        const totalArea = polygons.reduce((sum, polygon) => sum + turf.area(polygon), 0);
        setArea(Math.round(totalArea));
      } else {
        setArea(0);
      }

      // Calculate length for lines
      const lines = data.features.filter(f => f.geometry.type === 'LineString');
      if (lines.length > 0) {
        const totalLength = lines.reduce((sum, line) =>
          sum + turf.length(line, { units: 'meters' }), 0);
        setLineLength(Math.round(totalLength));
      } else {
        setLineLength(0);
      }
    };

    // Register all event listeners
    (map as any).on('draw.create', updateMeasurements);
    (map as any).on('draw.update', updateMeasurements);
    (map as any).on('draw.selectionchange', updateMeasurements);
    (map as any).on('draw.render', updateMeasurements);
    (map as any).on('draw.modechange', updateMeasurements);

    // Special handler for delete events to ensure measurements are reset
    const handleDeleteEvent = () => {
      // Simple approach: recalculate measurements after deletion
      updateMeasurements();
    };

    (map as any).on('draw.delete', handleDeleteEvent);

    // Add a click event listener to the trash button
    const trashButton = document.querySelector('.mapbox-gl-draw_trash');

    // Define the handler function outside so we can reference it in the cleanup
    const handleTrashClick = (e) => {
      if (!drawRef.current) return;

      // Simple approach: delete all features and reset measurements
      drawRef.current.deleteAll();
      setArea(0);
      setLineLength(0);
    };

    if (trashButton) {
      trashButton.addEventListener('click', handleTrashClick);
    }

    // Cleanup
    return () => {
      if (drawRef.current) {
        // Remove the click event listener from the trash button
        const trashButton = document.querySelector('.mapbox-gl-draw_trash');
        if (trashButton) {
          trashButton.removeEventListener('click', handleTrashClick);
        }

        map.removeControl(drawRef.current);
        drawRef.current = null;
      }

      // Remove all event listeners
      (map as any).off('draw.create', updateMeasurements);
      (map as any).off('draw.update', updateMeasurements);
      (map as any).off('draw.selectionchange', updateMeasurements);
      (map as any).off('draw.render', updateMeasurements);
      (map as any).off('draw.modechange', updateMeasurements);
      (map as any).off('draw.delete', handleDeleteEvent);
    };
  }, [mapRef.current]); // Only run once when map is initialized

  return (
    <div className="Map__wrapper">
      <div className="Map__buttons Map__buttons--left">

        {!showLayerSelector && (
          <button
            id="toggle-layers-view"
            onClick={() => setShowLayerSelector(!showLayerSelector)}
          >
            Kaartlagen
          </button>
        )}
      </div>
      <div className="Map__buttons Map__buttons--right">

      </div>

      {/* Measurement displays */}
      {(area > 0 || lineLength > 0) && (
        <div className="Map__measurements">
          {area > 0 && (
            <div className="Map__measurement Map__measurement--area">
              Oppervlakte: {area.toLocaleString()} m²
            </div>
          )}
          {lineLength > 0 && (
            <div className="Map__measurement Map__measurement--length">
              Lengte: {lineLength.toLocaleString()} m
            </div>
          )}
        </div>
      )}

      <MapGL
        trackResize={true}
        id="mainMap"
        initialViewState={viewState}
        mapboxAccessToken={mapboxToken}
        onMouseMove={handleHover}
        onMouseOut={() => setHoverInfo(null)}
        onClick={handleMapClick}
        style={{ width: "100%", height: "100%", flexBasis: "600px", flex: 1 }}
        mapStyle="mapbox://styles/joepio/clefv1fk2001x01msvlmxl79g"
        ref={mapRef}
        attributionControl={false}
        interactiveLayerIds={interactiveLayers}
      >
        {hoverInfo && <ToolTip {...hoverInfo} />}
        <NavigationControl position={"bottom-right"} />
        <GeolocateControl position={"bottom-left"} />
        {visibleLayers
          .map((layer) => <LayerSource layer={layer} key={layer.uniqueId || `${layer.serviceId || 'noservice'}-${layer.url || 'nourl'}-${layer.id}`} bounds={currentBounds ? boundsLngLatToMatrix(currentBounds) : null} />)}
      </MapGL>
      <Dialog
        feature={clickedFeature}
        onClose={() => setClickedFeature(null)}
      />
    </div>
  );
}
