import { create } from "zustand";
import type { NavKey } from "@tps/shared";

export type BackdropVariant = "flow" | "grid" | "plain";

export interface UIState {
  // 既有（本轮保留以避免破坏其他模块，后续清理）
  sidebarCollapsed: boolean;
  chatPanelCollapsed: boolean;
  activeNavKey: NavKey;
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setActiveNav: (key: NavKey) => void;

  // 本轮新增
  promptValue: string;
  setPromptValue: (v: string) => void;
  backdropVariant: BackdropVariant;
  setBackdropVariant: (v: BackdropVariant) => void;
}

/**
 * UI store — 跨页 chrome 状态（侧栏、聊天面板、激活导航、提示词、背景变体）。
 * 未持久化：均为 per-session UI affordance，刷新即重置。
 */
export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  chatPanelCollapsed: false,
  activeNavKey: "home",

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  toggleChatPanel: () => {
    set((state) => ({ chatPanelCollapsed: !state.chatPanelCollapsed }));
  },

  setActiveNav: (key) => {
    set({ activeNavKey: key });
  },

  promptValue: "",
  setPromptValue: (v) => {
    set({ promptValue: v });
  },

  backdropVariant: "flow",
  setBackdropVariant: (v) => {
    set({ backdropVariant: v });
  },
}));