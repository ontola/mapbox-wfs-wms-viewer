import { test, expect } from "@playwright/test";
import { DEMOS } from "../src/demoServices";

// Mock responses per service type
function mockWfsCapabilities(layerName: string, layerTitle: string) {
  return `
    <wfs:WFS_Capabilities version="2.0.0" xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:ows="http://www.opengis.net/ows/1.1">
      <ows:ServiceIdentification>
        <ows:Title>Test WFS Service</ows:Title>
      </ows:ServiceIdentification>
      <FeatureType>
        <Name>${layerName}</Name>
        <Title>${layerTitle}</Title>
        <ows:WGS84BoundingBox>
          <ows:LowerCorner>4.0 51.0</ows:LowerCorner>
          <ows:UpperCorner>6.0 53.0</ows:UpperCorner>
        </ows:WGS84BoundingBox>
      </FeatureType>
    </wfs:WFS_Capabilities>
  `;
}

function mockWmsCapabilities(layerName: string, layerTitle: string) {
  return `
    <WMS_Capabilities version="1.3.0" xmlns="http://www.opengis.net/wms">
      <Service><Name>WMS</Name><Title>Test WMS Service</Title></Service>
      <Capability>
        <Layer>
          <Title>Test WMS Service</Title>
          <Layer>
            <Name>${layerName}</Name>
            <Title>${layerTitle}</Title>
            <EX_GeographicBoundingBox>
              <westBoundLongitude>4.0</westBoundLongitude>
              <eastBoundLongitude>6.0</eastBoundLongitude>
              <southBoundLatitude>51.0</southBoundLatitude>
              <northBoundLatitude>53.0</northBoundLatitude>
            </EX_GeographicBoundingBox>
          </Layer>
        </Layer>
      </Capability>
    </WMS_Capabilities>
  `;
}

function mockArcGisMetadata(serviceName: string) {
  return {
    name: serviceName,
    serviceDescription: `Test ${serviceName}`,
    layers: [
      { id: 0, name: "Test Layer 0", parentLayerId: -1, defaultVisibility: true },
      { id: 1, name: "Test Layer 1", parentLayerId: -1, defaultVisibility: true },
    ],
  };
}

function mockGeoJson() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Test Point" },
        geometry: { type: "Point", coordinates: [5.0, 52.0] },
      },
    ],
  };
}

test.describe("Demo Services", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(
      (url) =>
        url.href.includes("corsproxy.io") ||
        url.href.includes("api.allorigins.win"),
      async (route) => await route.abort(),
    );
  });

  for (const demo of DEMOS) {
    test(`should load ${demo.name} (${demo.type})`, async ({ page }) => {
      const serviceBase = demo.service.split("?")[0];

      if (demo.type === "WFS") {
        const layerId = demo.layerId || "test:layer";
        const layerLocal = layerId.includes(":") ? layerId.split(":")[1] : layerId;

        // Mock GetCapabilities for WFS
        await page.route(
          (url) =>
            url.href.includes(serviceBase) &&
            (url.searchParams.get("request") === "GetCapabilities" ||
              url.searchParams.get("request") === "getCapabilities") &&
            (url.searchParams.get("service") === "WFS" ||
              url.searchParams.get("SERVICE") === "WFS"),
          async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "text/xml",
              body: mockWfsCapabilities(layerId, layerLocal),
            });
          },
        );

        // Fail WMS capabilities
        await page.route(
          (url) =>
            url.href.includes(serviceBase) &&
            (url.searchParams.get("request") === "GetCapabilities" ||
              url.searchParams.get("request") === "getCapabilities") &&
            (url.searchParams.get("service") === "WMS" ||
              url.searchParams.get("SERVICE") === "WMS"),
          async (route) => {
            await route.fulfill({ status: 404 });
          },
        );

        // Mock GetFeature requests
        await page.route(
          (url) =>
            url.href.includes(serviceBase) &&
            (url.searchParams.get("request") === "GetFeature" ||
              url.searchParams.get("REQUEST") === "GetFeature"),
          async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(mockGeoJson()),
            });
          },
        );
      } else if (demo.type === "WMS") {
        // Fail WFS capabilities
        await page.route(
          (url) =>
            url.href.includes(serviceBase) &&
            (url.searchParams.get("request") === "GetCapabilities" ||
              url.searchParams.get("request") === "getCapabilities") &&
            (url.searchParams.get("service") === "WFS" ||
              url.searchParams.get("SERVICE") === "WFS"),
          async (route) => {
            await route.fulfill({ status: 404 });
          },
        );

        // Mock GetCapabilities for WMS
        await page.route(
          (url) =>
            url.href.includes(serviceBase) &&
            (url.searchParams.get("request") === "GetCapabilities" ||
              url.searchParams.get("request") === "getCapabilities") &&
            (url.searchParams.get("service") === "WMS" ||
              url.searchParams.get("SERVICE") === "WMS"),
          async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "text/xml",
              body: mockWmsCapabilities("test_layer", demo.name),
            });
          },
        );
      } else if (demo.type === "ArcGIS") {
        // Extract service name from URL
        const urlParts = serviceBase.split("/");
        const serverIdx = urlParts.findIndex((p) => p === "FeatureServer" || p === "MapServer");
        const serviceName = serverIdx > 0 ? urlParts[serverIdx - 1] : "TestService";

        await page.route(
          (url) => url.href.startsWith(serviceBase) && url.searchParams.get("f") === "json",
          async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(mockArcGisMetadata(serviceName)),
            });
          },
        );

        // Mock query endpoints for ArcGIS layer data
        await page.route(
          (url) => url.href.includes(serviceBase) && url.href.includes("/query"),
          async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(mockGeoJson()),
            });
          },
        );

        // Fail capabilities for ArcGIS URLs
        await page.route(
          (url) =>
            url.href.includes(serviceBase) &&
            url.searchParams.get("request") === "GetCapabilities",
          async (route) => {
            await route.fulfill({ status: 404 });
          },
        );
      } else if (demo.type === "JSON") {
        // Mock the JSON URL — match the service URL including query params
        await page.route(
          (url) => url.href.startsWith(serviceBase),
          async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(mockGeoJson()),
            });
          },
        );
      }

      // Build the URL the same way the DemoUrls component does
      const params = new URLSearchParams();
      params.set("service", demo.service);
      params.set("name", demo.name);
      if (demo.color) params.set("color", demo.color);
      if (demo.layerId) params.set("layerId", demo.layerId);

      await page.goto(`/?${params.toString()}`);

      // Wait for the layer selector to appear
      await page.waitForSelector('[data-testid="layer-selector"]', {
        timeout: 15000,
      });

      // Verify at least one layer is listed
      const layerItems = page.locator('[data-testid="layer-selector"] .custom-checkbox-container');
      await expect(layerItems.first()).toBeVisible({ timeout: 15000 });
    });
  }
});
