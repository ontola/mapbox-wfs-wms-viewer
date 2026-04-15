import { LayerI } from "./LayerTypes";
import { bagLayerId } from "./LayerTypes";
import { Service } from "./LayerTypes";

// Keep the BAG layer definition for reference, but don't include it in the default layers
export const BAGLayer: LayerI = {
  name: "BAG items",
  id: bagLayerId,
  visible: true,
  type: "symbol",
};

export const layersDefault: LayerI[] = [];

export const services: Service[] = [];
