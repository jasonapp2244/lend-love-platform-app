/**
 * Authentication service.
 *
 * Demo accounts use email/password with deterministic credentials so the
 * Firebase Spark plan works without enabling Anonymous Auth.
 *
 * Real users sign up with their own email/password. Custom claims (admin
 * roles) are added once Cloud Functions are deployed on Blaze.
 */
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User as FbUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { DEMO } from '../../src/shared';
import type { User } from '../../src/shared';

export async function signInAsGuestLoaner(): Promise<User> {
  return signInAsGuest('loaner');
}

export async function signInAsGuestBorrower(): Promise<User> {
  return signInAsGuest('borrower');
}

/**
 * Sign in as a demo user. Uses fixed credentials per role; creates the
 * account on first run, signs in on subsequent runs.
 */
async function signInAsGuest(role: 'loaner' | 'borrower'): Promise<User> {
  const isLoaner = role === 'loaner';
  const email = isLoaner ? DEMO.LOANER_EMAIL : DEMO.BORROWER_EMAIL;
  const password = DEMO.PASSWORD;

  let fbUser: FbUser;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    fbUser = cred.user;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      fbUser = cred.user;
    } else {
      throw err;
    }
  }

  const profile: User = {
    uid: fbUser.uid,
    email,
    fullName: isLoaner ? 'Guest Loaner' : 'Guest Borrower',
    phone: isLoaner ? '+1 555-7777' : '+1 555-8888',
    address: isLoaner ? 'Demo Street 10, Sample City' : 'Demo Avenue 22, Sample City',
    birthday: isLoaner ? '1990-01-01' : '1991-02-02',
    occupation: 'Demo User',
    rating: isLoaner ? 4.9 : 4.7,
    reviewCount: isLoaner ? 3 : 2,
    completedLoans: isLoaner ? 2 : 1,
    overdueLoans: 0,
    totalLent: isLoaner ? 16200 : 0,
    totalBorrowed: isLoaner ? 0 : 1500,
    isVerified: true,
    kycStatus: 'approved',
    role: 'user',
    notificationsEnabled: true,
    biometricsEnabled: false,
    themePreference: 'dark',
    isDemo: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, 'users', fbUser.uid), profile, { merge: true });
  return profile;
}

export async function signIn(email: string, password: string): Promise<FbUser> {
  await signInWithEmailAndPassword(auth, email, password);
  if (!auth.currentUser) throw new Error('Sign-in failed');
  return auth.currentUser;
}

export async function signUp(
  email: string,
  password: string,
  profile: Partial<User>
): Promise<FbUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const baseProfile: User = {
    uid: cred.user.uid,
    email,
    fullName: profile.fullName ?? '',
    phone: profile.phone,
    address: profile.address,
    birthday: profile.birthday,
    occupation: profile.occupation,
    rating: 0,
    reviewCount: 0,
    completedLoans: 0,
    overdueLoans: 0,
    totalLent: 0,
    totalBorrowed: 0,
    isVerified: false,
    kycStatus: 'none',
    role: 'user',
    notificationsEnabled: true,
    biometricsEnabled: false,
    themePreference: 'dark',
    isDemo: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(doc(db, 'users', cred.user.uid), baseProfile);
  return cred.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export async function getProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as User) : null;
}

export function onAuthChange(cb: (uid: string | null) => void) {
  return onAuthStateChanged(auth, (u) => cb(u?.uid ?? null));
}
