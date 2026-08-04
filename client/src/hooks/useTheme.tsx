import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";

export type ThemeId = "cyber";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  swatch: string;
}

// 应用固定使用赛博（cyber）主题，不再提供多主题切换，保证视觉稳定一致
export const THEME_OPTIONS: ThemeOption[] = [
  { id: "cyber", label: "赛博", swatch: "hsl(190 100% 50%)" },
];

const FIXED_THEME: ThemeId = "cyber";

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  useEffect(() => {
    // 始终应用 cyber 主题，覆盖历史 localStorage 中可能残留的其它主题
    document.documentElement.setAttribute("data-theme", FIXED_THEME);
  }, []);

  const value: ThemeContextValue = {
    theme: FIXED_THEME,
    setTheme: () => undefined,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};
