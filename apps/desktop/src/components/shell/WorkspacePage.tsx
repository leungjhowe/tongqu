import { useEffect, useState } from "react";
import {
  getActiveProjects,
  createProject,
  renameProject,
  archiveProject,
  type Project,
} from "@tps/data-core";
import { useAuthStore } from "@/stores/authStore";
import { Archive, Pencil, FolderOpen } from "lucide-react";
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

  const handleRenameConfirm = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await renameProject(id, trimmed);
    setEditingId(null);
    setEditingName("");
    await reload();
  };

  const handleCreated = async (project: Project) => {
    setModalOpen(false);
    await reload();
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
          className="flex-1 max-w-md h-10 px-4 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-button hover:bg-primary-hover transition-colors duration-fast"
        >
          + 新建项目
        </button>
      </div>

      {/* 宫格 */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 flex-wrap py-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[200px] h-[150px] rounded-xl bg-card/50 border border-border/60 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">
          暂无项目，去
          <button onClick={() => setModalOpen(true)} className="ml-1 text-primary hover:underline">
            新建一个
          </button>
        </div>
      ) : (
        <>
          <style>{`
            @keyframes card-enter {
              from { opacity: 0; transform: translateY(16px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
            {filtered.map((p, i) => {
              const bg = `hsl(${p.thumbnailHue} 70% 35%)`;
              const isEditing = editingId === p.id;

              return (
                <div
                  key={p.id}
                  className="group relative flex flex-col w-full aspect-[4/3] rounded-xl overflow-hidden border border-border bg-card transition-all duration-base hover:border-primary/50 hover:shadow-glow-primary hover:-translate-y-0.5 cursor-default"
                  style={{
                    animation: `card-enter 0.35s ease-out both`,
                    animationDelay: `${i * 45}ms`,
                  }}
                >
                  {/* 顶部色块 */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditing) {
                        setEditingId(p.id);
                        setEditingName(p.name);
                      }
                    }}
                    className="relative flex-1 flex items-center justify-center group-hover:brightness-110 transition-[filter] duration-slow"
                    style={{ background: bg }}
                    aria-label={`打开 ${p.name}`}
                  >
                    <FolderOpen className="w-8 h-8 text-white/80 group-hover:scale-110 transition-transform duration-slow" />

                    {/* Hover 时浮现的操作 */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(p.id);
                          setEditingName(p.name);
                        }}
                        title="重命名"
                        aria-label="重命名"
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-black/40 text-white/90 hover:bg-black/60 transition-colors backdrop-blur-sm"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleArchive(p.id);
                        }}
                        title="归档"
                        aria-label="归档"
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-black/40 text-white/90 hover:bg-destructive/70 transition-colors backdrop-blur-sm"
                      >
                        <Archive className="w-3.5 h-3.5" aria-hidden />
                      </button>
                    </div>
                  </button>

                  {/* 底部信息区 */}
                  <div className="flex flex-col gap-0.5 px-3 py-2 min-h-[60px]">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleRenameConfirm(p.id, editingName);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                            setEditingName("");
                          }
                        }}
                        onBlur={() => void handleRenameConfirm(p.id, editingName)}
                        aria-label="项目名称"
                        className="w-full h-7 px-2 rounded-md border border-primary bg-background text-sm text-foreground outline-none"
                      />
                    ) : (
                      <>
                        <span
                          className="text-body font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            setEditingId(p.id);
                            setEditingName(p.name);
                          }}
                          title="点击重命名"
                        >
                          {p.name}
                        </span>
                        <span className="text-micro text-muted-foreground">
                          {relativeTime(p.openedAt)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <NewProjectModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </main>
  );
}
