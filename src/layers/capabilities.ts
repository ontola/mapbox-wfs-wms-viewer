import { LayerI, Service } from "./LayerTypes";

// Timeout for service requests in milliseconds (30 seconds)
const SERVICE_REQUEST_TIMEOUT = 30000;

export interface CapabilitiesResult {
  xmlDoc: Document;
  text: string;
}

/**
 * Creates a promise that rejects after a specified timeout
 */
const createTimeoutPromise = (timeoutMs: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
};

/**
 * Helper function to handle CORS issues with timeout
 * Tries direct fetch, then CORS proxy, then alternative proxy
 */
export const fetchWithCorsProxy = async (url: string): Promise<Response> => {
  try {
    // First try direct fetch with timeout
    const fetchPromise = fetch(url);
    const timeoutPromise = createTimeoutPromise(SERVICE_REQUEST_TIMEOUT);

    const directResponse = await Promise.race([fetchPromise, timeoutPromise]);
    if (directResponse.ok) {
      return directResponse;
    }
    console.log(`Direct fetch failed for ${url}, trying with CORS proxy`);

    try {
      const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const proxyResponse = await Promise.race([
        fetch(corsProxyUrl),
        createTimeoutPromise(SERVICE_REQUEST_TIMEOUT),
      ]);
      if (proxyResponse.ok) {
        return proxyResponse;
      }
    } catch (proxyError) {
      console.error(`CORS proxy failed for ${url}`, proxyError);
    }

    // If CORS proxy fails, try with another proxy
    try {
      const altProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        url,
      )}`;
      const altProxyResponse = await Promise.race([
        fetch(altProxyUrl),
        createTimeoutPromise(SERVICE_REQUEST_TIMEOUT),
      ]);
      if (altProxyResponse.ok) {
        return altProxyResponse;
      }
    } catch (altProxyError) {
      console.error(`Alternative proxy failed for ${url}`, altProxyError);
    }

    // If all proxies fail, return the original response
    return directResponse;
  } catch (error) {
    console.error(`Error with direct fetch for ${url}`, error);

    // Try with CORS proxy
    try {
      const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const proxyResponse = await Promise.race([
        fetch(corsProxyUrl),
        createTimeoutPromise(SERVICE_REQUEST_TIMEOUT),
      ]);
      if (proxyResponse.ok) {
        return proxyResponse;
      }
    } catch (proxyError) {
      console.error(`CORS proxy failed for ${url}`, proxyError);
    }

    // Try with alternative proxy
    try {
      const altProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
        url,
      )}`;
      const altProxyResponse = await Promise.race([
        fetch(altProxyUrl),
        createTimeoutPromise(SERVICE_REQUEST_TIMEOUT),
      ]);
      if (altProxyResponse.ok) {
        return altProxyResponse;
      }
    } catch (altProxyError) {
      console.error(`Alternative proxy failed for ${url}`, altProxyError);
    }

    // If all fails, throw the original error
    throw error;
  }
};

/**
 * Generic function to fetch service capabilities
 * @param serviceUrl The URL of the service
 * @param serviceType The type of service ('WFS' or 'WMS')
 * @returns The XML document and response text
 */
export const fetchCapabilities = async (
  serviceUrl: string,
  serviceType: "WFS" | "WMS",
): Promise<CapabilitiesResult> => {
  // Parse the URL to properly handle existing query parameters
  const url = new URL(serviceUrl);
  url.searchParams.set("request", "GetCapabilities");
  url.searchParams.set("service", serviceType);
  const capabilitiesURL = url.toString();
  const response = await fetchWithCorsProxy(capabilitiesURL);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");

  return { xmlDoc, text };
};

/**
 * Process WFS service capabilities and extract layers
 */
