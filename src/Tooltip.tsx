import { useRef, useEffect, useState } from "react";
import "./Tooltip.css";

const hiddenProps = ["id", "geometry", "title", "color", "icon", "size", "sort-key", "text-size"];

/** Shown when hovering over an item in the map */
export function ToolTip({ feature, x, y }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight } = containerRef.current;
        setIsOverflowing(scrollHeight > clientHeight);
      }
    };

    checkOverflow();
    // Re-check on feature change as content size changes
  }, [feature]);

  return (
    <div
      ref={containerRef}
      className={`tooltip ${isOverflowing ? "tooltip--overflowing" : ""}`}
      style={{ left: x, top: y }}
    >
      {/* show all properties as key values */}
      {Object.keys(feature.properties).map((key) =>
        hiddenProps.includes(key) ? null : (
          <div key={key}>
            <div className="tooltip__key">{key}</div>
            <div className="tooltip__val">{feature.properties[key]}</div>
          </div>
        ),
      )}
    </div>
  );
}
