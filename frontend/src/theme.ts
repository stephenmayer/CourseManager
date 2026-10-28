// Light/dark theme: defaults to the system setting, remembered per browser (S14).

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "coursemanager.theme";

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Storage can throw (private windows, blocked site data); fall back to the system setting.
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not remembered this time; the toggle still works for this page.
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    storeTheme(next);
    setTheme(next);
  };

  return [theme, toggle];
}