export const parseWFSCapabilities = (
  xmlDoc: Document,
  text: string,
  service: Service,
): LayerI[] => {
  // Try both namespaced and non-namespaced element names
  let featureTypeNodes = xmlDoc.getElementsByTagNameNS(
    "http://www.opengis.net/wfs/2.0",
    "FeatureType",
  );
  if (featureTypeNodes.length === 0) {
    featureTypeNodes = xmlDoc.getElementsByTagName("FeatureType");
  }

  const layers: LayerI[] = Array.from(featureTypeNodes).map((node) => {
    // Try to get Name with namespace first, then without
    const nameElement =
      node.getElementsByTagNameNS(
        "http://www.opengis.net/wfs/2.0",
        "Name",
      )[0] || node.getElementsByTagName("Name")[0];
    const titleElement =
      node.getElementsByTagNameNS(
        "http://www.opengis.net/wfs/2.0",
        "Title",
      )[0] || node.getElementsByTagName("Title")[0];

    // Extract bounds from WGS84BoundingBox
    let bounds: [number, number, number, number] | undefined;

    // Try different namespace versions and tag formats
    const boundingBoxElement =
      node.getElementsByTagNameNS(
        "http://www.opengis.net/ows/1.1",
        "WGS84BoundingBox",
      )[0] ||
      node.getElementsByTagNameNS(
        "http://www.opengis.net/ows",
        "WGS84BoundingBox",
      )[0] ||
      node.getElementsByTagName("ows:WGS84BoundingBox")[0] ||
      node.getElementsByTagName("WGS84BoundingBox")[0];

    if (boundingBoxElement) {
      const lowerCorner =
        boundingBoxElement.getElementsByTagNameNS(
          "http://www.opengis.net/ows/1.1",
          "LowerCorner",
        )[0] ||
        boundingBoxElement.getElementsByTagNameNS(
          "http://www.opengis.net/ows",
          "LowerCorner",
        )[0] ||
        boundingBoxElement.getElementsByTagName("ows:LowerCorner")[0] ||
        boundingBoxElement.getElementsByTagName("LowerCorner")[0];

      const upperCorner =
        boundingBoxElement.getElementsByTagNameNS(
          "http://www.opengis.net/ows/1.1",
          "UpperCorner",
        )[0] ||
        boundingBoxElement.getElementsByTagNameNS(
          "http://www.opengis.net/ows",
          "UpperCorner",
        )[0] ||
        boundingBoxElement.getElementsByTagName("ows:UpperCorner")[0] ||
        boundingBoxElement.getElementsByTagName("UpperCorner")[0];

      if (lowerCorner?.textContent && upperCorner?.textContent) {
        const [west, south] = lowerCorner.textContent
          .trim()
          .split(/\s+/)
          .map(Number);
        const [east, north] = upperCorner.textContent
          .trim()
          .split(/\s+/)
          .map(Number);
        bounds = [west, south, east, north];
        console.log(
          `Found WFS bounds for ${titleElement?.textContent || nameElement?.textContent}:`,
          bounds,
        );
      }
    }

    return {
      name: titleElement?.textContent || nameElement?.textContent || "",
      id: nameElement?.textContent || "",
      visible: false,
      type: "vector" as const,
      url: service.url,
      textField: service.textField,
      serviceId: service.name,
      description:
        node.getElementsByTagName("Abstract")[0]?.textContent || undefined,
      bounds,
    };
  });

  // Log if no layers were found
  if (layers.length === 0 && text.length > 0) {
    console.warn(
      `No layers found for WFS service: ${service.name}. The service may not have any FeatureTypes defined.`,
    );
  }

  return layers;
};

/**
 * Process WMS service capabilities and extract layers
 */
