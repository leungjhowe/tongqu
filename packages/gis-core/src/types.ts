import type { ID } from '@tongqu/shared/types';

export type LayerKind = 'heatmap' | 'flow' | 'choropleth' | 'base';

export interface MapLayerSpec {
  id: ID;
  kind: LayerKind;
  name: string;
  visible: boolean;
  source: 'csv' | 'geojson' | 'wms' | 'wfs' | 'inline';
  options?: Record<string, unknown>;
}

export interface MapCapabilities {
  addLayer(spec: MapLayerSpec): void;
  removeLayer(id: ID): void;
  updateLayer(id: ID, patch: Partial<MapLayerSpec>): void;
  setVisibility(id: ID, visible: boolean): void;
  getLayers(): readonly MapLayerSpec[];
}