# Mapbox WFS WMS viewer

Web application to view WFS and WMS (GIS) layers in a Mapbox map.

## Features

- **Sharable state**: Encodes selected layers and map position in URL
- **Raster layers**: WMS layers are rendered as raster tiles
- **Vector layers**: WFS layers are rendered as vector tiles (shapes, points, lines)
- **ArcGIS legends**: WMS layers legends are shown in sidebar

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
