import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SplitLayout } from "@tps/ui";
import { WorkflowCanvas } from "@tps/workflow-ui";
import { getProjectById, touchProject, type Project } from "@tps/data-core";
import type { WorkflowGraph } from "@tps/workflow-core";

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
        rightWidth={0}
        right={undefined}
        left={undefined}
      >
        <WorkflowCanvas
          graph={SAMPLE_GRAPH}
          readOnly
          onNodeClick={(nodeId) => setSelectedNodeId(nodeId)}
        />
      </SplitLayout>
    </main>
  );
}
