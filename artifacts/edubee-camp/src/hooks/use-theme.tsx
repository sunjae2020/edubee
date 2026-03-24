import { createContext, useContext, useState, useEffect } from "react";

type Theme = "light" | "dark";

interface ThemeContext {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeContext>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem("edubee-theme");
      if (stored === "dark" || stored === "light") return stored;
    } catch { /* ignore */ }
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try { localStorage.setItem("edubee-theme", theme); } catch { /* ignore */ }
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState(prev => prev === "dark" ? "light" : "dark");

  return <Ctx.Provider value={{ theme, toggleTheme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
