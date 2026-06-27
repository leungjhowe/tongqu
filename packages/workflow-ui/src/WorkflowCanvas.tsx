import { useMemo, memo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { WorkflowGraph, WorkflowNode } from '@tps/workflow-core';
import NodeEditor from './NodeEditor';
import NodeAttachments from './NodeAttachments';
import ChatPanel from './NodeAttachments';

export interface NodeChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export interface NodeEditorData extends Record<string, unknown> {
  title: string;
  params: Record<string, unknown>;
  active: boolean;
  messages: NodeChatMessage[];
  draft: string;
  pending: boolean;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onDraftChange: (text: string) => void;
  onSend: () => void;
}

export interface WorkflowCanvasProps {
  graph: WorkflowGraph;
  activeNodeId: string | null;
  /** 当前激活节点的预览文本（展示在 chat 顶部） */
  activeNodeContent?: string;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  onPaneClick?: () => void;
  onNodeDragStart?: (nodeId: string) => void;
  onNodeDragStop?: (nodeId: string, position: { x: number; y: number }) => void;
  /** 节点变更（React Flow 必要 — 含拖拽过程中的位置更新）。接 applyNodeChanges 后写回 graph */
  onNodesChange?: (changes: NodeChange[]) => void;
  /** 新建连线 — React Flow onConnect 的回调 */
  onConnect?: (connection: { source: string | null; target: string | null; sourceHandle?: string | null; targetHandle?: string | null }) => void;
  onUpdateNode?: (nodeId: string, patch: Partial<WorkflowNode>) => void;
  messages: Map<string, NodeChatMessage[]>;
  drafts: Map<string, string>;
  pendingNodeIds: Set<string>;
  onSendChat: (nodeId: string, text: string) => void;
  onDraftChange?: (nodeId: string, text: string) => void;
  /** 自定义吸附内容（如 <ChatPanel />），渲染在激活节点下方 */
  attachment?: React.ReactNode;
  attachmentDragging?: boolean;
  readOnly?: boolean;
}

export const WorkflowCanvas = memo(function WorkflowCanvas({
  graph,
  activeNodeId,
  activeNodeContent,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
  onNodeDragStart,
  onNodeDragStop,
  onNodesChange,
  onConnect,
  onUpdateNode,
  messages,
  drafts,
  pendingNodeIds,
  onSendChat,
  onDraftChange,
  attachment,
  attachmentDragging,
  readOnly = false,
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
          onContentChange: (content: string) =>
            onUpdateNode?.(n.id, {
              params: { ...n.params, content },
            }),
          onDraftChange: (text: string) => onDraftChange?.(n.id, text),
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

  const nodeTypes = useMemo(
    () => ({
      data: NodeEditorWrapper,
      transform: NodeEditorWrapper,
      output: NodeEditorWrapper,
    }),
    []
  );

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        nodeTypes={nodeTypes}
        panOnDrag
        panOnScroll
        selectionOnDrag
        onNodesChange={(changes) => onNodesChange?.(changes)}
        onConnect={(c) => onConnect?.(c)}
        onNodeClick={(_, n) => onNodeClick?.(n.id)}
        onNodeDoubleClick={(_, n) => onNodeDoubleClick?.(n.id)}
        onPaneClick={() => onPaneClick?.()}
        onNodeDragStart={(_, n) => {
          // console.log('[drag-debug] dragStart', n.id, n.position);
          onNodeDragStart?.(n.id);
        }}
        onNodeDrag={(_, n) => {
          // console.log('[drag-debug] drag', n.id, 'pos', n.position);
        }}
        onNodeDragStop={(_, n) => {
          onNodeDragStop?.(n.id, n.position);
        }}
        fitView
      >
        <Background gap={32} size={1} color="#1f2937" />
        <Controls />
        <MiniMap pannable zoomable />
        {attachment && activeNodeId && (
          <NodeAttachments activeNodeId={activeNodeId} dragging={attachmentDragging}>
            {attachment}
          </NodeAttachments>
        )}
      </ReactFlow>
    </div>
  );
});

function NodeEditorWrapper(props: { data: NodeEditorData }) {
  return <NodeEditor {...props.data} />;
}