import { createContext, useContext } from "react";

type Theme = "light" | "dark";

interface ThemeContext {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

// Theme is now controlled entirely by ViewAsProvider via direct DOM manipulation.
// This context provides a no-op implementation so existing consumers don't break.
const Ctx = createContext<ThemeContext>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme: Theme = document.documentElement.classList.contains("dark") ? "dark" : "light";

  const setTheme = (t: Theme) => {
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const toggleTheme = () => {
    setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");
  };

  return <Ctx.Provider value={{ theme, toggleTheme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
