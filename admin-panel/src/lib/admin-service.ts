'use client';

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from './firebase';
import { audit } from './audit';
import type { User, Loan, LoanRequest } from '@lendlove/shared';

// ---- KPIs ----

export async function fetchDashboardStats() {
  const _db = db();
  const [usersCount, verifiedCount, loansSnap, requestsSnap] = await Promise.all([
    getCountFromServer(collection(_db, 'users')),
    getCountFromServer(query(collection(_db, 'users'), where('isVerified', '==', true))),
    getDocs(query(collection(_db, 'loans'), limit(500))),
    getCountFromServer(query(collection(_db, 'loanRequests'), where('status', '==', 'open'))),
  ]);

  const loans = loansSnap.docs.map((d) => d.data() as Loan);
  const active = loans.filter((l) => l.status === 'active' || l.status === 'published');
  const overdue = loans.filter((l) => l.status === 'overdue' || l.status === 'defaulted');
  const completed = loans.filter((l) => l.status === 'completed');
  const moneyLoans = loans.filter((l) => l.type === 'money');
  const itemLoans = loans.filter((l) => l.type === 'item');

  const activeValue = active
    .filter((l): l is Loan & { type: 'money'; amount: number } => l.type === 'money')
    .reduce((sum, l) => sum + (l.amount ?? 0), 0);

  return {
    totalUsers: usersCount.data().count,
    activeLoanCount: active.length,
    activeLoanValue: activeValue,
    overdueCount: overdue.length,
    completedCount: completed.length,
    moneyLoanCount: moneyLoans.length,
    itemLoanCount: itemLoans.length,
    openRequestCount: requestsSnap.data().count,
    verifiedUsers: verifiedCount.data().count,
  };
}

// ---- Users ----

export async function fetchUsers(opts?: {
  search?: string;
  verifiedOnly?: boolean;
  adminOnly?: boolean;
}): Promise<User[]> {
  const snap = await getDocs(query(collection(db(), 'users'), limit(500)));
  let users = snap.docs.map((d) => d.data() as User);

  if (opts?.search) {
    const q = opts.search.toLowerCase();
    users = users.filter(
      (u) =>
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
    );
  }
  if (opts?.verifiedOnly) users = users.filter((u) => u.isVerified);
  if (opts?.adminOnly) users = users.filter((u) => u.role === 'admin');

  return users.sort((a, b) => b.createdAt - a.createdAt);
}

export async function setUserVerification(uid: string, verified: boolean) {
  await updateDoc(doc(db(), 'users', uid), {
    isVerified: verified,
    kycStatus: verified ? 'approved' : 'rejected',
    updatedAt: Date.now(),
  });
  await audit(
    verified ? 'user.verify' : 'user.revoke_verification',
    { collection: 'users', id: uid },
    { after: { isVerified: verified } }
  );
}

export async function setUserSuspended(uid: string, suspended: boolean) {
  await updateDoc(doc(db(), 'users', uid), {
    suspended,
    updatedAt: Date.now(),
  });
  await audit(
    suspended ? 'user.suspend' : 'user.unsuspend',
    { collection: 'users', id: uid },
    { after: { suspended } }
  );
}
