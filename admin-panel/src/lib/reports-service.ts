'use client';

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { fetchPlatformConfig } from './config-service';
import type {
  User,
  Loan,
  Agreement,
  Transaction,
  KycSubmission,
  KycStatus,
} from '@lendlove/shared';

export type DateRange = 'all' | '7d' | '30d' | '90d';

export function rangeStart(range: DateRange): number {
  if (range === 'all') return 0;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

// ---- Aggregated stats ----

export interface ReportsOverview {
  users: { total: number; verified: number; admins: number };
  loans: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    moneyValue: number;
    itemValue: number;
  };
  agreements: { total: number; signed: number };
  transactions: { total: number; volume: number };
  kyc: Record<KycStatus | 'all', number>;
  revenue: { gross: number; feeRate: number };
}

export async function fetchReportsOverview(range: DateRange): Promise<ReportsOverview> {
  const _db = db();
  const start = rangeStart(range);
  const platformConfig = await fetchPlatformConfig();

  const [usersSnap, loansSnap, agreementsSnap, txSnap, kycSnap] = await Promise.all([
    getDocs(query(collection(_db, 'users'), limit(500))),
    getDocs(query(collection(_db, 'loans'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(_db, 'agreements'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(_db, 'transactions'), orderBy('createdAt', 'desc'), limit(500))),
    getDocs(query(collection(_db, 'kycSubmissions'), orderBy('createdAt', 'desc'), limit(500))),
  ]);

  const users = (usersSnap.docs.map((d) => d.data() as User)).filter(
    (u) => u.createdAt >= start
  );
  const loans = (loansSnap.docs.map((d) => d.data() as Loan)).filter(
    (l) => l.createdAt >= start
  );
  const agreements = (agreementsSnap.docs.map((d) => d.data() as Agreement)).filter(
    (a) => a.createdAt >= start
  );
  const transactions = (txSnap.docs.map((d) => d.data() as Transaction)).filter(
    (t) => t.createdAt >= start
  );
  const kyc = (kycSnap.docs.map((d) => d.data() as KycSubmission)).filter(
    (k) => k.createdAt >= start
  );

  const moneyValue = loans
    .filter((l): l is Loan & { type: 'money'; amount: number } => l.type === 'money')
    .reduce((s, l) => s + (l.amount ?? 0), 0);
  const itemValue = loans
    .filter((l): l is Loan & { type: 'item'; replacementValue: number } => l.type === 'item')
    .reduce((s, l) => s + (l.replacementValue ?? 0), 0);

  const txVolume = transactions
    .filter((t) => t.status === 'completed')
    .reduce((s, t) => s + (t.amount ?? 0), 0);

  const kycByStatus: Record<KycStatus | 'all', number> = {
    all: kyc.length,
    none: 0,
    pending: 0,
    manual_review: 0,
    approved: 0,
    rejected: 0,
  };
  kyc.forEach((k) => {
    kycByStatus[k.status] = (kycByStatus[k.status] ?? 0) + 1;
  });

  return {
    users: {
      total: users.length,
      verified: users.filter((u) => u.isVerified).length,
      admins: users.filter((u) => u.role === 'admin').length,
    },
    loans: {
      total: loans.length,
      active: loans.filter((l) => l.status === 'active' || l.status === 'published').length,
      completed: loans.filter((l) => l.status === 'completed').length,
      overdue: loans.filter((l) => l.status === 'overdue' || l.status === 'defaulted').length,
      moneyValue,
      itemValue,
    },
    agreements: {
      total: agreements.length,
      signed: agreements.filter((a) => !!a.signedAt).length,
    },
    transactions: { total: transactions.length, volume: txVolume },
    kyc: kycByStatus,
    revenue: {
      gross: moneyValue * (platformConfig.feePercent / 100),
      feeRate: platformConfig.feePercent,
    },
  };
}

// ---- CSV export ----

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv<T>(rows: T[], columns: { key: string; label: string; get: (r: T) => unknown }[]): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(',');
  const body = rows
    .map((r) => columns.map((c) => escapeCsv(c.get(r))).join(','))
    .join('\n');
  return header + '\n' + body;
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const fmtDate = (ms?: number) => (ms ? new Date(ms).toISOString().slice(0, 10) : '');

export async function exportUsersCsv(range: DateRange) {
  const start = rangeStart(range);
  const snap = await getDocs(query(collection(db(), 'users'), limit(1000)));
  const rows = snap.docs
    .map((d) => d.data() as User)
    .filter((u) => u.createdAt >= start)
    .sort((a, b) => b.createdAt - a.createdAt);

  const csv = toCsv(rows, [
    { key: 'uid', label: 'UID', get: (r) => r.uid },
    { key: 'fullName', label: 'Full Name', get: (r) => r.fullName },
    { key: 'email', label: 'Email', get: (r) => r.email },
    { key: 'phone', label: 'Phone', get: (r) => r.phone },
    { key: 'role', label: 'Role', get: (r) => r.role },
    { key: 'isVerified', label: 'Verified', get: (r) => r.isVerified },
    { key: 'kycStatus', label: 'KYC Status', get: (r) => r.kycStatus },
    { key: 'completed', label: 'Completed Loans', get: (r) => r.completedLoans },
    { key: 'overdue', label: 'Overdue Loans', get: (r) => r.overdueLoans },
    { key: 'rating', label: 'Rating', get: (r) => r.rating },
    { key: 'createdAt', label: 'Joined', get: (r) => fmtDate(r.createdAt) },
  ]);
  download(`lendlove-users-${range}-${fmtDate(Date.now())}.csv`, csv);
  return rows.length;
}

export async function exportLoansCsv(range: DateRange) {
  const start = rangeStart(range);
  const snap = await getDocs(
    query(collection(db(), 'loans'), orderBy('createdAt', 'desc'), limit(1000))
  );
  const rows = snap.docs.map((d) => d.data() as Loan).filter((l) => l.createdAt >= start);

  const csv = toCsv(rows, [
    { key: 'id', label: 'Loan ID', get: (r) => r.id },
    { key: 'type', label: 'Type', get: (r) => r.type },
    { key: 'status', label: 'Status', get: (r) => r.status },
    { key: 'loanerId', label: 'Loaner UID', get: (r) => r.loanerId },
    { key: 'borrowerId', label: 'Borrower UID', get: (r) => r.borrowerId ?? '' },
    {
      key: 'amount',
      label: 'Amount / Replacement Value',
      get: (r) => (r.type === 'money' ? r.amount : r.replacementValue),
    },
    {
      key: 'currency',
      label: 'Currency',
      get: (r) => (r.type === 'money' ? r.currency : 'USD'),
    },
    {
      key: 'rate',
      label: 'Interest Rate %',
      get: (r) => (r.type === 'money' ? r.interestRate : ''),
    },
    {
      key: 'dueDate',
      label: 'Due / Return Date',
      get: (r) => fmtDate(r.type === 'money' ? r.dueDate : r.returnDate),
    },
    { key: 'createdAt', label: 'Created', get: (r) => fmtDate(r.createdAt) },
  ]);
  download(`lendlove-loans-${range}-${fmtDate(Date.now())}.csv`, csv);
  return rows.length;
}

export async function exportAgreementsCsv(range: DateRange) {
  const start = rangeStart(range);
  const snap = await getDocs(
    query(collection(db(), 'agreements'), orderBy('createdAt', 'desc'), limit(1000))
  );
  const rows = snap.docs
    .map((d) => d.data() as Agreement)
    .filter((a) => a.createdAt >= start);

  const csv = toCsv(rows, [
    { key: 'id', label: 'Agreement ID', get: (r) => r.id },
    { key: 'loanId', label: 'Loan ID', get: (r) => r.loanId },
    { key: 'loaner', label: 'Loaner', get: (r) => r.loanerName },
    { key: 'borrower', label: 'Borrower', get: (r) => r.borrowerName },
    { key: 'amount', label: 'Amount', get: (r) => r.loanAmount },
    { key: 'apr', label: 'APR %', get: (r) => r.apr.toFixed(2) },
    { key: 'fc', label: 'Finance Charge', get: (r) => r.financeCharge.toFixed(2) },
    { key: 'total', label: 'Total of Payments', get: (r) => r.totalOfPayments.toFixed(2) },
    { key: 'signed', label: 'Signed', get: (r) => (r.signedAt ? 'Yes' : 'No') },
    { key: 'signedAt', label: 'Signed At', get: (r) => fmtDate(r.signedAt) },
    { key: 'createdAt', label: 'Created', get: (r) => fmtDate(r.createdAt) },
  ]);
  download(`lendlove-agreements-${range}-${fmtDate(Date.now())}.csv`, csv);
  return rows.length;
}

export async function exportTransactionsCsv(range: DateRange) {
  const start = rangeStart(range);
  const snap = await getDocs(
    query(collection(db(), 'transactions'), orderBy('createdAt', 'desc'), limit(1000))
  );
  const rows = snap.docs
    .map((d) => d.data() as Transaction)
    .filter((t) => t.createdAt >= start);

  const csv = toCsv(rows, [
    { key: 'id', label: 'Transaction ID', get: (r) => r.id },
    { key: 'loanId', label: 'Loan ID', get: (r) => r.loanId },
    { key: 'userId', label: 'User UID', get: (r) => r.userId },
    { key: 'type', label: 'Type', get: (r) => r.type },
    { key: 'direction', label: 'Direction', get: (r) => r.direction },
    { key: 'amount', label: 'Amount', get: (r) => r.amount },
    { key: 'currency', label: 'Currency', get: (r) => r.currency },
    { key: 'status', label: 'Status', get: (r) => r.status },
    { key: 'desc', label: 'Description', get: (r) => r.description ?? '' },
    { key: 'createdAt', label: 'Created', get: (r) => fmtDate(r.createdAt) },
  ]);
  download(`lendlove-transactions-${range}-${fmtDate(Date.now())}.csv`, csv);
  return rows.length;
}

export async function exportKycCsv(range: DateRange) {
  const start = rangeStart(range);
  const snap = await getDocs(
    query(collection(db(), 'kycSubmissions'), orderBy('createdAt', 'desc'), limit(1000))
  );
  const rows = snap.docs
    .map((d) => d.data() as KycSubmission)
    .filter((k) => k.createdAt >= start);

  const csv = toCsv(rows, [
    { key: 'id', label: 'Submission ID', get: (r) => r.id },
    { key: 'userId', label: 'User UID', get: (r) => r.userId },
    { key: 'status', label: 'Status', get: (r) => r.status },
    {
      key: 'confidence',
      label: 'Confidence %',
      get: (r) => (r.confidenceScore != null ? Math.round(r.confidenceScore * 100) : ''),
    },
    { key: 'aml', label: 'AML Flag', get: (r) => (r.amlFlag ? 'Yes' : 'No') },
    { key: 'reason', label: 'Rejection Reason', get: (r) => r.rejectionReason ?? '' },
    { key: 'submitted', label: 'Submitted', get: (r) => fmtDate(r.createdAt) },
    { key: 'reviewed', label: 'Reviewed', get: (r) => fmtDate(r.reviewedAt) },
  ]);
  download(`lendlove-kyc-${range}-${fmtDate(Date.now())}.csv`, csv);
  return rows.length;
}
