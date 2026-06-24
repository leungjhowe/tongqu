import type { ExecutionContext, ExecutionResult } from './types';

export async function execute(ctx: ExecutionContext): Promise<ExecutionResult> {
  const start = performance.now();
  const logs: ExecutionResult['logs'] = [];
  // TODO: real execution engine — topological sort, run each node, pass outputs forward.
  // MVP just iterates and returns empty outputs.
  for (const node of ctx.graph.nodes) {
    logs.push({ nodeId: node.id, level: 'info', message: `stub: ${node.type}::${node.title}`, ts: Date.now() });
  }
  return { outputs: {}, logs, durationMs: performance.now() - start };
}