import { create } from "zustand";

export enum Appearance {
  Light = "light",
  Dark = "dark",
}

interface AppState {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;

  appearance: Appearance | null;
  setAppearance: (appearance: Appearance | null) => void;
}

export const useAppState = create<AppState>()((set) => {
  return {
    isAuthenticated: false,
    setIsAuthenticated: (isAuthenticated) => set(() => ({ isAuthenticated })),

    appearance: null,
    setAppearance: (appearance) => set(() => ({ appearance })),
  };
});
