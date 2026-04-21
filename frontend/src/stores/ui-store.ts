import { create } from 'zustand';
import type { Provider } from '@/types';

type Theme = 'dark' | 'light';

interface UIState {
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  compareQueue: Provider[];
  addToCompare: (provider: Provider) => void;
  removeFromCompare: (providerId: string) => void;
  clearCompare: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem('app-theme');
  return saved === 'light' ? 'light' : 'dark';
};

const applyTheme = (theme: Theme) => {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  localStorage.setItem('app-theme', theme);
};

// Apply on load
const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useUIStore = create<UIState>((set, get) => ({
  loginModalOpen: false,
  setLoginModalOpen: (open) => set({ loginModalOpen: open }),
  compareQueue: [],
  addToCompare: (provider) => {
    const queue = get().compareQueue;
    if (queue.length < 3 && !queue.find((p) => p.id === provider.id)) {
      set({ compareQueue: [...queue, provider] });
    }
  },
  removeFromCompare: (providerId) =>
    set({ compareQueue: get().compareQueue.filter((p) => p.id !== providerId) }),
  clearCompare: () => set({ compareQueue: [] }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
