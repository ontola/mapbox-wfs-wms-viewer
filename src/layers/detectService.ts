import { Service } from "./LayerTypes";
import { fetchCapabilities } from "./capabilities";

/**
 * Attempts to detect if a URL is a WFS, WMS, JSON, or ArcGIS FeatureServer service
 * @param url The URL to check
 * @returns An object with the detected service type and a service object
 */
export async function detectServiceType(url: string): Promise<{
  type: "WFS" | "WMS" | "JSON" | "CSV" | "ArcGIS_FeatureServer" | null;
  service: Service | null;
  error?: string;
}> {
  // Clean the URL by removing any existing query parameters for WFS/WMS base URL detection
  let baseUrl = url.split("?")[0];

  try {
    // 1. Check if it's explicitly a JSON/GeoJSON resource based on the URL
    //    But NOT if it's a WFS GetFeature request (those should go through WFS detection with bbox)
    const hasJsonOutput = url.includes("outputFormat=application/json") || url.includes("f=geojson");
    const hasGetFeature = url.includes("request=GetFeature") || url.includes("REQUEST=GetFeature");
    const isDirectJsonUrl =
      url.toLowerCase().endsWith(".json") ||
      url.toLowerCase().endsWith(".geojson") ||
      url.includes("f=json") ||
      (hasJsonOutput && hasGetFeature);
    if (isDirectJsonUrl) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          // We don't strictly need to parse the whole JSON here, but it verifies it's valid
          await response.json(); 
          
          // Extract a meaningful name from the URL path
          const urlParts = baseUrl.split("/");
          let title = urlParts.pop() || "JSON Data";

          if (title.endsWith('.json') || title.endsWith('.geojson')) {
            title = title.replace(/\.geojson$/, '').replace(/\.json$/, '');
          }

          // If it's a WFS GetFeature URL, try to extract the typeName for a better title
          if (url.includes("typeName=")) {
            const match = url.match(/typeName=([^&]+)/);
            if (match && match[1]) {
              title = match[1].split(':').pop() || title;
            }
          }

          return {
            type: "JSON",
            service: {
              name: title,
              url: url, // Use the full URL for JSON to preserve parameters
              description: `JSON data from: ${url}`,
              type: "JSON",
            },
          };
        }
      } catch (e) {
        console.error("Error fetching JSON:", e);
      }
    }

    // 2. Check if it's a CSV resource based on the URL
    if (url.toLowerCase().endsWith(".csv") || url.toLowerCase().includes(".csv?")) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          // Verify it's text/csv or at least plain text
          const contentType = response.headers.get("content-type") || "";
          const text = await response.text();
          
          if (text.length > 0) {
            // Extract a meaningful name from the URL path
            const urlParts = baseUrl.split("/");
            let title = urlParts.pop() || "CSV Data";
            title = title.replace(/\.csv$/, "");

            return {
              type: "CSV",
              service: {
                name: title,
                url: url,
                description: `CSV data from: ${url}`,
                type: "CSV",
              },
            };
          }
        }
      } catch (e) {
        console.error("Error fetching CSV:", e);
      }
    }

    // 2. Check if it's an ArcGIS FeatureServer or MapServer
    if (baseUrl.includes("/FeatureServer") || baseUrl.includes("/MapServer")) {
      try {
        const response = await fetch(`${baseUrl}?f=json`);
        if (response.ok) {
          const data = await response.json();
          if (data.layers) {
            const urlParts = baseUrl.split("/");
            // Usually the service name is right before FeatureServer/MapServer
            const serverIndex = urlParts.findIndex(p => p === "FeatureServer" || p === "MapServer");
            let title = serverIndex > 0 ? urlParts[serverIndex - 1] : "ArcGIS Service";
            
            // Clean up title
            title = title.replace(/_/g, " ");

            return {
              type: "ArcGIS_FeatureServer",
              service: {
                name: title,
                url: baseUrl,
                description: data.serviceDescription || data.description || `ArcGIS Service: ${title}`,
                type: "ArcGIS_FeatureServer",
              },
            };
          }
        }
      } catch (e) {
        console.error("Error fetching ArcGIS service metadata:", e);
      }
    }

    // 3. Try WFS Capabilities
    try {
      const { xmlDoc, text } = await fetchCapabilities(baseUrl, "WFS");

      // Check if it's a valid WFS response by looking for WFS-specific elements
      if (
        text.includes("<wfs:WFS_Capabilities") ||
        text.includes("<WFS_Capabilities")
      ) {
        // Extract service name from capabilities if possible
        const title =
          xmlDoc.getElementsByTagName("ows:Title")[0]?.textContent ||
          xmlDoc.getElementsByTagName("Title")[0]?.textContent ||
          baseUrl.split("/").pop() ||
          "Unknown Service";

        console.log("Detected WFS service with title:", title);
        return {
          type: "WFS",
          service: {
            name: title,
            url: baseUrl,
            description:
              xmlDoc.getElementsByTagName("Abstract")[0]?.textContent ||
              xmlDoc.getElementsByTagName("ows:Abstract")[0]?.textContent ||
              `Automatically detected WFS service: ${title}`,
            type: "WFS",
          },
        };
      }
    } catch (fetchError) {
      console.error("Error fetching WFS capabilities:", fetchError);
      // Continue to try WMS
    }

    // 4. Try WMS Capabilities
    try {
      const { xmlDoc, text } = await fetchCapabilities(baseUrl, "WMS");

      // Check if it's a valid WMS response
      if (
        text.includes("<WMS_Capabilities") ||
        text.includes("<WMT_MS_Capabilities") ||
        text.includes('xmlns="http://www.opengis.net/wms"') ||
        text.includes("xmlns:esri_wms")
      ) {
        // Try multiple ways to get the service name
        let title = null;

        const serviceTitleElement = xmlDoc.querySelector("Service > Title");
        if (serviceTitleElement && serviceTitleElement.textContent) {
          title = serviceTitleElement.textContent;
        }

        if (!title) {
          const layerTitleElement = xmlDoc.querySelector("Layer > Title");
          if (layerTitleElement && layerTitleElement.textContent) {
            title = layerTitleElement.textContent;
          }
        }

        if (!title) {
          const anyTitleElement = xmlDoc.getElementsByTagName("Title")[0];
          if (anyTitleElement && anyTitleElement.textContent) {
            title = anyTitleElement.textContent;
          }
        }

        if (!title || title === "WMS") {
          const rootLayerName = xmlDoc.querySelector("Layer > Name");
          if (rootLayerName && rootLayerName.textContent) {
            title = rootLayerName.textContent;
          }

          if (!title || title === "WMS") {
            const childLayerName = xmlDoc.querySelector("Layer > Layer > Name");
            if (childLayerName && childLayerName.textContent) {
              title = childLayerName.textContent;
            }
          }
        }

        if (!title || title === "WMS") {
          const urlParts = baseUrl.split("/");
          for (let i = urlParts.length - 2; i >= 0; i--) {
            if (
              urlParts[i] &&
              !["MapServer", "WMSServer", "server", "services"].includes(
                urlParts[i],
              )
            ) {
              title = urlParts[i].replace(/_/g, " ");
              title = title
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
              break;
            }
          }

          if (!title || title === "WMS") {
            title = urlParts.pop() || "WMS Service";
          }
        }

        if (baseUrl.includes("MapServer/WMSServer")) {
          const urlParts = baseUrl.split("/");
          const mapServerIndex = urlParts.findIndex(
            (part) => part === "MapServer",
          );

          if (mapServerIndex > 0) {
            const servicePart = urlParts[mapServerIndex - 1];
            if (
              servicePart &&
              servicePart !== "services" &&
              servicePart !== "server"
            ) {
              title = servicePart.replace(/_/g, " ");
              title = title
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            }
          }
        }

        let description = null;
        const abstractElement =
          xmlDoc.querySelector("Service > Abstract") ||
          xmlDoc.querySelector("Abstract");
        if (abstractElement && abstractElement.textContent) {
          description = abstractElement.textContent;
        } else {
          description = `Automatically detected WMS service: ${title}`;
        }

        return {
          type: "WMS",
          service: {
            name: title,
            url: baseUrl,
            description: description,
            type: "WMS",
          },
        };
      } else {
        if (
          text.includes("not allowed") ||
          text.includes("access denied") ||
          text.includes("unauthorized")
        ) {
          return {
            type: null,
            service: null,
            error: "Access to this service is restricted or not allowed.",
          };
        }

        if (text.length > 0) {
          const urlParts = baseUrl.split("/");
          let title = "Unknown Service";

          for (let i = urlParts.length - 2; i >= 0; i--) {
            if (
              urlParts[i] &&
              !["MapServer", "WMSServer", "server", "services"].includes(
                urlParts[i],
              )
            ) {
              title = urlParts[i].replace(/_/g, " ");
              title = title
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
              break;
            }
          }

          if (baseUrl.endsWith("WMSServer")) {
            return {
              type: "WMS",
              service: {
                name: title,
                url: baseUrl,
                description: `WMS service from: ${baseUrl}`,
                type: "WMS",
              },
              error:
                "Warning: Service responded but couldn't be fully validated. Some layers may not load correctly.",
            };
          }
        }
      }
    } catch (fetchError) {
      console.error("Error fetching WMS capabilities:", fetchError);
      return {
        type: null,
        service: null,
        error: `Network error: ${
          fetchError instanceof Error ? fetchError.message : String(fetchError)
        }. This might be due to CORS restrictions or the service being unavailable.`,
      };
    }

    return {
      type: null,
      service: null,
      error:
        "Could not detect a valid WFS, WMS, JSON, or ArcGIS service at this URL. Check the console for more details.",
    };
  } catch (error) {
    console.error("Error in detectServiceType:", error);
    return {
      type: null,
      service: null,
      error: `Error detecting service: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}
