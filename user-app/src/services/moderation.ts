/**
 * User moderation — block/unblock users.
 * Blocked users are stored in a subcollection: users/{uid}/blockedUsers/{blockedUid}
 */
import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import { db } from './firebase';

export async function blockUser(uid: string, blockedUid: string): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'blockedUsers', blockedUid),
    { blockedAt: Date.now() },
  );
}

export async function unblockUser(uid: string, blockedUid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'blockedUsers', blockedUid));
}

export async function fetchBlockedUserIds(uid: string): Promise<string[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'blockedUsers'));
  return snap.docs.map((d) => d.id);
}
