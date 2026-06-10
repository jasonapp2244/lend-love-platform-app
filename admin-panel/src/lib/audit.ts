'use client';

import { collection, doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import type { AdminAction } from '@lendlove/shared';

/**
 * Record an admin action to the audit log.
 * Wrap any write that changes platform state with this.
 *
 * Demo: writes directly. Production: route through Cloud Function.
 */
/** Best-effort IP detection (client-side). */
async function fetchClientIp(): Promise<string | undefined> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return data.ip;
  } catch {
    return undefined;
  }
}

export async function audit(
  action: string,
  target: { collection: string; id: string },
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } = {}
): Promise<void> {
  const adminUid = auth().currentUser?.uid;
  if (!adminUid) throw new Error('Not signed in');

  const ref = doc(collection(db(), 'adminActions'));
  const ip = await fetchClientIp();
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
  const entry: Record<string, unknown> = {
    id: ref.id,
    adminId: adminUid,
    action,
    targetCollection: target.collection,
    targetId: target.id,
    timestamp: Date.now(),
  };
  if (changes.before !== undefined) entry.before = changes.before;
  if (changes.after !== undefined) entry.after = changes.after;
  if (ip !== undefined) entry.ip = ip;
  if (userAgent !== undefined) entry.userAgent = userAgent;
  await setDoc(ref, entry);
}
