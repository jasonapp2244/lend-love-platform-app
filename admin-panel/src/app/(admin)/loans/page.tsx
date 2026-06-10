'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllLoans,
  fetchLoanAgreement,
  setLoanStatus,
  setAdminNote,
  type LoanRow,
} from '@/lib/loan-service';
import { formatMoney, formatDate } from '@/lib/format';
import { LoanStatusBadge } from '@/components/LoanStatusBadge';
import type { LoanStatus, LoanType } from '@lendlove/shared';

type StatusFilter = LoanStatus | 'all';
type TypeFilter = LoanType | 'all';

const STATUS_OPTS: StatusFilter[] = [
  'all',
  'published',
  'pending-agreement',
  'active',
  'overdue',
  'completed',
  'cancelled',
  'defaulted',
];

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: 'All',
  draft: 'Draft',
  published: 'Published',
  'pending-agreement': 'Pending Agreement',
  'pending-disbursement': 'Pending Disbursement',
  active: 'Active',
  overdue: 'Overdue',
  completed: 'Completed',
  cancelled: 'Cancelled',
  defaulted: 'Defaulted',
};

export default function LoansPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loansQ = useQuery({
    queryKey: ['admin', 'loans'],
    queryFn: fetchAllLoans,
  });

  const filtered = useMemo(() => {
    let data = loansQ.data ?? [];
    if (statusFilter !== 'all') data = data.filter((l) => l.status === statusFilter);
    if (typeFilter !== 'all') data = data.filter((l) => l.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (l) =>
          l.loaner?.fullName?.toLowerCase().includes(q) ||
          l.loaner?.email?.toLowerCase().includes(q) ||
          l.borrower?.fullName?.toLowerCase().includes(q) ||
          l.borrower?.email?.toLowerCase().includes(q) ||
          (l.type === 'money' && l.amount.toString().includes(q)) ||
          (l.type === 'item' && l.itemTitle.toLowerCase().includes(q))
      );
    }
    return data;
  }, [loansQ.data, statusFilter, typeFilter, search]);

  const selected = useMemo(
    () => filtered.find((l) => l.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const stats = useMemo(() => {
    const data = loansQ.data ?? [];
    const active = data.filter((l) => l.status === 'active' || l.status === 'published');
    const totalValue = active
      .filter((l): l is LoanRow & { type: 'money'; amount: number } => l.type === 'money')
      .reduce((sum, l) => sum + (l.amount ?? 0), 0);
    return {
      total: data.length,
      active: active.length,
      overdue: data.filter((l) => l.status === 'overdue').length,
      totalValue,
    };
  }, [loansQ.data]);

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Loan Management</h1>
          <p className="text-sm text-white/50">
            {loansQ.isLoading ? 'Loading…' : (
              <>{stats.total} total · {stats.active} active · {formatMoney(stats.totalValue)} loaned ·{' '}
              <span className="text-danger">{stats.overdue} overdue</span></>
            )}
          </p>
        </div>
        <button
          onClick={() => loansQ.refetch()}
          className="text-xs px-3 py-1.5 bg-bg-surface border border-border rounded-md hover:bg-bg-elevated"
        >
          ⟳ Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by amount, item, party name…"
          className="flex-1 min-w-[240px] bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <div className="flex gap-1 text-xs bg-bg-surface border border-border rounded-md p-1">
          {(['all', 'money', 'item'] as TypeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1 rounded capitalize ${
                typeFilter === f
                  ? 'bg-primary text-black font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 text-xs bg-bg-surface border border-border rounded-md p-1 mb-4 overflow-x-auto">
        {STATUS_OPTS.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded whitespace-nowrap ${
              statusFilter === f
                ? 'bg-primary text-black font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr,420px] gap-4">
        <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-white/60 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-3">Loan</th>
                <th className="text-left px-3 py-3">Parties</th>
                <th className="text-left px-3 py-3">Status</th>
                <th className="text-right px-3 py-3">Due / Return</th>
              </tr>
            </thead>
            <tbody>
              {loansQ.isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-white/40">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-white/40">
                    No loans match.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className={`border-t border-border cursor-pointer transition ${
                      selectedId === l.id ? 'bg-primary/5' : 'hover:bg-bg-elevated'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <div className="font-semibold">
                        {l.type === 'money' ? (
                          <span className="text-primary-light">
                            {formatMoney(l.amount, l.currency)}
                          </span>
                        ) : (
                          <span className="text-secondary">{l.itemTitle}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/40">
                        {l.type === 'money'
                          ? `${l.interestRate}% APR · ${l.installments}× ${l.installmentFrequency}`
                          : l.condition}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>
                        <span className="text-white/40">L:</span>{' '}
                        <span className="text-white/80">
                          {l.loaner?.fullName ?? l.loanerId.slice(0, 6)}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/40">B:</span>{' '}
                        <span className="text-white/80">
                          {l.borrower?.fullName ?? (l.borrowerId ? l.borrowerId.slice(0, 6) : '—')}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <LoanStatusBadge status={l.status} />
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-white/70">
                      {l.type === 'money' ? formatDate(l.dueDate) : formatDate(l.returnDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <LoanDetail loan={selected} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  );
}

function LoanDetail({ loan, onClose }: { loan: LoanRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [showNote, setShowNote] = useState(false);

  const agreementQ = useQuery({
    queryKey: ['admin', 'loan-agreement', loan?.id],
    queryFn: () => fetchLoanAgreement(loan!.id),
    enabled: !!loan?.agreementId,
  });

  const statusMut = useMutation({
    mutationFn: (status: LoanStatus) => setLoanStatus(loan!.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'loans'] }),
  });

  const noteMut = useMutation({
    mutationFn: (note: string) => setAdminNote(loan!.id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'loans'] });
      setShowNote(false);
      setNoteText('');
    },
  });

  if (!loan) {
    return (
      <div className="bg-bg-surface border border-border rounded-xl p-10 flex items-center justify-center text-white/40 sticky top-6 h-fit">
        Select a loan to view details
      </div>
    );
  }

  const adminNote = (loan as LoanRow & { adminNote?: string }).adminNote;

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-6 space-y-5 sticky top-6 h-fit">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40">
            {loan.type === 'money' ? 'Money Loan' : 'Item Loan'}
          </div>
          <div className="text-2xl font-bold text-primary-light mt-0.5">
            {loan.type === 'money' ? formatMoney(loan.amount, loan.currency) : loan.itemTitle}
          </div>
          <div className="text-[11px] text-white/40 mt-1">ID {loan.id.slice(0, 12)}</div>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white text-lg">
          ✕
        </button>
      </div>

      <div className="flex items-center gap-2">
        <LoanStatusBadge status={loan.status} />
        <span className="text-xs text-white/40">
          Created {formatDate(loan.createdAt)}
        </span>
      </div>

      <div className="space-y-1 text-sm">
        {loan.type === 'money' ? (
          <>
            <Field label="Interest" value={`${loan.interestRate}% APR`} />
            <Field
              label="Installments"
              value={`${loan.installments} × ${loan.installmentFrequency}`}
            />
            <Field label="Late Fee/day" value={formatMoney(loan.lateFeePerDay)} />
            <Field label="Due Date" value={formatDate(loan.dueDate)} />
            {loan.balance != null ? (
              <Field label="Balance" value={formatMoney(loan.balance)} />
            ) : null}
          </>
        ) : (
          <>
            <Field label="Condition" value={loan.condition} />
            <Field label="Replacement Value" value={formatMoney(loan.replacementValue)} />
            {loan.deposit ? <Field label="Deposit" value={formatMoney(loan.deposit)} /> : null}
            <Field label="Return Date" value={formatDate(loan.returnDate)} />
          </>
        )}
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">Parties</h3>
        <Party label="Loaner" name={loan.loaner?.fullName} email={loan.loaner?.email} verified={loan.loaner?.isVerified} />
        <Party
          label="Borrower"
          name={loan.borrower?.fullName}
          email={loan.borrower?.email}
          verified={loan.borrower?.isVerified}
        />
      </div>

      {loan.agreementId ? (
        <div className="border border-border rounded-md p-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-white/40 mb-1">Agreement</div>
          {agreementQ.data ? (
            <div className="space-y-0.5">
              <Field label="APR" value={`${agreementQ.data.apr.toFixed(2)}%`} compact />
              <Field
                label="Finance Charge"
                value={formatMoney(agreementQ.data.financeCharge)}
                compact
              />
              <Field
                label="Total of Payments"
                value={formatMoney(agreementQ.data.totalOfPayments)}
                compact
              />
              <Field
                label="Signatures"
                value={`Loaner ${agreementQ.data.loanerSignatureUrl ? '✓' : '—'} · Borrower ${agreementQ.data.borrowerSignatureUrl ? '✓' : '—'}`}
                compact
              />
            </div>
          ) : (
            <div className="text-white/40 text-xs">Loading agreement…</div>
          )}
        </div>
      ) : null}

      {adminNote ? (
        <div className="border border-secondary/30 bg-secondary/5 rounded-md p-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-secondary mb-1">
            Admin note
          </div>
          {adminNote}
        </div>
      ) : null}

      <div className="space-y-2 pt-2 border-t border-border">
        {showNote ? (
          <>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Internal admin note…"
              className="w-full bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary min-h-[60px]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowNote(false);
                  setNoteText('');
                }}
                className="flex-1 bg-bg-elevated border border-border rounded-md py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => noteMut.mutate(noteText)}
                disabled={!noteText.trim() || noteMut.isPending}
                className="flex-1 bg-secondary hover:bg-secondary-dark disabled:opacity-50 text-black font-semibold rounded-md py-2 text-sm"
              >
                {noteMut.isPending ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => statusMut.mutate('active')}
                disabled={loan.status === 'active' || statusMut.isPending}
                className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary-light font-semibold rounded-md py-2 text-xs disabled:opacity-40"
              >
                ✓ Mark Active
              </button>
              <button
                onClick={() => statusMut.mutate('completed')}
                disabled={loan.status === 'completed' || statusMut.isPending}
                className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary-light font-semibold rounded-md py-2 text-xs disabled:opacity-40"
              >
                ✓ Mark Completed
              </button>
              <button
                onClick={() => {
                  if (!confirm('Are you sure you want to mark this loan as overdue?')) return;
                  statusMut.mutate('overdue');
                }}
                disabled={loan.status === 'overdue' || statusMut.isPending}
                className="bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-semibold rounded-md py-2 text-xs disabled:opacity-40"
              >
                ⚠ Mark Overdue
              </button>
              <button
                onClick={() => {
                  if (!confirm('Are you sure you want to force cancel this loan? This action cannot be easily undone.')) return;
                  statusMut.mutate('cancelled');
                }}
                disabled={loan.status === 'cancelled' || statusMut.isPending}
                className="bg-bg-elevated hover:bg-bg-base border border-border text-white/80 font-semibold rounded-md py-2 text-xs disabled:opacity-40"
              >
                ✕ Force Cancel
              </button>
            </div>
            <button
              onClick={() => setShowNote(true)}
              className="w-full bg-bg-elevated hover:bg-bg-base border border-border rounded-md py-2 text-sm text-white/70"
            >
              + Add admin note
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        compact ? '' : 'border-b border-border py-1.5 last:border-b-0'
      }`}
    >
      <span className="text-white/50 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-white/90 text-right text-sm">{value}</span>
    </div>
  );
}

function Party({
  label,
  name,
  email,
  verified,
}: {
  label: string;
  name?: string | null;
  email?: string | null;
  verified?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
      <div className="w-9 h-9 rounded-full bg-bg-elevated border border-border flex items-center justify-center font-bold text-primary-light">
        {name?.[0] ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
        <div className="text-sm font-semibold truncate flex items-center gap-2">
          {name ?? '—'}
          {verified ? (
            <span className="text-[10px] bg-primary/15 text-primary-light px-1.5 py-0.5 rounded">
              ✓ Verified
            </span>
          ) : null}
        </div>
        <div className="text-xs text-white/40 truncate">{email ?? '—'}</div>
      </div>
    </div>
  );
}
