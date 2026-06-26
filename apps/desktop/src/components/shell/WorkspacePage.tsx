import { useEffect, useState } from "react";
import {
  getActiveProjects,
  createProject,
  renameProject,
  archiveProject,
  type Project,
} from "@tps/data-core";
import { useAuthStore } from "@/stores/authStore";
import { Archive, Pencil } from "lucide-react";
import NewProjectModal from "./NewProjectModal";

function relativeTime(iso: Date | number | string | null): string {
  if (iso == null) return "未知";
  const ms = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400 / 7)} 周前`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function WorkspacePage() {
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const list = await getActiveProjects(user.id);
      setProjects(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [user?.id]);

  const handleArchive = async (id: string) => {
    if (!confirm("归档该项目？")) return;
    await archiveProject(id);
    await reload();
  };

  const handleRename = async (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await renameProject(id, trimmed);
    setEditingId(null);
    setEditingName("");
    await reload();
  };

  const handleCreated = async (project: Project) => {
    setModalOpen(false);
    await reload();
    // 占位路由
    window.location.href = `/app/workspace/${project.id}`;
  };

  const filtered = query.trim()
    ? projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : projects;

  if (!user) return null;

  return (
    <main className="relative z-10 flex-1 min-h-0 flex flex-col gap-6 px-6 py-8 overflow-y-auto">
      {/* 顶栏 */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索项目..."
          aria-label="搜索项目"
          className="flex-1 max-w-md h-10 px-4 rounded-full bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + 新建项目
        </button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          暂无项目，去
          <button onClick={() => setModalOpen(true)} className="ml-1 text-primary hover:underline">
            新建一个
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((p) => {
            const bg = `hsl(${p.thumbnailHue} 70% 35%)`;
            const isEditing = editingId === p.id;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
              >
                <span
                  className="w-10 h-10 rounded-md flex-shrink-0"
                  style={{ background: bg }}
                  aria-hidden
                />
                {isEditing ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleRename(p.id);
                      else if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={() => void handleRename(p.id)}
                    aria-label="项目名称"
                    className="flex-1 h-8 px-2 rounded-md border border-primary bg-background text-sm outline-none"
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      最后打开 {relativeTime(p.openedAt)}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditingName(p.name);
                    }}
                    title="重命名"
                    aria-label="重命名"
                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleArchive(p.id)}
                    title="归档"
                    aria-label="归档"
                    className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </main>
  );
}
