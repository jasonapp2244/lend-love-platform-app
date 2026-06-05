/**
 * Demo seed — populates a guest account's Firestore data so the
 * client can demo every feature without paid integrations.
 *
 * Each record is written individually with try/catch so a single
 * failure cannot cascade and kill the rest of the seed.
 *
 * Idempotent: only seeds when the user has zero loans.
 */
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';

const ONE_DAY = 24 * 60 * 60 * 1000;

export async function seedDemoDataForUser(uid: string, role: 'loaner' | 'borrower') {
  const existing = await getDocs(
    query(collection(db, 'loans'), where('loanerId', '==', uid), limit(1))
  );
  if (!existing.empty) return;

  const writes = [
    ...(role === 'loaner' ? loanerWrites(uid) : borrowerWrites(uid)),
    // Seed a KYC submission record so admin KYC queue has data
    () => seedKycSubmission(uid),
  ];

  let ok = 0;
  let failed = 0;
  for (const w of writes) {
    try {
      await w();
      ok++;
    } catch (e) {
      failed++;
      // eslint-disable-next-line no-console
      console.warn('[demo-seed] write failed:', e);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[demo-seed] role=${role} ok=${ok} failed=${failed}`);
}

function loanerWrites(uid: string): Array<() => Promise<void>> {
  const now = Date.now();
  return [
    addLoan({
      type: 'money',
      loanerId: uid,
      status: 'active',
      amount: 1200,
      currency: 'USD',
      interestRate: 2.5,
      installments: 6,
      installmentFrequency: 'monthly',
      lateFeePerDay: 0,
      dueDate: now + 90 * ONE_DAY,
      balance: 1000,
      description: 'Flexible small loan for short-term needs',
      createdAt: now - 30 * ONE_DAY,
      publishedAt: now - 30 * ONE_DAY,
    }),
    addLoan({
      type: 'money',
      loanerId: uid,
      status: 'published',
      amount: 5000,
      currency: 'USD',
      interestRate: 5,
      installments: 6,
      installmentFrequency: 'monthly',
      lateFeePerDay: 0,
      dueDate: now + 180 * ONE_DAY,
      description: 'Quick loan for emergency expenses. Low interest rate.',
      createdAt: now - 7 * ONE_DAY,
      publishedAt: now - 7 * ONE_DAY,
    }),
    addLoan({
      type: 'money',
      loanerId: uid,
      status: 'published',
      amount: 10000,
      currency: 'USD',
      interestRate: 0,
      installments: 12,
      installmentFrequency: 'monthly',
      lateFeePerDay: 0,
      dueDate: now + 90 * ONE_DAY,
      description: 'Interest-free loan. Must repay in full by due date.',
      createdAt: now - 5 * ONE_DAY,
      publishedAt: now - 5 * ONE_DAY,
    }),
    addLoan({
      type: 'item',
      loanerId: uid,
      status: 'active',
      itemTitle: 'Cordless Drill Kit',
      description: '18V brushless drill with 2 batteries and charger',
      condition: 'Good',
      deposit: 50,
      replacementValue: 200,
      returnDate: now + 10 * ONE_DAY,
      notes: 'Please return fully charged 🔋',
      createdAt: now - 5 * ONE_DAY,
      publishedAt: now - 5 * ONE_DAY,
    }),
    addLoan({
      type: 'item',
      loanerId: uid,
      status: 'published',
      itemTitle: 'Canon EOS R6 Camera',
      description:
        'Professional mirrorless camera with 2 lenses (24-70mm and 70-200mm). Perfect for photography.',
      condition: 'Excellent',
      deposit: 100,
      replacementValue: 3500,
      returnDate: now + 14 * ONE_DAY,
      notes: 'Must handle with care. Includes camera bag and accessories.',
      createdAt: now - 3 * ONE_DAY,
      publishedAt: now - 3 * ONE_DAY,
    }),
    addLoan({
      type: 'item',
      loanerId: uid,
      status: 'published',
      itemTitle: 'Mountain Bike',
      description:
        'Trek X-Caliber 9 mountain bike. 29" wheels, full suspension, great for trails.',
      condition: 'Good',
      deposit: 50,
      replacementValue: 1200,
      returnDate: now + 7 * ONE_DAY,
      createdAt: now - 2 * ONE_DAY,
      publishedAt: now - 2 * ONE_DAY,
    }),
    addRequest({
      borrowerId: uid,
      amount: 3000,
      currency: 'USD',
      purpose: 'Medical expenses for family member',
      neededByDate: now + 4 * ONE_DAY,
      repaymentTermMonths: 3,
      createdAt: now - 2 * ONE_DAY,
    }),
    addRequest({
      borrowerId: uid,
      amount: 1500,
      currency: 'USD',
      purpose: 'Car repair',
      neededByDate: now + 5 * ONE_DAY,
      repaymentTermMonths: 2,
      collateral: 'Vehicle title as collateral',
      createdAt: now - 1 * ONE_DAY,
    }),
    addRequest({
      borrowerId: uid,
      amount: 800,
      currency: 'USD',
      purpose: 'Emergency car repair',
      neededByDate: now + 3 * ONE_DAY,
      repaymentTermMonths: 2,
      createdAt: now - 0.5 * ONE_DAY,
    }),
  ];
}

function borrowerWrites(uid: string): Array<() => Promise<void>> {
  const now = Date.now();

  // Pre-create the borrowed loan so the transaction + conversation can
  // reference its ID.
  const borrowedLoanRef = doc(collection(db, 'loans'));
  const borrowedLoanId = borrowedLoanRef.id;

  return [
    () =>
      setDoc(borrowedLoanRef, {
        id: borrowedLoanId,
        type: 'money',
        loanerId: uid,
        borrowerId: uid,
        status: 'active',
        amount: 1500,
        currency: 'USD',
        interestRate: 3,
        installments: 3,
        installmentFrequency: 'monthly',
        lateFeePerDay: 0,
        dueDate: now + 90 * ONE_DAY,
        balance: 1500,
        description: 'Sample borrowed loan',
        createdAt: now - 10 * ONE_DAY,
        updatedAt: now,
        publishedAt: now - 10 * ONE_DAY,
      }),
    () => {
      const ref = doc(collection(db, 'transactions'));
      return setDoc(ref, {
        id: ref.id,
        loanId: borrowedLoanId,
        userId: uid,
        type: 'disbursement',
        direction: 'credit',
        amount: 1500,
        currency: 'USD',
        status: 'completed',
        description: 'Loan Disbursed',
        processedAt: now - 10 * ONE_DAY,
        createdAt: now - 10 * ONE_DAY,
      });
    },
    addLoan({
      type: 'money',
      loanerId: uid,
      status: 'published',
      amount: 5000,
      currency: 'USD',
      interestRate: 5,
      installments: 6,
      installmentFrequency: 'monthly',
      lateFeePerDay: 0,
      dueDate: now + 180 * ONE_DAY,
      description: 'Quick loan for emergency expenses. Low interest rate.',
      createdAt: now - 7 * ONE_DAY,
      publishedAt: now - 7 * ONE_DAY,
    }),
    addLoan({
      type: 'money',
      loanerId: uid,
      status: 'published',
      amount: 10000,
      currency: 'USD',
      interestRate: 0,
      installments: 12,
      installmentFrequency: 'monthly',
      lateFeePerDay: 0,
      dueDate: now + 90 * ONE_DAY,
      description: 'Interest-free loan. Must repay in full by due date.',
      createdAt: now - 5 * ONE_DAY,
      publishedAt: now - 5 * ONE_DAY,
    }),
    addLoan({
      type: 'item',
      loanerId: uid,
      status: 'published',
      itemTitle: 'Canon EOS R6 Camera',
      description:
        'Professional mirrorless camera with 2 lenses (24-70mm and 70-200mm). Perfect for photography.',
      condition: 'Excellent',
      deposit: 100,
      replacementValue: 3500,
      returnDate: now + 14 * ONE_DAY,
      notes: 'Must handle with care. Includes camera bag and accessories.',
      createdAt: now - 3 * ONE_DAY,
      publishedAt: now - 3 * ONE_DAY,
    }),
    addLoan({
      type: 'item',
      loanerId: uid,
      status: 'published',
      itemTitle: 'Mountain Bike',
      description:
        'Trek X-Caliber 9 mountain bike. 29" wheels, full suspension, great for trails.',
      condition: 'Good',
      deposit: 50,
      replacementValue: 1200,
      returnDate: now + 7 * ONE_DAY,
      createdAt: now - 2 * ONE_DAY,
      publishedAt: now - 2 * ONE_DAY,
    }),
    addRequest({
      borrowerId: uid,
      amount: 800,
      currency: 'USD',
      purpose: 'Emergency car repair',
      neededByDate: now + 3 * ONE_DAY,
      repaymentTermMonths: 2,
      createdAt: now - 1 * ONE_DAY,
    }),
    addRequest({
      borrowerId: uid,
      amount: 3000,
      currency: 'USD',
      purpose: 'Medical expenses for family member',
      neededByDate: now + 4 * ONE_DAY,
      repaymentTermMonths: 3,
      createdAt: now - 0.5 * ONE_DAY,
    }),
    () => {
      const partnerId = 'demo-loaner-partner';
      const convId = `${uid}__demo-thread`;
      return setDoc(doc(db, 'conversations', convId), {
        id: convId,
        participantIds: [uid, partnerId],
        loanId: borrowedLoanId,
        lastMessage: 'Hello! It is due in 30 days. I will share the PDF now.',
        lastMessageAt: now - 6 * 60 * 1000,
        lastSenderId: uid,
        createdAt: now - 10 * ONE_DAY,
      });
    },
    ...['Hi! Saw your request — happy to lend.', 'Thank you so much. Can we proceed?', 'Yes, drafting the agreement now.', 'Hello! It is due in 30 days. I will share the PDF now.'].map(
      (text, i) => () => {
        const convId = `${uid}__demo-thread`;
        const ref = doc(collection(db, 'conversations', convId, 'messages'));
        const at = now - (20 - i * 5) * 60 * 1000;
        return setDoc(ref, {
          id: ref.id,
          conversationId: convId,
          senderId: uid,
          text,
          sentAt: at,
          readBy: [uid],
        });
      }
    ),
  ];
}

// ---- helpers ----

function addLoan(
  data: Record<string, unknown> & { createdAt: number; publishedAt: number }
): () => Promise<void> {
  return () => {
    const ref = doc(collection(db, 'loans'));
    return setDoc(ref, { id: ref.id, ...data, updatedAt: Date.now() });
  };
}

function addRequest(
  data: Record<string, unknown> & { createdAt: number }
): () => Promise<void> {
  return () => {
    const ref = doc(collection(db, 'loanRequests'));
    return setDoc(ref, { id: ref.id, status: 'open', ...data, updatedAt: Date.now() });
  };
}

async function seedKycSubmission(uid: string): Promise<void> {
  const ref = doc(collection(db, 'kycSubmissions'));
  await setDoc(ref, {
    id: ref.id,
    userId: uid,
    status: 'approved',
    documents: {
      idUrl: 'https://via.placeholder.com/400x250?text=Government+ID',
      selfieUrl: 'https://via.placeholder.com/400x250?text=Selfie',
      addressUrl: 'https://via.placeholder.com/400x250?text=Proof+of+Address',
    },
    confidenceScore: 0.98,
    amlFlag: false,
    reviewedBy: 'demo-admin',
    reviewedAt: Date.now() - 2 * ONE_DAY,
    createdAt: Date.now() - 3 * ONE_DAY,
  });
}
