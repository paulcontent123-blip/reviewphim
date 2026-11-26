import { create } from "zustand";

export interface SessionUser {
  id: string;
  email: string | null;
}

interface AuthState {
  /** undefined: chưa kiểm tra xong; null: khách. */
  user: SessionUser | null | undefined;
  setUser: (user: SessionUser | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: undefined,
  setUser: (user) => set({ user }),
}));
