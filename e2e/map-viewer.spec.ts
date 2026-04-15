import { test, expect } from "@playwright/test";

test.describe("Map Viewer", () => {
  test("should load and render layers from URL", async ({ page }) => {
    // Create a URL with Utrecht Werfkelders layers
    const layerData = [
      {
        id: "Werfkelders:Werfkelder",
        name: "Werfkelder",
        url: "https://dservices-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/services/Werfkelders/WFSServer",
        type: "vector",
        serviceId: "Utrecht Werfkelders WFS",
        visible: true,
      },
    ];

    const encodedLayers = btoa(JSON.stringify(layerData));
    const testUrl = `/?layers=${encodedLayers}&lat=52.0971&lng=5.1167&zoom=16`;

    // Navigate to the app with the URL
    await page.goto(testUrl);

    // Wait for the map to load
    await page.waitForSelector(".mapboxgl-canvas", { timeout: 10000 });

    // Wait for layer selector to be available
    await page.waitForSelector('[data-testid="layer-selector"]', {
      timeout: 5000,
    });

    // Expand the group "Utrecht Werfkelders WFS"
    await page.click("text=Utrecht Werfkelders WFS");

    // Check that the layer appears in the layer list
    // Use data-layer-id to be specific and avoid strict mode violations
    const checkbox = page.locator('[data-layer-id="Werfkelders:Werfkelder"]');
    await expect(checkbox).toBeVisible({ timeout: 10000 });

    // Verify the layer is checked/visible
    await expect(checkbox).toBeChecked({ timeout: 5000 });

    // Wait a bit for the layer to render on the map
    await page.waitForTimeout(2000);

    // Take a screenshot to verify visual rendering
    await page.screenshot({ path: "e2e/screenshots/layer-rendered.png" });

    // Verify URL contains the layer information
    const url = page.url();
    expect(url).toContain("layers=");
    expect(url).toContain("lat=52.0971");
    expect(url).toContain("lng=5.1167");
  });

  test("should toggle layer visibility", async ({ page }) => {
    // Start with a layer enabled
    const layerData = [
      {
        id: "Werfkelders:Openingen_werfkelders",
        name: "Openingen_werfkelders",
        url: "https://dservices-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/services/Werfkelders/WFSServer",
        type: "vector",
        serviceId: "Utrecht Werfkelders WFS",
        visible: true,
      },
    ];

    const encodedLayers = btoa(JSON.stringify(layerData));
    await page.goto(`/?layers=${encodedLayers}&lat=52.0971&lng=5.1167&zoom=16`);

    // Wait for map to load
    await page.waitForSelector(".mapboxgl-canvas");

    // Expand the group
    await page.click("text=Utrecht Werfkelders WFS");

    // Find and click the layer checkbox to toggle it off
    const checkbox = page.locator(
      '[data-layer-id="Werfkelders:Openingen_werfkelders"]',
    );
    await checkbox.click();

    // Verify checkbox is now unchecked
    await expect(checkbox).not.toBeChecked();

    // Verify URL no longer contains layers parameter (no visible layers)
    await page.waitForTimeout(1000); // Wait for URL update
    const newUrl = page.url();
    expect(newUrl).not.toContain("layers=");
  });

  test("should update URL when panning map", async ({ page }) => {
    await page.goto("/?lat=52.0907&lng=5.1213&zoom=11");

    // Wait for map to load
    await page.waitForSelector(".mapboxgl-canvas");

    // Get initial URL
    const initialUrl = page.url();

    // Pan the map by dragging from center
    const canvas = page.locator(".mapboxgl-canvas");
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // Use steps to simulate a real drag
      await page.mouse.move(
        box.x + box.width / 2 + 500,
        box.y + box.height / 2 + 500,
        { steps: 20 },
      );
      await page.waitForTimeout(1000); // Wait while mouse is down
      await page.mouse.up();
    }

    // Wait for URL to update (debounced by 500ms)
    await page.waitForTimeout(1500);

    // Verify URL has changed
    const newUrl = page.url();
    expect(newUrl).not.toBe(initialUrl);
    expect(newUrl).toContain("lat=");
    expect(newUrl).toContain("lng=");
  });
});
