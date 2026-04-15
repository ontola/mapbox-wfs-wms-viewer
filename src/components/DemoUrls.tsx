import { useState } from "react";
import "./DemoUrls.css";

const DEMO_URLS = [
  {
    name: "Utrecht Begroeidterreindeel (JSON)",
    url: "https://geodata.utrecht.nl/geoserver/UtrechtOpen/wfs?request=GetFeature&typeName=UtrechtOpen:BGT_BEGROEIDTERREINDEEL_SWC&outputFormat=application/json"
  },
  {
    name: "Utrecht Strooiroutes (ArcGIS)",
    url: "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer"
  },
  {
    name: "Nijmegen Bushaltes (WFS)",
    url: "https://services.nijmegen.nl/geoservices/extern_Mobiliteit/ows?request=getCapabilities&service=WFS"
  },
  {
    name: "Groningen Speelplekken (JSON)",
    url: "https://maps.groningen.nl/geoserver/geo-data/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geo-data:Speelplekken_gemeente_Groningen&maxFeatures=1000000&outputFormat=application/json&srsName=EPSG:4326&format_options=id_policy:reference_no=false"
  }
];

interface DemoUrlsProps {
  onSelectUrl: (url: string) => void;
}

export function DemoUrls({ onSelectUrl }: DemoUrlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="demo-urls-container">
      <button 
        className="demo-urls-toggle" 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "▼ Verberg test URLs" : "▶ Toon test URLs"}
      </button>
      
      {isOpen && (
        <ul className="demo-urls-list">
          {DEMO_URLS.map((demo, i) => (
            <li key={i}>
              <button 
                className="demo-url-button"
                onClick={() => onSelectUrl(demo.url)}
                title={demo.url}
              >
                {demo.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
