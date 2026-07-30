import { create } from 'zustand';

export type PageView = 'dashboard' | 'executive-dashboard' | 'daily-reports' | 'operation-logs' | 'calculations' | 'water-chemistry' | 'maintenance' | 'inspections' | 'ai-insights' | 'ai-assistant' | 'reports' | 'fuel-stock' | 'factories' | 'boilers' | 'manage-users' | 'notifications' | 'settings';

export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface FactoryInfo {
  id: string;
  name: string;
  code: string;
  location: string | null;
  city: string | null;
  status: string;
  factoryRole: string;
}

export interface NotificationInfo {
  id: string; factoryId: string; userId: string | null; type: string;
  title: string; message: string; isRead: boolean; priority: string;
  link: string | null; createdAt: string;
}

const STORAGE_KEY = 'boiler_mgmt_auth';

function loadFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(user: UserInfo | null, factories: FactoryInfo[], currentFactoryId: string | null, effectiveRole: string) {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, factories, currentFactoryId, effectiveRole }));
    }
  } catch { /* ignore */ }
}

interface AppState {
  // Auth
  user: UserInfo | null;
  setUser: (user: UserInfo | null) => void;

  // Effective role (highest factory role)
  effectiveRole: string;
  setEffectiveRole: (role: string) => void;

  // Factory
  factories: FactoryInfo[];
  setFactories: (factories: FactoryInfo[]) => void;
  currentFactoryId: string | null;
  setCurrentFactoryId: (id: string | null) => void;

  // Navigation
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;

  // Auth UI
  showLogin: boolean;
  setShowLogin: (show: boolean) => void;

  // Notifications
  notifications: NotificationInfo[];
  setNotifications: (n: NotificationInfo[]) => void;
  unreadCount: number;
  setUnreadCount: (c: number) => void;

  // Helpers
  getFactoryRole: () => string;
  hydrate: () => void;
}

const saved = loadFromStorage();

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: saved?.user ?? null,
  setUser: (user) => {
    const state = get();
    saveToStorage(user, state.factories, state.currentFactoryId, state.effectiveRole);
    set({ user });
  },

  // Effective role
  effectiveRole: saved?.effectiveRole ?? 'Boiler Operator',
  setEffectiveRole: (role) => {
    const state = get();
    saveToStorage(state.user, state.factories, state.currentFactoryId, role);
    set({ effectiveRole: role });
  },

  // Factory
  factories: saved?.factories ?? [],
  setFactories: (factories) => {
    const state = get();
    saveToStorage(state.user, factories, state.currentFactoryId, state.effectiveRole);
    set({ factories });
  },
  currentFactoryId: saved?.currentFactoryId ?? null,
  setCurrentFactoryId: (id) => {
    const state = get();
    // When switching factory, update effectiveRole from that factory
    const factory = state.factories.find(f => f.id === id);
    const newRole = factory?.factoryRole || state.effectiveRole;
    saveToStorage(state.user, state.factories, id, newRole);
    set({ currentFactoryId: id, effectiveRole: newRole });
  },

  // Navigation
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Auth UI
  showLogin: !saved?.user, // If we have a saved user, don't show login
  setShowLogin: (show) => set({ showLogin: show }),

  // Notifications
  notifications: [],
  setNotifications: (n) => set({ notifications: n }),
  unreadCount: 0,
  setUnreadCount: (c) => set({ unreadCount: c }),

  // Get the role for the currently selected factory
  getFactoryRole: () => {
    const state = get();
    const factory = state.factories.find(f => f.id === state.currentFactoryId);
    return factory?.factoryRole || state.effectiveRole || 'Boiler Operator';
  },

  // Rehydrate from localStorage (for client-side navigation)
  hydrate: () => {
    const data = loadFromStorage();
    if (data?.user) {
      set({
        user: data.user,
        factories: data.factories || [],
        currentFactoryId: data.currentFactoryId || null,
        effectiveRole: data.effectiveRole || 'Boiler Operator',
        showLogin: false,
      });
    }
  },
}));