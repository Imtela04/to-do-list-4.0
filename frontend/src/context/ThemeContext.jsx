import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getTheme, saveTheme } from '../api/services';

const ThemeContext = createContext();

const DEFAULT_CUSTOM = {
  '--accent-primary':   '#7c6aff',
  '--accent-secondary': '#ff6a9e',
  '--bg-primary':       '#0a0a0f',
  '--text-primary':     '#f0eff8',
};

// Maps each user-picked variable → extra CSS vars it should also drive
const COLOR_ALIASES = {
  '--accent-primary':   ['--text-primary'],
  '--accent-secondary': ['--bg-card', '--bg-secondary'],
};

function applyThemeToDom(mode, customColors) {
  document.documentElement.setAttribute('data-theme', mode);

  // Clear all custom-controlled vars (including aliases)
  const allVars = [
    ...Object.keys(DEFAULT_CUSTOM),
    ...Object.values(COLOR_ALIASES).flat(),
  ];
  allVars.forEach(k => document.documentElement.style.removeProperty(k));

  if (mode === 'custom') {
    Object.entries(customColors).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
      // Also push to aliased vars
      COLOR_ALIASES[k]?.forEach(alias =>
        document.documentElement.style.setProperty(alias, v)
      );
    });
  }
}


export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    applyThemeToDom(saved, DEFAULT_CUSTOM);
    return saved;
  });  
  const [custom, setCustom] = useState(DEFAULT_CUSTOM);
  const saveTimer           = useRef(null);
  const loaded              = useRef(false);  // prevent double-fire in StrictMode

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // No user — reset to default
      setTheme('dark');
      setCustom(DEFAULT_CUSTOM);
      applyThemeToDom('dark', DEFAULT_CUSTOM);
      return;
    }

  // const token = localStorage.getItem('authToken');
  // if (!token) return;  // not logged in, don't even try

  getTheme()
      .then(res => {
        const { mode, custom_colors } = res.data;
        const colors = custom_colors || DEFAULT_CUSTOM;
        setTheme(mode || 'dark');
        setCustom(colors);
        applyThemeToDom(mode || 'dark', colors);
      })
      .catch(() => {});
  }, [localStorage.getItem('authToken')]); // re-run when token changes


  const applyTheme = useCallback((mode, customColors, persist = true) => {
    const colors = customColors ?? custom;
    localStorage.setItem('theme', mode);  // ← add this
    setTheme(mode);
    setCustom(colors);
    applyThemeToDom(mode, colors);
    if (persist) {
      saveTheme({ mode, custom_colors: colors }).catch(() => {});
    }
  }, [custom]);

  const updateCustomColor = useCallback((variable, value) => {
    const updated = { ...custom, [variable]: value };
    setCustom(updated);

    // Set the variable itself
    document.documentElement.style.setProperty(variable, value);
    // Set any aliased vars immediately too
    COLOR_ALIASES[variable]?.forEach(alias =>
      document.documentElement.style.setProperty(alias, value)
    );

    clearTimeout(saveTimer.current);
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

export const useTheme = () => useContext(ThemeContext);