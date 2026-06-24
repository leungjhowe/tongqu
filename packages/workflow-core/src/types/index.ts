import type { ID } from '@tps/shared/types';

export interface WorkflowNode {
  id: ID;
  type: 'data' | 'transform' | 'output';
  title: string;
  params: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: ID;
  source: ID;
  target: ID;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowGraph {
  id: ID;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface ExecutionContext {
  graph: WorkflowGraph;
  inputs: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ExecutionResult {
  outputs: Record<string, unknown>;
  logs: Array<{ nodeId: ID; level: 'info' | 'warn' | 'error'; message: string; ts: number }>;
  durationMs: number;
}