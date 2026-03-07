# Mapbox WFS WMS viewer

Open source web application to view WFS, WMS (GIS) and JSON layers. Built on React & MapBoxGL.

## Features

- **Sharable state**: Encodes selected layers and map position in URL
- **High performance (GPU rendering)**: Uses MapboxGL for fast vector tile rendering
- **Layer discovery**: Add a WFS, WMS, or JSON service URL to automatically discover layers
- **Vector layers**: WFS layers are rendered as vector tiles (shapes, points, lines), shows more info on hover
- **Raster layers**: WMS layers are rendered as raster tiles (images)
- **Auto Navigation**: Opening a link or layer moves to that location
- **ArcGIS legends**: WMS layers legends are shown in sidebar

## URL Parameters

The map viewer can be controlled via URL search parameters. This allows you to construct and share specific views.

- `service`: A URL for a WFS, WMS, or JSON service to automatically load (e.g., `https://example.com/wms`). The app will detect the type and add it to the available layers list.
- `layers`: A Base64-encoded JSON array of layer objects. This defines which layers are visible and their configuration. This parameter is automatically updated in the URL as you select/deselect layers.
- `color`: CSS color string for the primary accent color (e.g., `#1a5a96`, `red`, `rgb(26,90,150)`). Remember to URL encode the `#` as `%23`.
- `name`: Sets the document title and the header text of the layers sidebar (e.g., `Utrecht`).
- `logo`: A URL to an image to prominently display in the layers sidebar header.
- `favicon`: A URL to an image to replace the document's favicon icon.
- `lat`: Latitude of the map center (e.g., `52.0000`).
- `lng`: Longitude of the map center (e.g., `5.0000`).
- `zoom`: The zoom level of the map (e.g., `8.02`).

### Example: Loading a Service, setting name, logo, favicon and color

`http://localhost:3030/?service=https://services.nijmegen.nl/geoservices/extern_Cultuurhistorie/ows?request=getCapabilities&service=WMS&name=Nijmegen&logo=https://en.intonijmegen.com/build/assets/logo.986ea2a747c1189bb935.svg&favicon=https://en.intonijmegen.com/build/assets/favicon.31fd6d719b8b50a9b1b4.ico&color=%231a5a96`

### Encoding layers

To manually construct the `layers` parameter, create a JSON array of layer objects and encode it using `btoa()` in JavaScript (Base64).

**JavaScript Example:**

```javascript
const layers = [
  {
    id: "layer-1",
    name: "My WFS Layer",
    url: "https://example.com/wfs",
    type: "wfs", // "wfs" | "wms" | "json"
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
