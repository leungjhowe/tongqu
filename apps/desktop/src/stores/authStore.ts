import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  findUserByUsername,
  comparePassword,
  createGuestUser,
  type User as DbUser,
} from "@tps/data-core";

/** UI 层用的精简 User（去掉 passwordHash 等）。 */
export interface User {
  id: string;
  username: string;
  isGuest: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginAsGuest: (username: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

function toUIUser(u: DbUser): User {
  return { id: u.id, username: u.username, isGuest: u.isGuest };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        if (!username.trim() || !password.trim()) {
          set({ error: "用户名和密码不能为空" });
          return false;
        }
        set({ isLoading: true, error: null });

        try {
          const dbUser = await findUserByUsername(username.trim());
          if (!dbUser || dbUser.isGuest) {
            set({ error: "用户名或密码错误", isLoading: false });
            return false;
          }
          const ok = await comparePassword(password, dbUser.passwordHash);
          if (!ok) {
            set({ error: "用户名或密码错误", isLoading: false });
            return false;
          }
          set({
            user: toUIUser(dbUser),
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        } catch (e) {
          // DB 调用抛错（sqld 未启 / schema 缺失 / 网络）时必须复位
          // isLoading 并把错误暴露给 UI，否则按钮会卡在 "进入中"。
          // eslint-disable-next-line no-console
          console.error("[auth] login failed:", e);
          set({
            error: "登录失败：无法访问本地数据库，请确认 sqld 已启动",
            isLoading: false,
          });
          return false;
        }
      },

      loginAsGuest: async (username) => {
        const trimmed = username.trim();
        if (!trimmed) {
          set({ error: "请输入游客用户名" });
          return false;
        }
        set({ isLoading: true, error: null });

        try {
          const existing = await findUserByUsername(trimmed);
          if (existing) {
            if (!existing.isGuest) {
              // 已注册账号拒绝游客模式
              set({
                error: "该用户名已注册，请用密码登录",
                isLoading: false,
              });
              return false;
            }
            // 已有同名游客 → 直接登录
            set({
              user: toUIUser(existing),
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          }

          const created = await createGuestUser(trimmed);
          set({
            user: toUIUser(created),
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error("[auth] loginAsGuest failed:", e);
          set({
            error: "登录失败：无法访问本地数据库，请确认 sqld 已启动",
            isLoading: false,
          });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "tps-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
