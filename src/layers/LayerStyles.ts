import { AnyLayer, SymbolLayer, RasterLayer } from "react-map-gl";
import { LayerI } from "./LayerTypes";
import { bagLayerId } from "./LayerTypes";

function getThemeColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--primary-color").trim() || "rgb(204, 0, 0)";
}

/**
 * We try to find the best way to make MapBox render a layer.
 * https://docs.mapbox.com/style-spec/reference/layers/#type
 *
 * The problem here is that we don't know whether the layer itself will have line, point, polygon data.
 *
 * Right now we create layers for fills, lines and symbols, but that also means our line lines will be filled - which looks bad.
 *
 */
export function makeMapBoxLayer(layer: LayerI): AnyLayer[] {
  if (layer.type === "vector") {
    let fillColor: any = getThemeColor();
    let strokeColor: any = "#000000";

    // Apply ArcGIS style if available

    if (layer.styleInfo) {
      if (layer.styleInfo.type === "uniqueValue" && layer.styleInfo.field1) {
        const field = layer.styleInfo.field1;
        const uniqueValueInfos = layer.styleInfo.uniqueValueInfos || [];

        // Create a match expression for fill color
        // ["match", ["get", "field"], "value1", "color1", "value2", "color2", "defaultColor"]

        // Handle potential case mismatches between ArcGIS renderer and WFS properties
        // e.g. Renderer says "KELDER_STATUS" but WFS returns "Kelder_Status"
        const fieldVariations = [
          field,
          field.toLowerCase(),
          field.toUpperCase(),
          // Title case (e.g. Kelder_Status)
          field.charAt(0).toUpperCase() + field.slice(1).toLowerCase(),
          // Mixed case with underscore (e.g. KELDER_STATUS -> Kelder_Status)
          field.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('_')
        ];

        // Use coalesce to try different field casing
        const getExpression = ["coalesce", ...fieldVariations.map(f => ["get", f])];

        const matchExpression: any[] = ["match", getExpression];


        uniqueValueInfos.forEach(info => {
          if (info.symbol && info.symbol.color) {
            const c = info.symbol.color;
            // ArcGIS color is [r, g, b, a] (0-255)
            const colorString = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] / 255})`;
            matchExpression.push(info.value);
            matchExpression.push(colorString);
          }
        });

        matchExpression.push(getThemeColor());

        fillColor = matchExpression;
      } else if (layer.styleInfo.type === "simple" && layer.styleInfo.symbol) {
        const c = layer.styleInfo.symbol.color;
        if (c) {
          fillColor = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] / 255})`;
        }
      }
    }

    return [
      {
        id: layer.id,
        source: layer.id,
        type: "fill",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: {
          "fill-color": fillColor,
          "fill-opacity": 0.7,
        },
      },
      {
        id: `${layer.id}-line`,
        source: layer.id,
        type: "line",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon", "LineString", "MultiLineString"]]],
        paint: {
          "line-color": strokeColor,
          "line-width": 1,
        },
      },
      {
        id: `${layer.id}-circle`,
        source: layer.id,
        type: "circle",
        filter: ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]],
        paint: {
          "circle-radius": 6,
          "circle-color": fillColor, // Use the same color logic for points
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      },
      {
        id: `${layer.id}-symbol`,
        source: layer.id,
        type: "symbol",
        filter: ["in", ["geometry-type"], ["literal", ["Point", "MultiPoint"]]],
        layout: {
          "text-field": ["get", layer.textField || "TEKST"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-optional": true,
        },
        paint: {
          "text-halo-color": "rgba(255,255,255,0.75)",
          "text-halo-width": 1,
          "text-color": "#000000",
        },
      },
    ];
  }
  return [
    layer.type === "symbol" ? makeSymbolLayer(layer) : makeRasterLayer(layer),
  ];
}

const makeSymbolLayer = (layer: LayerI): SymbolLayer => ({
  id: layer.id,
  source: layer.id,
  type: "symbol",
  layout: {
    "text-field": ["get", layer.textField],
    "icon-image": "my-marker",
    "icon-size": ["get", "size"],
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "symbol-sort-key": ["get", "sort-key"],
    "text-size": 12,
    "icon-padding": 1,
    "text-offset": [0, 1.25],
    "text-anchor": "top",
  },
  paint: {
    "text-halo-color": "rgba(255,255,255,0.75)",
    "text-halo-width": 1,
    "icon-color": ["get", "color"],
  },
});

const makeRasterLayer = (layer: LayerI): RasterLayer => ({
  id: layer.id,
  type: "raster",
  source: "raster-tiles",
  minzoom: 0,
  maxzoom: 22,
});

export const bagLayer: SymbolLayer = {
  id: bagLayerId,
  source: bagLayerId,
  type: "symbol",
  layout: {
    "text-field": ["get", "title"],
    "icon-image": ["get", "icon"],
    "icon-size": ["get", "size"],
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "text-offset": [0, 1.25],
    "text-anchor": "top",
    "symbol-sort-key": ["get", "sort-key"],
    "text-size": ["get", "text-size"],
    "icon-padding": 1,
  },
  paint: {
    "text-halo-color": "rgba(255,255,255,0.75)",
    "text-halo-width": 1,
    "icon-color": ["get", "color"],
  },
};
