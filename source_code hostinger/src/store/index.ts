import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  section: string | null;
}

interface AppState {
  appUser: AppUser | null;
  originalRole: string | null;
  inviteCode: string | null;
  setAppUser: (user: AppUser | null) => void;
  setInviteCode: (code: string | null) => void;
  switchRole: (role: string) => void;
  resetRole: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      appUser: null,
      originalRole: null,
      inviteCode: null,
      setAppUser: (user) => set({ appUser: user, originalRole: user?.role || null }),
      setInviteCode: (code) => set({ inviteCode: code }),
      switchRole: (role) => {
        const { appUser, originalRole } = get();
        if (originalRole === 'developer' && appUser) {
           set({ appUser: { ...appUser, role } });
        }
      },
      resetRole: () => {
        const { appUser, originalRole } = get();
        if (originalRole === 'developer' && appUser) {
           set({ appUser: { ...appUser, role: 'developer' } });
        }
      }
    }),
    {
      name: 'sentinel-storage',
    }
  )
);
