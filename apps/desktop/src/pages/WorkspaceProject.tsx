import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { ReactFlowProvider } from "reactflow";
import {
  WorkflowCanvas,
  NodeAttachments,
  ChatPanel,
  type NodeChatMessage,
} from "@tps/workflow-ui";
import { getProjectById, touchProject, type Project } from "@tps/data-core";
import type { WorkflowGraph, WorkflowNode } from "@tps/workflow-core";
import { ClaudeProvider, getStoredApiKey, type LLMMessage } from "@tps/ai-core";
import WorkflowToolbar from "@/components/workflow/WorkflowToolbar";

/** 空工作流图（初始状态）。 */
const EMPTY_GRAPH: WorkflowGraph = { id: "graph", name: "", nodes: [], edges: [] };

let nodeCounter = 0;
const nextNodeId = () => `node-${Date.now()}-${++nodeCounter}`;

export default function WorkspaceProject() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [graph, setGraph] = useState<WorkflowGraph>(EMPTY_GRAPH);
  // 双击激活的节点（编辑器展开）
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [nodeMessages, setNodeMessages] = useState<Map<string, NodeChatMessage[]>>(
    () => new Map()
  );
  const [nodeDrafts, setNodeDrafts] = useState<Map<string, string>>(
    () => new Map()
  );
  // AI 正在响应的节点（用于显示"AI 思考中"）
  const [pendingNodeIds, setPendingNodeIds] = useState<Set<string>>(
    () => new Set()
  );

  const msgCounter = useRef(0);
  // 始终指向最新的 graph，让 chat 回调不需要把它列为依赖
  const graphRef = useRef(graph);
  graphRef.current = graph;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      try {
        const p = await getProjectById(id);
        if (!cancelled) setProject(p);
        await touchProject(id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  /** 更新节点局部字段（title/type/params） */
  const handleUpdateNode = useCallback(
    (nodeId: string, patch: Partial<WorkflowNode>) => {
      setGraph((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, ...patch } : n
        ),
      }));
    },
    []
  );

  /** 从左侧工具栏新增节点 */
  const handleAddNode = useCallback((_type: WorkflowNode["type"]) => {
    const nodeId = nextNodeId();
    const newNode: WorkflowNode = {
      id: nodeId,
      type: _type,
      title: "文本节点",
      params: { content: "" },
      position: {
        x: 100 + (nodeCounter % 5) * 240,
        y: 150 + Math.floor(nodeCounter / 5) * 160,
      },
    };
    setGraph((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    // 等下一帧让 React Flow 完成新节点的 measure，
    // 否则 ChatPopover 第一帧拿不到 measured 尺寸
    requestAnimationFrame(() => {
      setActiveNodeId(nodeId);
    });
  }, []);

  /** 单击节点：选中（同时激活编辑器） */
  const handleNodeClick = useCallback((nodeId: string) => {
    setActiveNodeId(nodeId);
  }, []);

  /** 双击节点：激活 */
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    setActiveNodeId(nodeId);
  }, []);

  /** 点击画布空白：取消激活 */
  const handlePaneClick = useCallback(() => {
    setActiveNodeId(null);
  }, []);

  /** 节点拖动结束：保存新位置 */
  const handleNodeDragStop = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      handleUpdateNode(nodeId, { position });
    },
    [handleUpdateNode]
  );

  /** 更新某节点的草稿（输入框实时绑定） */
  const handleDraftChange = useCallback((nodeId: string, text: string) => {
    setNodeDrafts((prev) => {
      const next = new Map(prev);
      next.set(nodeId, text);
      return next;
    });
  }, []);

  /** 发送节点对话 */
  const handleSendChat = useCallback(
    async (nodeId: string, text: string) => {
      // 1) 用户消息入栈
      msgCounter.current += 1;
      const userMsg: NodeChatMessage = {
        id: `msg-${Date.now()}-${msgCounter.current}`,
        role: "user",
        content: text,
      };
      setNodeMessages((prev) => {
        const next = new Map(prev);
        next.set(nodeId, [...(next.get(nodeId) ?? []), userMsg]);
        return next;
      });
      // 2) 清空草稿
      setNodeDrafts((prev) => {
        const next = new Map(prev);
        next.set(nodeId, "");
        return next;
      });
      // 3) 标记 pending
      setPendingNodeIds((prev) => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });

      // 4) 取节点上下文
      const node = graphRef.current.nodes.find((n) => n.id === nodeId);

      // 5) 调 LLM
      let aiContent: string;
      const apiKey = getStoredApiKey();

      if (!apiKey) {
        aiContent =
          "请先在 DevTools Console 设置 API Key：\n```\nlocalStorage.setItem('tps-ai-provider-key', 'sk-ant-...')\n```";
      } else {
        try {
          const provider = new ClaudeProvider(apiKey);
          const messages: LLMMessage[] = [
            {
              role: "system",
              content: `你是 TPS 交通规划 AI 工作流系统的助手。\n节点：${node?.title ?? nodeId} (${node?.type ?? "未知"})\n参数：${JSON.stringify(node?.params ?? {})}\n用中文简洁回答，200 字以内。`,
            },
            { role: "user", content: text },
          ];
          const res = await provider.complete({
            provider: "claude",
            model: "claude-sonnet-4-20250514",
            messages,
            maxTokens: 512,
          });
          aiContent = res.content;
        } catch (err) {
          aiContent = `AI 回复失败：${err instanceof Error ? err.message : "未知错误"}`;
        }
      }

      // 6) AI 消息入栈
      msgCounter.current += 1;
      const aiMsg: NodeChatMessage = {
        id: `msg-${Date.now()}-${msgCounter.current}`,
        role: "ai",
        content: aiContent,
      };
      setNodeMessages((prev) => {
        const next = new Map(prev);
        next.set(nodeId, [...(next.get(nodeId) ?? []), aiMsg]);
        return next;
      });
      // 7) 取消 pending
      setPendingNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    },
    []
  );

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-background">
        <div className="text-body text-muted-foreground">加载项目中...</div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="flex-1 flex items-center justify-center bg-background">
        <div className="text-body text-muted-foreground">项目不存在</div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-background relative">
      {/* 漂浮胶囊工具栏 */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-floating">
        <WorkflowToolbar onAddNode={handleAddNode} />
      </div>

      {/* 一个 ReactFlowProvider 包住主画布 + NodeAttachments，
          两者共享同一份 store（getNode / getViewport 才能拿到画布状态） */}
      <ReactFlowProvider>
        <div className="flex-1 min-h-0 relative">
          <WorkflowCanvas
            graph={graph}
            activeNodeId={activeNodeId}
            messages={nodeMessages}
            drafts={nodeDrafts}
            pendingNodeIds={pendingNodeIds}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onPaneClick={handlePaneClick}
            onNodeDragStop={handleNodeDragStop}
            onUpdateNode={handleUpdateNode}
            onDraftChange={handleDraftChange}
            onSendChat={handleSendChat}
          />
          {/* NodeAttachments 系统：集中管理所有吸附（ChatPanel、未来 PropertyPanel 等），
              拖动节点时通过订阅 store 实时跟随 */}
          <NodeAttachments activeNodeId={activeNodeId}>
            {activeNodeId && (
              <ChatPanel
                nodeId={activeNodeId}
                content={
                  (graph.nodes.find((n) => n.id === activeNodeId)
                    ?.params.content as string | undefined) ?? ''
                }
                messages={nodeMessages.get(activeNodeId) ?? []}
                draft={nodeDrafts.get(activeNodeId) ?? ''}
                pending={pendingNodeIds.has(activeNodeId)}
                onContentChange={(v) =>
                  handleUpdateNode(activeNodeId, {
                    params: {
                      ...(graph.nodes.find((n) => n.id === activeNodeId)
                        ?.params ?? {}),
                      content: v,
                    },
                  })
                }
                onDraftChange={(t) => handleDraftChange(activeNodeId, t)}
                onSend={() => {
                  const text = (
                    nodeDrafts.get(activeNodeId) ?? ''
                  ).trim();
                  if (text) handleSendChat(activeNodeId, text);
                }}
              />
            )}
          </NodeAttachments>
        </div>
      </ReactFlowProvider>
    </main>
  );
}