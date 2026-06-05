'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthChange, fetchProfile } from './auth';
import type { User } from '@lendlove/shared';

interface AuthContextValue {
  uid: string | null;
  profile: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  uid: null,
  profile: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (u) => {
      setUid(u);
      if (u) {
        const p = await fetchProfile(u);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const refresh = async () => {
    if (uid) setProfile(await fetchProfile(uid));
  };

  return (
    <AuthContext.Provider value={{ uid, profile, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Redirects to login if not signed in, or to not-authorized if signed-in user is not an admin. */
export function useRequireAdmin() {
  const { uid, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!uid) {
      router.replace('/login');
      return;
    }
    if (profile && profile.role !== 'admin') {
      router.replace('/not-authorized');
    }
  }, [uid, profile, loading, router, pathname]);

  return { uid, profile, loading };
}

/**
 * Admin tier access matrix.
 * Defines which admin tiers can access which pages.
 * 'super' has access to everything.
 */
const TIER_ACCESS: Record<string, string[]> = {
  '/dashboard':  ['super', 'operations', 'finance', 'support'],
  '/users':      ['super', 'operations', 'support'],
  '/kyc':        ['super', 'operations', 'support'],
  '/loans':      ['super', 'operations', 'finance'],
  '/agreements': ['super', 'operations', 'finance'],
  '/reports':    ['super', 'finance'],
  '/audit':      ['super'],
  '/config':     ['super'],
};

/**
 * Checks if the current admin has permission for the current page.
 * Returns { allowed, tier } — use `allowed` to conditionally render page content.
 */
export function useAdminTierAccess(): { allowed: boolean; tier: string | undefined } {
  const { profile } = useAuth();
  const pathname = usePathname();

  const tier = profile?.adminTier;

  // Super admin always has access
  if (tier === 'super') return { allowed: true, tier };

  // Find matching access rule
  const matchedPath = Object.keys(TIER_ACCESS).find((p) => pathname.includes(p));
  if (!matchedPath) return { allowed: true, tier }; // No restriction defined

  const allowedTiers = TIER_ACCESS[matchedPath] ?? [];
  return { allowed: tier ? allowedTiers.includes(tier) : false, tier };
}
