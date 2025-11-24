import { ArcGISRenderer } from "./LayerTypes";

/**
 * Checks if a URL is likely an ArcGIS WFS service
 */
export const isArcGISWfsUrl = (url: string): boolean => {
  return url.includes("/arcgis/services/") && url.includes("/WFSServer");
};

/**
 * Converts a WFS URL to a Feature Service URL
 * e.g. https://.../arcgis/services/Werfkelders/WFSServer -> https://.../arcgis/rest/services/Werfkelders/FeatureServer
 */
export const getFeatureServiceUrl = (wfsUrl: string): string => {
  // Replace /services/ with /rest/services/ if needed (some servers need this, others don't, but usually it's safe to try)
  // And replace WFSServer with FeatureServer
  let url = wfsUrl.replace("/WFSServer", "/FeatureServer");

  // Check if we need to inject /rest/
  if (!url.includes("/rest/services/") && url.includes("/services/")) {
    url = url.replace("/services/", "/rest/services/");
  }

  // Handle dservices -> services domain change for ArcGIS Online hosted services
  if (url.includes("dservices")) {
    url = url.replace("dservices", "services");
  }

  return url;
};

/**
 * Fetches layer metadata from an ArcGIS Feature Service
 */
export const fetchArcGISLayerMetadata = async (
  featureServiceUrl: string,
  layerId: string
): Promise<{ drawingInfo?: { renderer: ArcGISRenderer } } | null> => {
  try {
    const url = `${featureServiceUrl}/${layerId}?f=json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ArcGIS metadata: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching ArcGIS layer metadata:", error);
    return null;
  }
};

/**
 * Tries to find the layer ID in the Feature Service that corresponds to a WFS layer name.
 * This is a bit of a guess, but often WFS layer names are like "Service_Name:Layer_Name" or just "Layer_Name".
 * ArcGIS Feature Services use integer IDs (0, 1, 2...).
 * We might need to fetch the main FeatureServer metadata to map names to IDs.
 */
export const findLayerIdByName = async (
  featureServiceUrl: string,
  wfsLayerName: string
): Promise<string | null> => {
  try {
    const url = `${featureServiceUrl}?f=json`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.layers) return null;

    // Clean up WFS layer name (remove namespace if present)
    // e.g. "Werfkelders:Werfkelder" -> "Werfkelder"
    const cleanName = wfsLayerName.includes(":")
      ? wfsLayerName.split(":")[1]
      : wfsLayerName;

    console.log(`Looking for ArcGIS layer matching: ${cleanName} (original: ${wfsLayerName})`);

    // Try to find a match
    const layer = data.layers.find((l: any) => {
      const lName = l.name;
      // Exact match
      if (lName === cleanName) return true;
      // Case insensitive
      if (lName.toLowerCase() === cleanName.toLowerCase()) return true;
      // Partial match (if cleanName contains lName or vice versa)
      // Be careful with this, but for "Werfkelder" vs "Werfkelders" it might help
      if (cleanName.includes(lName) || lName.includes(cleanName)) return true;

      return false;
    });

    if (layer) {
      console.log(`Found matching ArcGIS layer: ${layer.name} (${layer.id})`);
      return layer.id.toString();
    }

    // Fallback: if there's only one layer, use it?
    // Or if the WFS layer name looks like "Werfkelder" and we have a layer named "Werfkelder"

    return null;
  } catch (error) {
    console.error("Error finding ArcGIS layer ID:", error);
    return null;
  }
};
