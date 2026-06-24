import { create } from "zustand";

export interface UIState {
  sidebarCollapsed: boolean;
  chatPanelCollapsed: boolean;
  activeNavKey: string;
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setActiveNav: (key: string) => void;
}

/**
 * UI store — holds cross-page chrome state (sidebar, chat panel, active nav).
 * Intentionally not persisted: this is per-session UI affordance state, and
 * collapsing the sidebar on one visit shouldn't bleed into the next.
 */
export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  chatPanelCollapsed: false,
  activeNavKey: "projects",

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },

  toggleChatPanel: () => {
    set((state) => ({ chatPanelCollapsed: !state.chatPanelCollapsed }));
  },

  setActiveNav: (key) => {
    set({ activeNavKey: key });
  },
}));
