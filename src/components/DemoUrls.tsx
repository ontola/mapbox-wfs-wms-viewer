import "./DemoUrls.css";
import { DEMOS, DemoService } from "../demoServices";

function buildDemoUrl(demo: DemoService): string {
  const url = new URL(window.location.origin);
  url.searchParams.set("service", demo.service);
  url.searchParams.set("name", demo.name);
  if (demo.color) url.searchParams.set("color", demo.color);
  if (demo.logo) url.searchParams.set("logo", demo.logo);
  if (demo.favicon) url.searchParams.set("favicon", demo.favicon);
  if (demo.layerId) url.searchParams.set("layerId", demo.layerId);
  return url.toString();
}

export function DemoUrls() {
  return (
    <div className="demo-urls-container">
      <h4>Test URLs</h4>
      <ul className="demo-urls-list">
        {DEMOS.map((demo, i) => (
          <li key={i}>
            <a className="demo-url-button" href={buildDemoUrl(demo)}>
              <span className="demo-url-type">{demo.type}</span>
              {demo.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
