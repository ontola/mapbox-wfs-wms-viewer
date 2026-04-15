export interface DemoService {
  name: string;
  type: "WFS" | "WMS" | "ArcGIS" | "JSON" | "CSV";
  service: string;
  color?: string;
  logo?: string;
  favicon?: string;
  layerId?: string;
}

export const DEMOS: DemoService[] = [
  {
    name: "Nijmegen Cultuurhistorie",
    type: "WMS",
    service:
      "https://services.nijmegen.nl/geoservices/extern_Cultuurhistorie/ows",
    color: "#1a5a96",
    logo: "https://en.intonijmegen.com/build/assets/logo.986ea2a747c1189bb935.svg",
    favicon:
      "https://en.intonijmegen.com/build/assets/favicon.31fd6d719b8b50a9b1b4.ico",
  },
  {
    name: "Nijmegen Bushaltes",
    type: "WFS",
    service:
      "https://services.nijmegen.nl/geoservices/extern_Mobiliteit/ows",
    layerId: "extern_Mobiliteit:MOB_BUSHALTES",
    color: "#1a5a96",
  },
  {
    name: "Utrecht Begroeidterreindeel",
    type: "WFS",
    service: "https://geodata.utrecht.nl/geoserver/UtrechtOpen/ows",
    layerId: "UtrechtOpen:BGT_BEGROEIDTERREINDEEL_SWC",
    color: "#cc0000",
  },
  {
    name: "Utrecht Strooiroutes",
    type: "ArcGIS",
    service:
      "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer",
    color: "#cc0000",
  },
  {
    name: "Utrecht Monumenten",
    type: "WFS",
    service: "https://geodata.utrecht.nl/geoserver/UtrechtOpen/ows",
    layerId: "UtrechtOpen:GEMEENTELIJKE_MONUMENTEN",
    color: "#cc0000",
  },
  {
    name: "Groningen Speelplekken",
    type: "WFS",
    service: "https://maps.groningen.nl/geoserver/geo-data/ows",
    layerId: "geo-data:Speelplekken_gemeente_Groningen",
    color: "#2e7d32",
  },
  {
    name: "Groningen Speelplekken",
    type: "JSON",
    service:
      "https://maps.groningen.nl/geoserver/geo-data/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geo-data:Speelplekken_gemeente_Groningen&maxFeatures=1000000&outputFormat=application/json&srsName=EPSG:4326",
    color: "#2e7d32",
  },
];
