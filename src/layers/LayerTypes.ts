export interface LayerI {
  name: string;
  id: string;
  visible: boolean;
  url?: string;
  type: "raster" | "fill" | "symbol" | "line" | "vector";
  textField?: string;
  serviceId?: string;
  /** Unique identifier for React keys, especially useful for ESRI services with duplicate layer IDs */
  uniqueId?: string;
}

export const bagLayerId = "points";

export interface WGS84BoundingBox {
  LowerCorner: string;
  UpperCorner: string;
}

export interface FeatureType {
  Name: string;
  Title: string;
  Abstract: string;
  Keywords: {
    Keyword: string[];
  };
  DefaultCRS: string;
  OtherCRS: string[];
  OutputFormats: {
    Format: string[];
  };
  WGS84BoundingBox: WGS84BoundingBox;
  MetadataURL: {
    href: string;
  };
}

export interface WFSCapabilities {
  ServiceIdentification: {
    Title: string;
    Abstract: string;
    Keywords: {
      Keyword: string[];
    };
    ServiceType: string;
    ServiceTypeVersion: string;
    Fees: string;
    AccessConstraints: string;
  };
  ServiceProvider: {
    ProviderName: string;
    ProviderSite: {
      href: string;
    };
    ServiceContact: {
      IndividualName: string;
      ContactInfo: {
        Address: {
          City: string;
          Country: string;
          ElectronicMailAddress: string;
        };
        OnlineResource: {
          href: string;
        };
      };
    };
  };
  OperationsMetadata: {
    Operation: Array<{
      name: string;
      DCP: {
        HTTP: {
          Get?: { href: string };
          Post?: { href: string };
        };
      };
      Parameter?: {
        name: string;
        AllowedValues: {
          Value: string[];
        };
      };
    }>;
  };
  FeatureTypeList: {
    FeatureType: FeatureType[];
  };
}

export type ServiceType = "WFS" | "WMS";

export interface Service {
  /** Show to the user */
  name: string;
  /** Endpoint, with version e.g. `https://service.pdok.nl/cbs/wijkenbuurten/2024/wfs/v1_0` */
  url: string;
  description?: string;
  type: ServiceType;
  /** If true, the service does not have an SRS (WFS only) */
  noSRS?: boolean;
  /** This is used to render the text of the symbol layer (WFS only) */
  textField?: string;
}

/** @deprecated Use Service instead */
export type WFSService = Service;
/** @deprecated Use Service instead */
export type WMService = Service;