export const parseWMSCapabilities = (
  xmlDoc: Document,
  text: string,
  service: Service,
): LayerI[] => {
  const layerNodes = xmlDoc.getElementsByTagName("Layer");

  // Special handling for ESRI MapServer WMS services
  const isEsriService =
    text.includes("xmlns:esri_wms") ||
    service.url.includes("MapServer/WMSServer");

  const wmsLayers: LayerI[] = [];
  const processedIds = new Set<string>(); // Track processed IDs to avoid duplicates

  // Helper function to create a unique ID for ESRI layers
  const createUniqueLayerId = (
    id: string,
    parentId: string = "",
    depth: number = 0,
  ): string => {
    // For ESRI services, create a more unique ID by combining parent ID and layer ID
    if (isEsriService) {
      return parentId ? `${parentId}_${id}_${depth}` : id;
    }
    return id;
  };

  // Helper function to process a layer node and its children
  const processLayerNode = (
    node: Element,
    parentId: string = "",
    depth: number = 0,
  ) => {
    let nameElement: Element | null = null;
    let titleElement: Element | null = null;

    for (let j = 0; j < node.children.length; j++) {
      const child = node.children[j];
      const childName = child.localName || child.tagName;
      if (childName === "Name") nameElement = child;
      if (childName === "Title") titleElement = child;
    }

    if (!nameElement) return;

    const name = titleElement?.textContent || nameElement.textContent || "";
    const originalId = nameElement.textContent || "";

    if (name && originalId) {
      // Create a unique ID for this layer
      const uniqueId = createUniqueLayerId(originalId, parentId, depth);

      // Check if we've already processed this ID
      if (!processedIds.has(uniqueId)) {
        processedIds.add(uniqueId);

        // Extract bounds
        let bounds: [number, number, number, number] | undefined;

        // Try EX_GeographicBoundingBox first (WMS 1.3.0)
        const geogBBox = node.getElementsByTagName(
          "EX_GeographicBoundingBox",
        )[0];
        if (geogBBox) {
          const west = parseFloat(
            geogBBox.getElementsByTagName("westBoundLongitude")[0]
              ?.textContent || "",
          );
          const east = parseFloat(
            geogBBox.getElementsByTagName("eastBoundLongitude")[0]
              ?.textContent || "",
          );
          const south = parseFloat(
            geogBBox.getElementsByTagName("southBoundLatitude")[0]
              ?.textContent || "",
          );
          const north = parseFloat(
            geogBBox.getElementsByTagName("northBoundLatitude")[0]
              ?.textContent || "",
          );

          if (!isNaN(west) && !isNaN(east) && !isNaN(south) && !isNaN(north)) {
            bounds = [west, south, east, north];
            console.log(
              `Found WMS bounds for ${name} (EX_GeographicBoundingBox):`,
              bounds,
            );
          }
        }

        // Fallback to LatLonBoundingBox (WMS 1.1.1)
        if (!bounds) {
          const latLonBBox = node.getElementsByTagName("LatLonBoundingBox")[0];
          if (latLonBBox) {
            const minx = parseFloat(latLonBBox.getAttribute("minx") || "");
            const miny = parseFloat(latLonBBox.getAttribute("miny") || "");
            const maxx = parseFloat(latLonBBox.getAttribute("maxx") || "");
            const maxy = parseFloat(latLonBBox.getAttribute("maxy") || "");

            if (!isNaN(minx) && !isNaN(miny) && !isNaN(maxx) && !isNaN(maxy)) {
              bounds = [minx, miny, maxx, maxy];
              console.log(
                `Found WMS bounds for ${name} (LatLonBoundingBox):`,
                bounds,
              );
            }
          }
        }

        wmsLayers.push({
          name,
          id: originalId, // Keep the original ID for the service request
          visible: false,
          type: "raster",
          url: service.url,
          serviceId: service.name,
          // Store the unique ID as a property for React keys
          uniqueId: uniqueId,
          description:
            node.getElementsByTagName("Abstract")[0]?.textContent || undefined,
          bounds,
        } as LayerI);
      }
    }

    // Process child layers if any
    const childLayers = node.getElementsByTagName("Layer");
    for (let i = 0; i < childLayers.length; i++) {
      processLayerNode(childLayers[i], originalId, depth + 1);
    }
  };

  // Process all top-level layer nodes
  for (let i = 0; i < layerNodes.length; i++) {
    processLayerNode(layerNodes[i]);
  }

  // If no layers were found and this is an ESRI service, try alternative approaches
  if (wmsLayers.length === 0 && isEsriService) {
    // Try to find layers in ESRI-specific locations
    try {
      // Try different selectors that might work for ESRI services
      const selectors = [
        "Capability Layer Layer",
        "Layer > Layer",
        "Capability > Layer > Layer",
      ];

      for (const selector of selectors) {
        const esriNodes = xmlDoc.querySelectorAll(selector);

        if (esriNodes.length > 0) {
          // Process these nodes
          for (let i = 0; i < esriNodes.length; i++) {
            const node = esriNodes[i];
            const nameElement = node.querySelector("Name");

            if (!nameElement) continue;

            const name =
              node.querySelector("Title")?.textContent ||
              nameElement.textContent ||
              "";
            const id = nameElement.textContent || "";
            const uniqueId = `${id}_${i}`;

            if (name && id && !processedIds.has(uniqueId)) {
              processedIds.add(uniqueId);
              wmsLayers.push({
                name,
                id,
                visible: false,
                type: "raster",
                url: service.url,
                serviceId: service.name,
                uniqueId,
                description:
                  node.querySelector("Abstract")?.textContent || undefined,
              } as LayerI);
            }
          }

          // If we found layers, break out of the loop
          if (wmsLayers.length > 0) {
            break;
          }
        }
      }
    } catch (err) {
      console.error("Error processing ESRI-specific layers:", err);
    }
  }

  // If no layers were found but we got a response, create a fallback layer
  if (wmsLayers.length === 0) {
    // Extract a layer ID from the URL if possible
    let fallbackId = "";
    if (service.url.includes("MapServer")) {
      // For ESRI MapServer, use 0 as the default layer ID
      fallbackId = "0";
    } else {
      // Try to extract a meaningful ID from the URL
      const urlParts = service.url.split("/");
      const lastPart = urlParts[urlParts.length - 1];
      fallbackId = lastPart || "layer";
    }

    // Create a fallback layer
    wmsLayers.push({
      name: `${service.name} (Default Layer)`,
      id: fallbackId,
      visible: false,
      type: "raster",
      url: service.url,
      serviceId: service.name,
      uniqueId: `${service.name}_${fallbackId}`,
    } as LayerI);
  }

  return wmsLayers;
};
