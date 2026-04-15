/**
 * URL state management utilities for shareable map configurations
 */

import { LayerI } from "./layers/LayerTypes";

export interface MapView {
  latitude: number;
  longitude: number;
  zoom: number;
}

/**
 * Encode layers to URL-safe format
 */
function encodeLayers(layers: LayerI[]): string {
  const layerData = layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    url: layer.url,
    type: layer.type,
    serviceId: layer.serviceId,
    textField: layer.textField,
    uniqueId: layer.uniqueId,
  }));
  return btoa(JSON.stringify(layerData));
}

/**
 * Decode layers from URL-safe format
 */
function decodeLayers(encoded: string): LayerI[] {
  try {
    const decoded = atob(encoded);
    const layerData = JSON.parse(decoded);
    return layerData.map((layer: any) => ({
      ...layer,
      visible: true, // Layers from URL should be visible
    }));
  } catch (e) {
    console.error("Failed to decode layers from URL:", e);
    return [];
  }
}

/**
 * Get visible layers from URL
 */
export function getLayersFromUrl(): LayerI[] {
  const params = new URLSearchParams(window.location.search);
  const layersParam = params.get("layers");
  return layersParam ? decodeLayers(layersParam) : [];
}

/**
 * Update URL with visible layers
 */
export function setLayersInUrl(layers: LayerI[]): void {
  const params = new URLSearchParams(window.location.search);

  if (layers.length > 0) {
    params.set("layers", encodeLayers(layers));
  } else {
    params.delete("layers");
  }

  const queryString = params.toString();
  const newUrl = `${window.location.pathname}${queryString ? "?" + queryString : ""}`;
  window.history.replaceState({}, "", newUrl);
}

/**
 * Get map view from URL
 */
export function getMapViewFromUrl(): MapView | null {
  const params = new URLSearchParams(window.location.search);
  const lat = params.get("lat");
  const lng = params.get("lng");
  const zoom = params.get("zoom");

  if (lat && lng && zoom) {
    return {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      zoom: parseFloat(zoom),
    };
  }

  return null;
}

/**
 * Update URL with map view
 */
export function setMapViewInUrl(
  latitude: number,
  longitude: number,
  zoom: number,
): void {
  const params = new URLSearchParams(window.location.search);

  params.set("lat", latitude.toFixed(4));
  params.set("lng", longitude.toFixed(4));
  params.set("zoom", zoom.toFixed(2));

  const queryString = params.toString();
  const newUrl = `${window.location.pathname}${queryString ? "?" + queryString : ""}`;
  window.history.replaceState({}, "", newUrl);
}

/**
 * Get service URL from URL parameter
 * This allows sharing a link with just a service URL to auto-load its first layer
 */
export function getServiceUrlFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("service");
}

/**
 * Theme configuration for customizing the UI
 */
export interface Theme {
  color?: string;
  name?: string;
  logo?: string;
  favicon?: string;
}

/**
 * Get theme parameters from URL
 */
export function getThemeFromUrl(): Theme {
  const params = new URLSearchParams(window.location.search);
  const theme: Theme = {};

  const color = params.get("color");
  if (color) theme.color = color;

  const name = params.get("name");
  if (name) theme.name = name;

  const logo = params.get("logo");
  if (logo) theme.logo = logo;

  const favicon = params.get("favicon");
  if (favicon) theme.favicon = favicon;

  return theme;
}
