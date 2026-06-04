/**
 * Loan service — Firestore reads/writes for loans and loan requests.
 * Uses real-time listeners where it matters; one-shot queries otherwise.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  setDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  CreateLoanSchema,
  CreateLoanRequestSchema,
  type Loan,
  type LoanRequest,
  type LoanType,
  type CreateLoanInput,
  type CreateLoanRequestInput,
} from '../../src/shared';

const PAGE_SIZE = 20;

// ---- Marketplace queries ----

export interface PaginatedResult<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export async function fetchMarketplaceLoans(
  type: LoanType,
  cursor?: QueryDocumentSnapshot | null,
): Promise<PaginatedResult<Loan>> {
  const q = cursor
    ? query(
        collection(db, 'loans'),
        where('type', '==', type),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        startAfter(cursor),
        limit(PAGE_SIZE),
      )
    : query(
        collection(db, 'loans'),
        where('type', '==', type),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(PAGE_SIZE),
      );
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => d.data() as Loan);
  return {
    items,
    lastDoc: snap.docs[snap.docs.length - 1] ?? null,
    hasMore: snap.docs.length === PAGE_SIZE,
  };
}

export async function fetchMarketplaceRequests(): Promise<LoanRequest[]> {
  const q = query(
    collection(db, 'loanRequests'),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as LoanRequest);
}

// ---- My loans (lending + borrowing tabs) ----

export async function fetchMyLending(uid: string): Promise<Loan[]> {
  const q = query(
    collection(db, 'loans'),
    where('loanerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Loan);
}

export async function fetchMyBorrowing(uid: string): Promise<Loan[]> {
  const q = query(
    collection(db, 'loans'),
    where('borrowerId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as Loan);
}

// ---- Single loan ----

export async function fetchLoan(loanId: string): Promise<Loan | null> {
  const snap = await getDoc(doc(db, 'loans', loanId));
  return snap.exists() ? (snap.data() as Loan) : null;
}

// ---- Create loan (client-side direct write in demo mode) ----
// In production this will be replaced by a Cloud Function call.
// Security rules already enforce that loanerId === auth.uid.

export async function createLoan(loanerId: string, input: CreateLoanInput): Promise<string> {
  const parsed = CreateLoanSchema.parse(input);
  const ref = doc(collection(db, 'loans'));
  const now = Date.now();

  const base = {
    id: ref.id,
    loanerId,
    status: 'published' as const,
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };

  if (parsed.type === 'money') {
    await setDoc(ref, {
      ...base,
      type: 'money',
      amount: parsed.amount,
      currency: parsed.currency,
      interestRate: parsed.interestRate,
      installments: parsed.installments,
      installmentFrequency: parsed.installmentFrequency,
      lateFeePerDay: parsed.lateFeePerDay,
      dueDate: parsed.dueDate,
      description: parsed.description ?? '',
      notes: parsed.notes ?? '',
    });
  } else {
    await setDoc(ref, {
      ...base,
      type: 'item',
      itemTitle: parsed.itemTitle,
      description: parsed.description,
      condition: parsed.condition,
      deposit: parsed.deposit ?? 0,
      replacementValue: parsed.replacementValue,
      returnDate: parsed.returnDate,
      notes: parsed.notes ?? '',
    });
  }

  return ref.id;
}

// ---- Create loan request (borrower posts) ----

export async function createLoanRequest(
  borrowerId: string,
  input: CreateLoanRequestInput
): Promise<string> {
  const parsed = CreateLoanRequestSchema.parse(input);
  const ref = doc(collection(db, 'loanRequests'));
  const now = Date.now();
  await setDoc(ref, {
    id: ref.id,
    borrowerId,
    status: 'open' as const,
    createdAt: now,
    updatedAt: now,
    ...parsed,
  });
  return ref.id;
}
