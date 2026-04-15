import "./DemoUrls.css";

const DEMOS = [
  {
    name: "Nijmegen",
    type: "WMS",
    service: "https://services.nijmegen.nl/geoservices/extern_Cultuurhistorie/ows?request=getCapabilities&service=WMS",
    color: "#1a5a96",
    logo: "https://en.intonijmegen.com/build/assets/logo.986ea2a747c1189bb935.svg",
    favicon: "https://en.intonijmegen.com/build/assets/favicon.31fd6d719b8b50a9b1b4.ico",
  },
  {
    name: "Nijmegen Bushaltes",
    type: "WFS",
    service: "https://services.nijmegen.nl/geoservices/extern_Mobiliteit/ows?request=getCapabilities&service=WFS",
    color: "#1a5a96",
  },
  {
    name: "Utrecht Groen",
    type: "JSON",
    service: "https://geodata.utrecht.nl/geoserver/UtrechtOpen/wfs?request=GetFeature&typeName=UtrechtOpen:BGT_BEGROEIDTERREINDEEL_SWC&outputFormat=application/json",
    color: "#cc0000",
  },
  {
    name: "Utrecht Strooiroutes",
    type: "ArcGIS",
    service: "https://services-eu1.arcgis.com/SMnoOtmU2UWf0vRp/arcgis/rest/services/_171206_strooiroutes/FeatureServer",
    color: "#cc0000",
  },
];

function buildDemoUrl(demo: typeof DEMOS[number]): string {
  const url = new URL(window.location.origin);
  url.searchParams.set("service", demo.service);
  url.searchParams.set("name", demo.name);
  if (demo.color) url.searchParams.set("color", demo.color);
  if (demo.logo) url.searchParams.set("logo", demo.logo);
  if (demo.favicon) url.searchParams.set("favicon", demo.favicon);
  return url.toString();
}

export function DemoUrls() {
  return (
    <div className="demo-urls-container">
      <h4>Test URLs</h4>
      <ul className="demo-urls-list">
        {DEMOS.map((demo, i) => (
          <li key={i}>
            <a
              className="demo-url-button"
              href={buildDemoUrl(demo)}
            >
              <span className="demo-url-type">{demo.type}</span>
              {demo.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
