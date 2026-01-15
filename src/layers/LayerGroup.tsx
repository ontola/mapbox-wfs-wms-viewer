import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { ChevronDownIcon, ChevronRightIcon, Share1Icon, CheckIcon } from "@radix-ui/react-icons";
import { LayerCheckbox } from "./LayerCheckbox";
import { LayerI } from "./LayerTypes";

interface LayerGroupProps {
  title: string;
  layers: LayerI[];
  isExpanded?: boolean;
  setSearchTerm: Dispatch<SetStateAction<string>>;
}

export function LayerGroup({ title, layers, isExpanded: defaultExpanded = false, setSearchTerm }: LayerGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showCopied, setShowCopied] = useState(false);

  // Update isExpanded when defaultExpanded changes
  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);

  // Helper function to get a unique key for each layer
  const getLayerKey = (layer: LayerI): string => {
    // Use uniqueId if available (added in our enhanced ESRI layer handling)
    if ((layer as any).uniqueId) {
      return (layer as any).uniqueId;
    }
    // Fall back to the composite ID approach
    return `${layer.serviceId || 'noservice'}-${layer.url || 'nourl'}-${layer.id}`;
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Get service URL from the first layer
    // Remove query params if they exist to get the base service URL
    let serviceUrl = layers.length > 0 ? layers[0].url : "";
    if (serviceUrl) {
      // Basic cleanup of the URL if needed, although detectService handle params
      // We keep it as is because layers[0].url should be the service URL usually

      const url = new URL(window.location.href);
      url.search = "";
      url.searchParams.set("service", serviceUrl);

      navigator.clipboard.writeText(url.toString()).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      });
    }
  };

  return (
    <div className="layer-group">
      <div
        className="layer-group__header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="layer-group__title-container">
          {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          <h4>{title}</h4>
        </div>

        <button
          className="layer-group__share-button"
          onClick={handleShare}
          title="Kopieer link naar deze service"
        >
          {showCopied ? <CheckIcon /> : <Share1Icon />}
        </button>
      </div>
      {isExpanded && (
        <div className="layer-group__content">
          {layers.map((layer) => (
            <LayerCheckbox
              layer={layer}
              key={getLayerKey(layer)}
              setSearchTerm={setSearchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
