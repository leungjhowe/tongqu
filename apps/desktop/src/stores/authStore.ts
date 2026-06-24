import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface User {
  id: string;
  username: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

/**
 * Auth store. Persists `user` + `isAuthenticated` to localStorage so a
 * page refresh keeps the session. `isLoading` and `error` are intentionally
 * NOT persisted — they represent transient request state.
 *
 * NOTE: this is a mock auth flow per the spec — any non-empty
 * username/password succeeds. A real implementation would call the backend
 * here and surface server-side errors.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });

        // Simulate a network round-trip so the UI can show a real loading state.
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (!username.trim() || !password.trim()) {
          set({ error: "用户名和密码不能为空", isLoading: false });
          return;
        }

        set({
          user: { id: "1", username },
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
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
