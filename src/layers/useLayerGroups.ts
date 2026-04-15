import { useMemo } from "react";
import { LayerI } from "./LayerTypes";
import { services } from "./defaultServices";

export interface LayerGroup {
  serviceId: string;
  title: string;
  layers: LayerI[];
}

export function useLayerGroups(layers: LayerI[]): LayerGroup[] {
  return useMemo(() => {
    // Create a map to store layers by group
    const groupedLayers = new Map<string, LayerI[]>();

    // Group layers by service from the services list
    services.forEach((service) => {
      groupedLayers.set(
        service.name,
        layers.filter(
          (layer) =>
            // Match by URL or by serviceId
            layer.url?.startsWith(service.url) ||
            layer.serviceId === service.name,
        ),
      );
    });

    // Also group any remaining layers by their serviceId if not already grouped
    layers.forEach((layer) => {
      if (layer.serviceId && !groupedLayers.has(layer.serviceId)) {
        const serviceLayers = layers.filter(l => l.serviceId === layer.serviceId);
        groupedLayers.set(layer.serviceId, serviceLayers);
      }
    });

    // Convert map to array of LayerGroup objects
    return Array.from(groupedLayers.entries())
      .map(([title, layers]) => {
        return {
          serviceId: title,
          title,
          layers,
        };
      })
      .filter((group) => group.layers.length > 0); // Only return groups with layers
  }, [layers]);
}
