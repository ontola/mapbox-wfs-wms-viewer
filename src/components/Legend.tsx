import React from "react";
import { LayerI } from "../layers/LayerTypes";

interface LegendProps {
  layer: LayerI;
}

export const Legend: React.FC<LegendProps> = ({ layer }) => {
  if (!layer.styleInfo) {
    return null;
  }

  const { styleInfo } = layer;

  if (styleInfo.type === "uniqueValue" && styleInfo.uniqueValueInfos) {
    return (
      <div className="legend">
        <div className="legend-title">Legenda ({styleInfo.field1})</div>
        <div className="legend-items">
          {styleInfo.uniqueValueInfos.map((info, index) => {
            if (!info.symbol || !info.symbol.color) return null;
            const c = info.symbol.color;
            const colorString = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] / 255})`;

            return (
              <div key={index} className="legend-item">
                <div
                  className="legend-swatch"
                  style={{ backgroundColor: colorString, border: '1px solid #ccc' }}
                />
                <span className="legend-label">{info.label || info.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (styleInfo.type === "simple" && styleInfo.symbol && styleInfo.symbol.color) {
    const c = styleInfo.symbol.color;
    const colorString = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3] / 255})`;

    return (
      <div className="legend">
        <div className="legend-item">
          <div
            className="legend-swatch"
            style={{ backgroundColor: colorString, border: '1px solid #ccc' }}
          />
          <span className="legend-label">{layer.name}</span>
        </div>
      </div>
    );
  }

  return null;
};
