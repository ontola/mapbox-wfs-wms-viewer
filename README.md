# Mapbox WFS WMS viewer

Web application to view WFS and WMS (GIS) layers in a Mapbox map.

## Features

- **Sharable state**: Encodes selected layers and map position in URL
- **Raster layers**: WMS layers are rendered as raster tiles
- **Vector layers**: WFS layers are rendered as vector tiles (shapes, points, lines)
- **ArcGIS legends**: WMS layers legends are shown in sidebar

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
