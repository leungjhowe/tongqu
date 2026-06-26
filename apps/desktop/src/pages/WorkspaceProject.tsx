import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { SplitLayout } from "@tps/ui";
import { WorkflowCanvas } from "@tps/workflow-ui";
import { getProjectById, touchProject, type Project } from "@tps/data-core";
import type { WorkflowGraph } from "@tps/workflow-core";
import NodeDetailPanel, { type ChatMessage } from "@/components/workflow/NodeDetailPanel";

/**
 * 示例工作流图 — 交通数据分析 pipeline。
 * 无 DB 持久化，展示骨架布局用。
 */
const SAMPLE_GRAPH: WorkflowGraph = {
  id: "sample",
  name: "交通数据分析",
  nodes: [
    {
      id: "n1",
      type: "data",
      title: "导入数据",
      params: { source: "CSV" },
      position: { x: 50, y: 200 },
    },
    {
      id: "n2",
      type: "transform",
      title: "数据清洗",
      params: {},
      position: { x: 350, y: 200 },
    },
    {
      id: "n3",
      type: "transform",
      title: "路线分析",
      params: { algorithm: "A*" },
      position: { x: 350, y: 400 },
    },
    {
      id: "n4",
      type: "output",
      title: "导出结果",
      params: { format: "GeoJSON" },
      position: { x: 650, y: 300 },
    },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
    { id: "e2b", source: "n2", target: "n4" },
    { id: "e3", source: "n3", target: "n4" },
  ],
};

export default function WorkspaceProject() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeMessages, setNodeMessages] = useState<Map<string, ChatMessage[]>>(
    () => new Map()
  );
  const [nodeDrafts, setNodeDrafts] = useState<Map<string, string>>(
    () => new Map()
  );

  // 当前选中节点对象
  const selectedNode =
    SAMPLE_GRAPH.nodes.find((n) => n.id === selectedNodeId) ?? null;
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
      <SplitLayout
        center={
          <WorkflowCanvas
            graph={SAMPLE_GRAPH}
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
    </main>
  );
}
