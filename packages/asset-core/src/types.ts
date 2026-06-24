import type { ID } from '@tps/shared';

export type AssetKind = 'layer-style' | 'chart-template' | 'workflow-template' | 'config';

export interface Asset {
  id: ID;
  kind: AssetKind;
  name: string;
  description?: string;
  tags?: string[];
  payload: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface AssetFilter {
  kind?: AssetKind;
  query?: string;
  tag?: string;
}

export interface AssetStore {
  list(filter?: AssetFilter): Promise<Asset[]>;
  get(id: ID): Promise<Asset | null>;
  put(asset: Omit<Asset, 'createdAt' | 'updatedAt'>): Promise<Asset>;
  remove(id: ID): Promise<void>;
}