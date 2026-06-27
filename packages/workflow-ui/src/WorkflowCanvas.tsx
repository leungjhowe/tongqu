import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useStore,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { WorkflowGraph, WorkflowNode } from '@tps/workflow-core';
import NodeEditor from './NodeEditor';
import ChatPopover from './ChatPopover';

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
  activeNodeContent,
  onNodeClick,
  onNodeDoubleClick,
  onPaneClick,
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
      output: NodeEditorWrapper    }),
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
        onPaneClick={() => onPaneClick?.()}
        onNodeDragStop={(_, n) => onNodeDragStop?.(n.id, n.position)}
        fitView
      >
        <Background gap={32} size={1} color="#1f2937" />
        <Controls />
        <MiniMap pannable zoomable />
        {/* Chat 浮层 — tapNow 风格，固定左下角 */}
        {activeNodeId && (
          <ChatPopover
            nodeId={activeNodeId}
            content={activeNodeContent ?? ''}
            messages={messages.get(activeNodeId) ?? []}
            draft={drafts.get(activeNodeId) ?? ''}
            pending={pendingNodeIds.has(activeNodeId)}
            onContentChange={(v) => {
              // 编辑节点 content 写回 params.content
              const n = graph.nodes.find((nn) => nn.id === activeNodeId);
              if (n) {
                onUpdateNode?.(n.id, {
                  params: { ...n.params, content: v },
                });
              }
            }}
            onDraftChange={(t) => onDraftChange?.(activeNodeId, t)}
            onSend={() => {
              const text = (drafts.get(activeNodeId) ?? '').trim();
              if (text) onSendChat(activeNodeId, text);
            }}
          />
        )}
      </ReactFlow>
    </div>
  );
}

function NodeEditorWrapper(props: { data: NodeEditorData }) {
  return <NodeEditor {...props.data} />;
}