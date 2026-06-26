import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { SplitLayout } from "@tps/ui";
import { WorkflowCanvas } from "@tps/workflow-ui";
import { getProjectById, touchProject, type Project } from "@tps/data-core";
import type { WorkflowGraph, WorkflowNode } from "@tps/workflow-core";
import NodeDetailPanel, { type ChatMessage } from "@/components/workflow/NodeDetailPanel";
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeMessages, setNodeMessages] = useState<Map<string, ChatMessage[]>>(
    () => new Map()
  );
  const [nodeDrafts, setNodeDrafts] = useState<Map<string, string>>(
    () => new Map()
  );

  // 当前选中节点对象
  const selectedNode =
    graph.nodes.find((n) => n.id === selectedNodeId) ?? null;
  const currentMessages = selectedNodeId
    ? nodeMessages.get(selectedNodeId) ?? []
    : [];
  const currentDraft = selectedNodeId
    ? nodeDrafts.get(selectedNodeId) ?? ""
    : "";

  const msgCounter = useRef(0);

  const handleNodeChat = useCallback(
    (nodeId: string, text: string) => {
      msgCounter.current += 1;
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-${msgCounter.current}`,
        role: "user",
        content: text,
      };
      setNodeMessages((prev) => {
        const next = new Map(prev);
        const existing = next.get(nodeId) ?? [];
        next.set(nodeId, [...existing, userMsg]);
        return next;
      });
      // 清空该节点 draft
      setNodeDrafts((prev) => {
        const next = new Map(prev);
        next.set(nodeId, "");
        return next;
      });

      // 2) 模拟 AI 回复（延迟 600ms）
      setTimeout(() => {
        msgCounter.current += 1;
        const aiMsg: ChatMessage = {
          id: `msg-${Date.now()}-${msgCounter.current}`,
          role: "ai",
          content: `已收到：${text}\n\n这个节点可以帮你完成相关任务。当前配置已保存。`,
        };
        setNodeMessages((prev) => {
          const next = new Map(prev);
          const existing = next.get(nodeId) ?? [];
          next.set(nodeId, [...existing, aiMsg]);
          return next;
        });
      }, 600);
    },
    []
  );

  const handleNodeDraftChange = useCallback(
    (text: string) => {
      if (!selectedNodeId) return;
      setNodeDrafts((prev) => {
        const next = new Map(prev);
        next.set(selectedNodeId, text);
        return next;
      });
    },
    [selectedNodeId]
  );

  const handleCloseDetail = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  /** 从左侧工具栏新增节点 */
  const handleAddNode = useCallback((_type: WorkflowNode["type"]) => {
    const nodeId = nextNodeId();
    const newNode: WorkflowNode = {
      id: nodeId,
      type: _type,
      title: "文本节点",
      params: { content: "" },
      position: { x: 100 + (nodeCounter % 5) * 200, y: 150 + Math.floor(nodeCounter / 5) * 120 },
    };
    setGraph((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      try {
        const p = await getProjectById(id);
        if (!cancelled) setProject(p);
        // 标记为已打开
        await touchProject(id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

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
    <main className="flex-1 flex flex-col min-h-0 bg-background">
      <div className="relative flex-1 flex min-h-0">
        {/* 漂浮胶囊工具栏 */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-floating">
          <WorkflowToolbar onAddNode={handleAddNode} />
        </div>

        <SplitLayout
          center={
            <WorkflowCanvas
              graph={graph}
              readOnly
              onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
            />
          }
          right={
            selectedNodeId ? (
              <NodeDetailPanel
                node={selectedNode}
                messages={currentMessages}
                draft={currentDraft}
                onDraftChange={handleNodeDraftChange}
                onSend={handleNodeChat}
                onClose={handleCloseDetail}
              />
            ) : undefined
          }
          rightWidth={360}
        />
      </div>
    </main>
  );
}
