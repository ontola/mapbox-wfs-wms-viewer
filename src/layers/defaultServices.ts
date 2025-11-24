import { LayerI } from "./LayerTypes";
import { bagLayerId } from "./LayerTypes";

// Keep the BAG layer definition for reference, but don't include it in the default layers
export const BAGLayer: LayerI = {
  name: "BAG items",
  id: bagLayerId,
  visible: true,
  type: "symbol",
};

export const layersDefault: LayerI[] = [
  // BAGLayer is now controlled separately via context
  {
    name: "Luchtfoto",
    id: "2022_orthoHR",
    type: "raster",
    visible: false,
    url: "https://service.pdok.nl/hwh/luchtfotocir/wms/v1_0",
  },
];

import { Service } from "./LayerTypes";

export const services: Service[] = [
  // {
  //   name: "CBS Wijken en Buurten 2024",
  //   url: "https://service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0",
  //   description: "Statistische data per wijk en buurt van het CBS",
  //   type: "WFS",
  // },
  // {
  //   name: "BAG pdok",
  //   url: "https://service.pdok.nl/lv/bag/wfs/v2_0",
  //   description: "Items in het BAG",
  //   textField: "huisnummer",
  //   type: "WFS",
  // },
  // {
  //   name: "Kadastrale kaart",
  //   url: "https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0",
  //   // "https://service.pdok.nl/kadaster/kadastralekaart/wfs/v5_0?request=GetCapabilities&service=WFS"
  //   description: "Kadastrale kaart",
  //   textField: "tekst",
  //   type: "WFS",
  // },
  // // {
  // //   name: "Monumenten",
  // //   url: "https://data.geo.cultureelerfgoed.nl/openbaar/wfs/2.0",
  // //   description: "Monumenten",
  // //   noSRS: true,
  // //   type: "WFS",
  // // },
  // {
  //   name: "Bestuurlijke Gebieden",
  //   url: "https://service.pdok.nl/kadaster/bestuurlijkegebieden/wfs/v1_0",
  //   description: "Bestuurlijke gebieden",
  //   type: "WFS",
  // },
  // {
  //   name: "Utrecht",
  //   url: "https://geodata.utrecht.nl/geoserver/UtrechtOpen/wfs",
  //   type: "WFS",
  // },
   {
    name: "Oss Bijzondere Bomen WFS",
    url: "https://geoportaaloss.oss.nl/arcgis/services/Dataportaal/Bijzondere_Bomen/MapServer/WFSServer",
    type: "WFS",
  },
  {
    name: "Utrecht Werfkelders WFS",
    url: "https://dservices-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/services/Werfkelders/WFSServer",
    type: "WFS",
  },
  // {
  //   name: "Luchtfoto",
  //   url: "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0",
  //   description: "Luchtfoto's van Nederland",
  //   type: "WMS",
  // },
  // {
  //   name: "Provincie Utrecht",
  //   url: "https://gis.provincie-utrecht.nl/server/services/Opendata/m01_1_3_luchtkwaliteit/MapServer/WMSServer",
  //   type: "WMS",
  // },
  // {
  //   name: "Actueel Hoogtebestand Nederland",
  //   url: "https://service.pdok.nl/rws/ahn/wms/v1_0",
  //   description: "Hoogtegegevens van Nederland",
  //   type: "WMS",
  // },
  // {
  //   name: "Funderingsproblematiek",
  //   url: "https://service.pdok.nl/rvo/indgebfunderingsproblematiek/wms/v1_0",
  //   type: "WMS",
  // },
  // {
  //   name: "Fietsplatform",
  //   url: "https://service.pdok.nl/fietsplatform/landelijke-fietsroutes/wms/v1_0",
  //   type: "WMS",
  // },
  // {
  //   name: "Wandelnet",
  //   url: "https://service.pdok.nl/wandelnet/landelijke-wandelroutes/wms/v1_0",
  //   type: "WMS",
  // },

  {
    name: "Oss Bijzondere Bomen WMS",
    url: "https://geoportaaloss.oss.nl/arcgis/services/Dataportaal/Bijzondere_Bomen/MapServer/WMSServer",
    type: "WMS",
  },
  {
    name: "Nijmegen Cultuurhistorie WMS",
    url: "https://services.nijmegen.nl/geoservices/extern_Cultuurhistorie/ows?request=getCapabilities&service=WMS",
    type: "WMS",
  }
];
