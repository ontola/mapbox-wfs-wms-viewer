# Mapbox WFS WMS viewer

Open source web application to view WFS and WMS (GIS) layers. Built on React & MapBoxGL.

## Features

- **Sharable state**: Encodes selected layers and map position in URL
- **High performance (GPU rendering)**: Uses MapboxGL for fast vector tile rendering
- **Layer discovery**: Add a WFS or WMS service URL to automatically discover layers
- **Vector layers**: WFS layers are rendered as vector tiles (shapes, points, lines), shows more info on hover
- **Raster layers**: WMS layers are rendered as raster tiles (images)
- **Auto Navigation**: Opening a link or layer moves to that location
- **ArcGIS legends**: WMS layers legends are shown in sidebar

## URL Parameters

The map viewer can be controlled via URL search parameters. This allows you to construct and share specific views.

- `service` (string): URL to a WFS or WMS service. The app will automatically discover and load the first layer from this service.
- `layers` (string): A base64-encoded JSON array of layer objects.
- `lat` (number): Latitude of the map center (e.g., `52.0000`).
- `lng` (number): Longitude of the map center (e.g., `5.0000`).
- `zoom` (number): Zoom level of the map (e.g., `7.50`).

### Example: Setting Map View

`http://localhost:3030/?lat=52.08&lng=5.11&zoom=10`

### Example: Loading a Service

`http://localhost:3030/?service=https://services.nijmegen.nl/geoservices/extern_Cultuurhistorie/ows?request=getCapabilities&service=WMS`

### Encoding layers

To manually construct the `layers` parameter, create a JSON array of layer objects and encode it using `btoa()` in JavaScript (Base64).

**JavaScript Example:**

```javascript
const layers = [
  {
    id: "layer-1",
    name: "My WFS Layer",
    url: "https://example.com/wfs",
    type: "wfs", // "wfs" | "wms"
    serviceId: "service-1",
    textField: "name" // Optional property for rendering labels
  }
];
const layersParam = btoa(JSON.stringify(layers));
const url = `http://localhost:3030/?layers=${layersParam}`;
```

## Tested WFS / WMS service URLs

- https://dservices-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/services/Werfkelders/WFSServer
- https://services.nijmegen.nl/geoservices/extern_Cultuurhistorie/ows?request=getCapabilities&service=WMS
- https://geoportaaloss.oss.nl/arcgis/services/Dataportaal/Bijzondere_Bomen/MapServer/WMSServer

## Issue tracking

Previously done on a
[private Bitbucket](https://bitbucket.org/coherenza/gebouwenpaspoort/issues),
now in Github issues.

## Local development

```sh
# Install NPM dependencies
pnpm i
# Run server locally
pnpm dev
# Visit http://localhost:3030
```
