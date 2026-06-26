import { useEffect, useRef, useState } from "react";
import { createProject, type Project } from "@tps/data-core";
import { useAuthStore } from "@/stores/authStore";

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export default function NewProjectModal({ open, onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (open) {
      setName("");
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !user || submitting) return;
    setSubmitting(true);
    try {
      const project = await createProject({ ownerId: user.id, name: trimmed });
      onCreated(project);
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="新建项目"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg">
        <h2 className="text-base font-semibold text-foreground mb-3">新建项目</h2>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="项目名称"
          aria-label="项目名称"
          className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          disabled={submitting}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 h-9 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!name.trim() || submitting}
            className="px-4 h-9 rounded-md text-sm bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}
