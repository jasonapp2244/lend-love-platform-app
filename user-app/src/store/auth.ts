import { create } from 'zustand';
import type { User } from '../../src/shared';

interface AuthState {
  uid: string | null;
  profile: User | null;
  loading: boolean;
  setUid: (uid: string | null) => void;
  setProfile: (profile: User | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  uid: null,
  profile: null,
  loading: true,
  setUid: (uid) => set({ uid }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ uid: null, profile: null, loading: false }),
}));
