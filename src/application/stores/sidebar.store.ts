import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  closeMobileMenu: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      isMobileOpen: false,
      toggleSidebar: () =>
        set((state) => ({
          isCollapsed: !state.isCollapsed,
        })),
      toggleMobileMenu: () =>
        set((state) => ({
          isMobileOpen: !state.isMobileOpen,
        })),
      closeMobileMenu: () => set({ isMobileOpen: false }),
      setSidebarCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({ isCollapsed: state.isCollapsed }), // Only persist collapse state, not mobile menu
    }
  )
);
