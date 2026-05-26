import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  currentRoute: string
  toggleSidebar: () => void
  setCurrentRoute: (route: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  currentRoute: '/dashboard',
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCurrentRoute: (route) => set({ currentRoute: route }),
}))
