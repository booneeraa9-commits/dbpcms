/**
 * Theme store — manages light/dark mode.
 * Persisted to localStorage.
 *
 * The DOM <html> class is the single source of truth for Tailwind's dark mode.
 * The store state mirrors it for React components to read.
 */

import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  set: (theme: Theme) => void;
}

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  // Check DOM class first (truth)
  if (document.documentElement.classList.contains('dark')) return 'dark';
  // Then check storage
  const stored = localStorage.getItem('dbpcms_theme') as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  // Respect system preference
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitial(),
  toggle: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('dbpcms_theme', next);
    set({ theme: next });
  },
  set: (theme) => {
    applyTheme(theme);
    localStorage.setItem('dbpcms_theme', theme);
    set({ theme });
  },
}));

// Apply on module load so the page is correct from the very first render
if (typeof window !== 'undefined') {
  applyTheme(getInitial());
}

