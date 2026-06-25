import type { NavKey } from '../types';

export { NavKey };

export const APP_NAME = '交通规划AI工作流系统';
export const APP_NAME_EN = 'Transportation Planning AI Workflow';

export const LAYOUT = {
  HEADER_HEIGHT: 44,
  SIDEBAR_WIDTH: 220,
  SIDEBAR_COLLAPSED_WIDTH: 56,
  CHAT_PANEL_WIDTH: 320,
} as const;

export const NAV_ITEMS: ReadonlyArray<{ key: NavKey; label: string; icon: string }> = [
  { key: 'home',      label: '主页',     icon: 'HomeIcon' },
  { key: 'workspace', label: '工作空间', icon: 'LayoutIcon' },
  { key: 'assets',    label: '资产',     icon: 'ArchiveIcon' },
  { key: 'templates', label: '模板',     icon: 'LayersIcon' },
];

export const THEME = {
  BG_BASE: '#0f1116',
  BG_PANEL: '#111827',
  BG_ELEVATED: '#1a1f2e',
  BORDER: '#1f2937',
  BORDER_STRONG: '#374151',
  TEXT_PRIMARY: '#e5e7eb',
  TEXT_SECONDARY: '#9ca3af',
  TEXT_MUTED: '#6b7280',
  ACCENT: '#3b82f6',
  ACCENT_HOVER: '#60a5fa',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
} as const;
