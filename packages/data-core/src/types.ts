import type { ID } from '@tps/shared/types';

export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'geometry';

export interface ColumnSchema { name: string; type: ColumnType; }

export interface Dataset {
  id: ID;
  name: string;
  schema: ColumnSchema[];
  rowCount: number;
  source: 'csv' | 'excel' | 'duckdb' | 'geojson';
}

export interface QueryResult { columns: string[]; rows: Array<Record<string, unknown>>; }

export interface DataSource {
  list(): Promise<Dataset[]>;
  load(id: ID): Promise<Dataset>;
  query(sql: string): Promise<QueryResult>;
  import(file: { name: string; bytes: Uint8Array }): Promise<Dataset>;
  remove(id: ID): Promise<void>;
}