/**
 * Chat service — Firestore-backed real-time messaging.
 *
 * Production migration path: this module's public API is provider-agnostic.
 * Swapping to Stream Chat later is a one-file change.
 */
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Conversation, Message } from '../../src/shared';

/**
 * Stable conversation ID derived from sorted participant UIDs (+ optional loanId).
 * Ensures two users always land in the same conversation regardless of who initiates.
 */
export function deriveConversationId(uids: string[], loanId?: string): string {
  const sorted = [...uids].sort();
  return loanId ? `${sorted.join('_')}__${loanId}` : sorted.join('_');
}

export async function openOrCreateConversation(
  uids: string[],
  loanId?: string
): Promise<string> {
  const convId = deriveConversationId(uids, loanId);
  const ref = doc(db, 'conversations', convId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const conv: Conversation = {
      id: convId,
      participantIds: [...uids].sort(),
      loanId,
      lastMessage: '',
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
    };
    await setDoc(ref, conv);
  }
  return convId;
}

export function subscribeToConversations(
  uid: string,
  cb: (conversations: Conversation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as Conversation));
  });
}

export function subscribeToMessages(
  conversationId: string,
  cb: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('sentAt', 'asc'),
    limit(200)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => d.data() as Message));
  });
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  const msgsRef = collection(db, 'conversations', conversationId, 'messages');
  const docRef = await addDoc(msgsRef, {
    conversationId,
    senderId,
    text: trimmed,
    sentAt: Date.now(),
    readBy: [senderId],
  });
  await updateDoc(docRef, { id: docRef.id });
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: trimmed.slice(0, 200),
    lastMessageAt: Date.now(),
    lastSenderId: senderId,
  });
}

export async function fetchConversation(id: string): Promise<Conversation | null> {
  const snap = await getDoc(doc(db, 'conversations', id));
  return snap.exists() ? (snap.data() as Conversation) : null;
}

/** Build a placeholder display name for a counterparty UID (used in demo). */
export function counterpartyName(uids: string[], selfUid: string): string {
  const other = uids.find((u) => u !== selfUid);
  // Self-chat (demo: same user is both loaner and borrower)
  if (!other) return 'You (self-loan)';
  if (other.startsWith('demo-loaner')) return 'Demo Loaner';
  if (other.startsWith('demo-borrower')) return 'Demo Borrower';
  if (other.startsWith('demo-marketplace')) return 'Marketplace Loaner';
  if (other.startsWith('demo-request')) return 'Borrower';
  return 'User';
}

/** Fetch the real display name for a counterparty from Firestore. */
export async function fetchCounterpartyName(uids: string[], selfUid: string): Promise<string> {
  const other = uids.find((u) => u !== selfUid);
  // Self-chat — look up own name
  if (!other) {
    try {
      const snap = await getDoc(doc(db, 'users', selfUid));
      if (snap.exists()) {
        const data = snap.data();
        return `${data.fullName || 'You'} (self-loan)`;
      }
    } catch { /* fallback */ }
    return 'You (self-loan)';
  }
  // Check demo names first
  const quick = counterpartyName(uids, selfUid);
  if (quick !== 'User') return quick;
  // Look up real name from Firestore
  try {
    const snap = await getDoc(doc(db, 'users', other));
    if (snap.exists()) {
      const data = snap.data();
      return data.fullName || data.email || 'User';
    }
  } catch { /* fallback */ }
  return 'User';
}
