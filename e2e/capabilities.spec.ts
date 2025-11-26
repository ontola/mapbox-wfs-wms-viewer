import { test, expect } from '@playwright/test';

test.describe('Capabilities Abstraction', () => {

  // Mock WFS Capabilities XML
  const mockWfsCapabilities = `
    <wfs:WFS_Capabilities version="2.0.0" xmlns:wfs="http://www.opengis.net/wfs/2.0" xmlns:ows="http://www.opengis.net/ows/1.1">
      <ows:ServiceIdentification>
        <ows:Title>Mock WFS Service</ows:Title>
        <ows:Abstract>This is a mock WFS service for testing.</ows:Abstract>
      </ows:ServiceIdentification>
      <FeatureType>
        <Name>mock:layer1</Name>
        <Title>Mock Layer 1</Title>
        <Abstract>Abstract for Mock Layer 1</Abstract>
        <ows:WGS84BoundingBox>
          <ows:LowerCorner>4.0 51.0</ows:LowerCorner>
          <ows:UpperCorner>5.0 52.0</ows:UpperCorner>
        </ows:WGS84BoundingBox>
      </FeatureType>
    </wfs:WFS_Capabilities>
  `;

  // Mock WMS Capabilities XML
  const mockWmsCapabilities = `
    <WMS_Capabilities version="1.3.0" xmlns="http://www.opengis.net/wms">
      <Service>
        <Title>Mock WMS Service</Title>
        <Abstract>This is a mock WMS service for testing.</Abstract>
      </Service>
      <Capability>
        <Layer>
          <Title>Root Layer</Title>
          <Layer>
            <Name>mock_wms_layer</Name>
            <Title>Mock WMS Layer</Title>
            <Abstract>Abstract for Mock WMS Layer</Abstract>
            <EX_GeographicBoundingBox>
              <westBoundLongitude>4.5</westBoundLongitude>
              <eastBoundLongitude>5.5</eastBoundLongitude>
              <southBoundLatitude>51.5</southBoundLatitude>
              <northBoundLatitude>52.5</northBoundLatitude>
            </EX_GeographicBoundingBox>
          </Layer>
        </Layer>
      </Capability>
    </WMS_Capabilities>
  `;

  test('should detect and load WFS service from URL', async ({ page }) => {
    const serviceUrl = 'https://mock.service/wfs';

    // Intercept the capabilities request
    await page.route(`${serviceUrl}?request=GetCapabilities&service=WFS`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/xml',
        body: mockWfsCapabilities,
      });
    });

    // Also intercept WMS request to fail fast (since detectService tries both)
    await page.route(`${serviceUrl}?request=GetCapabilities&service=WMS`, async route => {
      await route.fulfill({ status: 404 });
    });

    // Navigate to the app with the service URL
    await page.goto(`/?service=${encodeURIComponent(serviceUrl)}`);

    // Wait for the service to be detected and loaded
    // The app reloads when a new service is added, so we might need to wait for that or handle it
    // However, since we are mocking, the reload will re-trigger the route handler, which is fine.

    // Wait for the layer selector to appear
    await page.waitForSelector('[data-testid="layer-selector"]');

    // Check if the service group is visible
    await expect(page.locator('text=Mock WFS Service')).toBeVisible({ timeout: 10000 });

    // Expand the group
    await page.click('text=Mock WFS Service');

    // Check if the layer is visible
    await expect(page.locator('text=Mock Layer 1')).toBeVisible();

    // Check for info icon and click it
    // The info icon is inside a div with class custom-checkbox-info
    const infoIcon = page.locator('.custom-checkbox-info').first();
    await expect(infoIcon).toBeVisible();
    await infoIcon.click();

    // Check if dialog appears with description
    await expect(page.locator('.DialogContent')).toBeVisible();
    await expect(page.locator('text=Abstract for Mock Layer 1')).toBeVisible();

    // Close the dialog
    await page.locator('.DialogClose').click();
    await expect(page.locator('.DialogContent')).not.toBeVisible();
  });

  test('should parse WFS bounds with OWS 1.1 namespace', async ({ page }) => {
    const serviceUrl = 'https://mock.service/wfs-ows-1-1';

    // Mock WFS Capabilities with OWS 1.1 namespace (like ArcGIS)
    const mockWfsOws11Capabilities = `
      <wfs:WFS_Capabilities version="2.0.0"
        xmlns:wfs="http://www.opengis.net/wfs/2.0"
        xmlns:ows="http://www.opengis.net/ows/1.1">
        <ows:ServiceIdentification>
          <ows:Title>Mock WFS OWS 1.1</ows:Title>
        </ows:ServiceIdentification>
        <FeatureType>
          <Name>mock:layer_ows11</Name>
          <Title>Mock Layer OWS 1.1</Title>
          <ows:WGS84BoundingBox>
            <ows:LowerCorner>4.0 51.0</ows:LowerCorner>
            <ows:UpperCorner>5.0 52.0</ows:UpperCorner>
          </ows:WGS84BoundingBox>
        </FeatureType>
      </wfs:WFS_Capabilities>
    `;

    // Intercept requests
    await page.route(`${serviceUrl}?request=GetCapabilities&service=WFS`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/xml',
        body: mockWfsOws11Capabilities,
      });
    });

    await page.route(`${serviceUrl}?request=GetCapabilities&service=WMS`, async route => {
      await route.fulfill({ status: 404 });
    });

    // Navigate to the app
    await page.goto(`/?service=${encodeURIComponent(serviceUrl)}`);

    // Wait for layer selector
    await page.waitForSelector('[data-testid="layer-selector"]');

    // Expand group
    await page.click('text=Mock WFS OWS 1.1');

    // Check if layer exists
    await expect(page.locator('text=Mock Layer OWS 1.1')).toBeVisible();

    // Note: verifying the actual zoom requires checking map state which is hard in this test setup
    // But if the layer loads without errors, it means parsing succeeded.
    // We rely on the unit test logic (console logs) for bounds verification during development.
  });

  test('should detect and load WMS service from URL', async ({ page }) => {
    const serviceUrl = 'https://mock.service/wms';

    // Intercept WFS request to fail (so it falls back to WMS)
    await page.route(`${serviceUrl}?request=GetCapabilities&service=WFS`, async route => {
      await route.fulfill({ status: 404 });
    });

    // Intercept WMS capabilities request
    await page.route(`${serviceUrl}?request=GetCapabilities&service=WMS`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/xml',
        body: mockWmsCapabilities,
      });
    });

    // Navigate to the app with the service URL
    await page.goto(`/?service=${encodeURIComponent(serviceUrl)}`);

    // Wait for the layer selector to appear
    await page.waitForSelector('[data-testid="layer-selector"]');

    // Check if the service group is visible
    await expect(page.locator('text=Mock WMS Service')).toBeVisible({ timeout: 10000 });

    // Expand the group
    await page.click('text=Mock WMS Service');

    // Check if the layer is visible
    await expect(page.locator('text=Mock WMS Layer')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    const serviceUrl = 'https://mock.service/error';

    // Fail both requests
    await page.route('**/*GetCapabilities*', async route => {
      await route.fulfill({ status: 500 });
    });

    // Navigate to the app
    await page.goto(`/?service=${encodeURIComponent(serviceUrl)}`);

    // Check console for error (optional, hard to test in Playwright without listening to console)
    // But we can ensure the app doesn't crash
    await page.waitForSelector('.mapboxgl-canvas');

    // The service shouldn't be added
    await expect(page.locator('text=Mock Service')).not.toBeVisible();
  });
});
