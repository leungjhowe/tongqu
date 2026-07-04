import type { ID } from '@tongqu/shared';

export type ExportFormat = 'pptx' | 'png' | 'pdf';

export interface ExportRequest {
  format: ExportFormat;
  title: string;
  source: { kind: 'workflow' | 'map' | 'chart'; id: ID };
  options?: Record<string, unknown>;
}

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  bytes: Uint8Array;
}

export interface Exporter {
  export(req: ExportRequest): Promise<ExportResult>;
}