import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const saved = (localStorage.getItem('max-theme') as Theme) || 'dark';
    setThemeState(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem('max-theme', next);
  }, [theme]);

  return { theme, toggle };
}
