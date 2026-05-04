import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { getTheme, saveTheme } from '../api/services';

// ── Types ──────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark' | 'custom';
type CustomColors = Record<string, string>;

interface ThemeContextValue {
  theme:             ThemeMode;
  custom:            CustomColors;
  applyTheme:        (mode: ThemeMode, customColors?: CustomColors, persist?: boolean) => void;
  updateCustomColor: (variable: string, value: string) => void;
}

// ── Constants ──────────────────────────────────────────────────
const DEFAULT_CUSTOM: CustomColors = {
  '--accent-primary':   '#7c6aff',
  '--accent-secondary': '#ff6a9e',
  '--bg-primary':       '#0a0a0f',
  '--text-primary':     '#f0eff8',
};

const COLOR_ALIASES: Record<string, string[]> = {
  '--accent-primary':   ['--text-primary'],
  '--accent-secondary': ['--bg-card', '--bg-secondary'],
};

// ── DOM helper ─────────────────────────────────────────────────
function applyThemeToDom(mode: ThemeMode, customColors: CustomColors): void {
  document.documentElement.setAttribute('data-theme', mode);

  const allVars = [
    ...Object.keys(DEFAULT_CUSTOM),
    ...Object.values(COLOR_ALIASES).flat(),
  ];
  allVars.forEach(k => document.documentElement.style.removeProperty(k));

  if (mode === 'custom') {
    Object.entries(customColors).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
      COLOR_ALIASES[k]?.forEach(alias =>
        document.documentElement.style.setProperty(alias, v)
      );
    });
  }
}

// ── Context ────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = (localStorage.getItem('theme') ?? 'dark') as ThemeMode;
    applyThemeToDom(saved, DEFAULT_CUSTOM);
    return saved;
  });

  const [custom, setCustom] = useState<CustomColors>(DEFAULT_CUSTOM);
  const saveTimer           = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setTheme('dark');
      setCustom(DEFAULT_CUSTOM);
      applyThemeToDom('dark', DEFAULT_CUSTOM);
      return;
    }

    getTheme()
      .then(res => {
        const { mode, custom_colors } = res.data as { mode: ThemeMode; custom_colors: CustomColors | null };
        const colors = custom_colors ?? DEFAULT_CUSTOM;
        setTheme(mode ?? 'dark');
        setCustom(colors);
        applyThemeToDom(mode ?? 'dark', colors);
      })
      .catch(() => {});
  }, []); // ← empty array, fixed infinite loop

  const applyTheme = useCallback((
    mode: ThemeMode,
    customColors?: CustomColors,
    persist = true,
  ): void => {
    const colors = customColors ?? custom;
    localStorage.setItem('theme', mode);
    setTheme(mode);
    setCustom(colors);
    applyThemeToDom(mode, colors);
    if (persist) {
      saveTheme({ mode, custom_colors: colors }).catch(() => {});
    }
  }, [custom]);

  const updateCustomColor = useCallback((variable: string, value: string): void => {
    const updated = { ...custom, [variable]: value };
    setCustom(updated);
    document.documentElement.style.setProperty(variable, value);
    COLOR_ALIASES[variable]?.forEach(alias =>
      document.documentElement.style.setProperty(alias, value)
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTheme({ mode: 'custom', custom_colors: updated }).catch(() => {});
    }, 500);
  }, [custom]);

  return (
    <ThemeContext.Provider value={{ theme, custom, applyTheme, updateCustomColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}