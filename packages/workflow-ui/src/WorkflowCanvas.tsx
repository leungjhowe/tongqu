import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import type { WorkflowGraph } from '@tps/workflow-core';

export interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  onNodeClick?: (nodeId: string) => void;
  readOnly?: boolean;
}

export function WorkflowCanvas({ graph, onNodeClick, readOnly = true }: WorkflowCanvasProps) {
  const nodes = useMemo(() => graph.nodes.map((n) => ({
    id: n.id,
    position: n.position ?? { x: 0, y: 0 },
    data: { label: n.title },
  })), [graph]);

  const edges = useMemo(() => graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  })), [graph]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        onNodeClick={(_, n) => onNodeClick?.(n.id)}
        fitView
      >
        <Background gap={32} size={1} color="#1f2937" />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}