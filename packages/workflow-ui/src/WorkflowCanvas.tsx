import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { WorkflowGraph, WorkflowNode } from '@tps/workflow-core';
import NodeEditor from './NodeEditor';

export interface NodeChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

/** 传给 NodeEditor 的 props，通过 React Flow 的 node.data 传递 */
export interface NodeEditorData extends Record<string, unknown> {
  title: string;
  params: Record<string, unknown>;
  active: boolean;
  messages: NodeChatMessage[];
  draft: string;
  pending: boolean;
  onTitleChange: (title: string) => void;
  onParamChange: (key: string, value: string) => void;
  onParamAdd: (key: string, value: string) => void;
  onParamRemove: (key: string) => void;
  onDraftChange: (text: string) => void;
  onSend: () => void;
}

export interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  activeNodeId: string | null;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onNodeDragStop?: (nodeId: string, position: { x: number; y: number }) => void;
  onUpdateNode?: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  messages: Map<string, NodeChatMessage[]>;
  drafts: Map<string, string>;
  pendingNodeIds: Set<string>;
  onSendChat: (nodeId: string, text: string) => void;
  onDraftChange?: (nodeId: string, text: string) => void;
  readOnly?: boolean;
}

export function WorkflowCanvas({
  graph,
  activeNodeId,
  onNodeClick,
  onNodeDoubleClick,
  onNodeDragStop,
  onUpdateNode,
  messages,
  drafts,
  pendingNodeIds,
  onSendChat,
  onDraftChange,
  readOnly = true,
}: WorkflowCanvasProps) {
  const nodes = useMemo(
    () =>
      graph.nodes.map((n) => {
        const nodeMessages = messages.get(n.id) ?? [];
        const draft = drafts.get(n.id) ?? '';
        const pending = pendingNodeIds.has(n.id);
        const isActive = activeNodeId === n.id;
        const data: NodeEditorData = {
          title: n.title,
          params: n.params,
          active: isActive,
          messages: nodeMessages,
          draft,
          pending,
          onTitleChange: (title: string) =>
            onUpdateNode?.(n.id, { title }),
          onParamChange: (key: string, value: string) =>
            onUpdateNode?.(n.id, {
              params: { ...n.params, [key]: value },
            }),
          onParamAdd: (key: string, value: string) =>
            onUpdateNode?.(n.id, {
              params: { ...n.params, [key]: value },
            }),
          onParamRemove: (key: string) => {
            const next = { ...n.params };
            delete next[key];
            onUpdateNode?.(n.id, { params: next });
          },
          onDraftChange: (text: string) => {
            // drafts state 由父组件持有，这里只是 setter
            // (WorkspaceProject 提供一个写回 drafts Map 的 handler)
            onDraftChange?.(n.id, text);
          },
          onSend: () => {
            const text = draft.trim();
            if (text) onSendChat(n.id, text);
          },
        };
        return {
          id: n.id,
          type: n.type,
          position: n.position ?? { x: 0, y: 0 },
          data,
        };
      }),
    [graph.nodes, activeNodeId, messages, drafts, pendingNodeIds, onUpdateNode, onSendChat, onDraftChange]
  );

  const edges = useMemo(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    [graph.edges]
  );

  // Memoized type registration to keep references stable
  const nodeTypes = useMemo(
    () => ({
      data: NodeEditorWrapper,
      transform: NodeEditorWrapper,
      output: NodeEditorWrapper,
    }),
    []
  );

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        nodeTypes={nodeTypes}
        onNodeClick={(_, n) => onNodeClick?.(n.id)}
        onNodeDoubleClick={(_, n) => onNodeDoubleClick?.(n.id)}
        onNodeDragStop={(_, n) => onNodeDragStop?.(n.id, n.position)}
        fitView
      >
        <Background gap={32} size={1} color="#1f2937" />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

/** 自定义节点包装：从 props.data 提取 NodeEditorData */
function NodeEditorWrapper(props: NodeProps<NodeEditorData>) {
  return <NodeEditor {...props.data} />;
}