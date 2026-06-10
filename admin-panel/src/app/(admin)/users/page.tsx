'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  fetchUsers,
  setUserVerification,
  setUserSuspended,
} from '@/lib/admin-service';
import { audit } from '@/lib/audit';
import { formatDate, formatMoney } from '@/lib/format';
import type { User, Loan, Transaction } from '@lendlove/shared';

type FilterKey = 'all' | 'verified' | 'unverified' | 'admin' | 'demo';
type DateFilter = 'all' | '7d' | '30d' | '90d';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  const usersQ = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => fetchUsers(),
  });

  const filtered = useMemo(() => {
    const data = usersQ.data ?? [];
    let list = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phone?.includes(q)
      );
    }
    if (filter === 'verified') list = list.filter((u) => u.isVerified);
    if (filter === 'unverified') list = list.filter((u) => !u.isVerified);
    if (filter === 'admin') list = list.filter((u) => u.role === 'admin');
    if (filter === 'demo') list = list.filter((u) => u.isDemo);

    // Date filter
    if (dateFilter !== 'all') {
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((u) => u.createdAt >= cutoff);
    }
    return list;
  }, [usersQ.data, search, filter, dateFilter]);

  const selected = useMemo(
    () => filtered.find((u) => u.uid === selectedUid) ?? null,
    [filtered, selectedUid]
  );

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-white/50">
            {usersQ.data?.length ?? 0} total users · {filtered.length} shown
          </p>
        </div>
        <button
          onClick={() => usersQ.refetch()}
          className="text-xs px-3 py-1.5 bg-bg-surface border border-border rounded-md hover:bg-bg-elevated"
        >
          ⟳ Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, phone…"
          className="flex-1 min-w-[240px] bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-1 text-xs bg-bg-surface border border-border rounded-md p-1">
          {(['all', 'verified', 'unverified', 'admin', 'demo'] as FilterKey[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded ${
                filter === f
                  ? 'bg-primary text-black font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1 text-xs bg-bg-surface border border-border rounded-md p-1">
          {([
            { key: 'all', label: 'All time' },
            { key: '7d', label: '7 days' },
            { key: '30d', label: '30 days' },
            { key: '90d', label: '90 days' },
          ] as { key: DateFilter; label: string }[]).map((d) => (
            <button
              key={d.key}
              onClick={() => setDateFilter(d.key)}
              className={`px-3 py-1 rounded ${
                dateFilter === d.key
                  ? 'bg-secondary text-black font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-4">
        <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-white/60 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Loans</th>
                <th className="text-right px-4 py-3">Rating</th>
                <th className="text-right px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-white/40">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-white/40">
                    No users match.
                  </td>
                </tr>
              ) : (
                filtered.map((u, idx) => (
                  <tr
                    key={`${u.uid}-${idx}`}
                    onClick={() => setSelectedUid(u.uid)}
                    className={`border-t border-border cursor-pointer transition ${
                      selectedUid === u.uid ? 'bg-primary/5' : 'hover:bg-bg-elevated'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{u.fullName || '—'}</div>
                      <div className="text-xs text-white/50">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'admin' ? (
                        <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded text-xs uppercase tracking-wider">
                          {u.adminTier ?? 'Admin'}
                        </span>
                      ) : (
                        <span className="text-white/60 text-xs">User</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.isVerified ? (
                          <Tag color="primary">✓ Verified</Tag>
                        ) : (
                          <Tag color="muted">Unverified</Tag>
                        )}
                        {u.isDemo && <Tag color="secondary">Demo</Tag>}
                        {u.suspended && <Tag color="danger">Suspended</Tag>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {u.completedLoans ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {u.rating?.toFixed(1) ?? '–'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-white/50">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <UserDetail user={selected} onClose={() => setSelectedUid(null)} />
      </div>
    </div>
  );
}

function UserDetail({ user, onClose }: { user: User | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [msgText, setMsgText] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'loans' | 'transactions'>('info');

  const verifyMut = useMutation({
    mutationFn: (next: boolean) => setUserVerification(user!.uid, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
  const suspendMut = useMutation({
    mutationFn: (next: boolean) => setUserSuspended(user!.uid, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  // Send admin message to user
  const sendMsgMut = useMutation({
    mutationFn: async () => {
      if (!msgText.trim() || !user) return;
      const { doc: docRef, setDoc, collection: coll } = await import('firebase/firestore');
      const _db = db();
      const nRef = docRef(coll(_db, 'notifications'));
      await setDoc(nRef, {
        id: nRef.id,
        userId: user.uid,
        type: 'admin-message',
        title: 'Message from Admin',
        body: msgText.trim(),
        read: false,
        createdAt: Date.now(),
      });
      await audit('user.send_message', { collection: 'users', id: user.uid }, {
        after: { message: msgText.trim() },
      });
    },
    onSuccess: () => setMsgText(''),
  });

  // Fetch linked loans
  const loansQ = useQuery({
    queryKey: ['admin', 'user-loans', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const _db = db();
      const [asLoaner, asBorrower] = await Promise.all([
        getDocs(query(collection(_db, 'loans'), where('loanerId', '==', user.uid), limit(50))),
        getDocs(query(collection(_db, 'loans'), where('borrowerId', '==', user.uid), limit(50))),
      ]);
      const loans = [
        ...asLoaner.docs.map((d) => ({ ...d.data() as Loan, role: 'loaner' as const })),
        ...asBorrower.docs.map((d) => ({ ...d.data() as Loan, role: 'borrower' as const })),
      ];
      return loans.sort((a, b) => b.createdAt - a.createdAt);
    },
    enabled: !!user && activeTab === 'loans',
  });

  // Fetch linked transactions
  const txQ = useQuery({
    queryKey: ['admin', 'user-transactions', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const snap = await getDocs(
        query(collection(db(), 'transactions'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(50))
      );
      return snap.docs.map((d) => d.data() as Transaction);
    },
    enabled: !!user && activeTab === 'transactions',
  });

  if (!user) {
    return (
      <div className="bg-bg-surface border border-border rounded-xl p-6 sticky top-6 h-fit">
        <div className="text-white/40 text-sm text-center py-8">
          Select a user to view details
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-6 sticky top-6 h-fit max-h-[85vh] overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-bg-elevated border border-primary flex items-center justify-center text-primary-light font-bold">
            {user.fullName?.[0] ?? '?'}
          </div>
          <div>
            <div className="font-bold">{user.fullName || '—'}</div>
            <div className="text-xs text-white/50">{user.email}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white text-lg">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 text-xs bg-bg-elevated rounded-md p-1 mb-4">
        {(['info', 'loans', 'transactions'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1.5 rounded capitalize ${
              activeTab === tab ? 'bg-primary text-black font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <>
          <div className="space-y-1 text-sm mb-5">
            <Field label="UID" value={user.uid.slice(0, 12) + '…'} />
            <Field label="Phone" value={user.phone || '—'} />
            <Field label="Address" value={user.address || '—'} />
            <Field label="Occupation" value={user.occupation || '—'} />
            <Field label="Birthday" value={user.birthday || '—'} />
            <Field label="KYC Status" value={user.kycStatus} />
            <Field label="Created" value={formatDate(user.createdAt)} />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-5">
            <Stat label="Completed" value={user.completedLoans ?? 0} color="text-primary-light" />
            <Stat label="Overdue" value={user.overdueLoans ?? 0} color="text-danger" />
            <Stat label="Rating" value={user.rating?.toFixed(1) ?? '–'} color="text-secondary" />
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <Stat label="Total Lent" value={formatMoney(user.totalLent ?? 0)} color="text-primary-light" />
            <Stat label="Total Borrowed" value={formatMoney(user.totalBorrowed ?? 0)} color="text-secondary" />
          </div>

          <div className="space-y-2 mb-4">
            <button
              onClick={() => {
                const action = user.isVerified ? 'revoke verification for' : 'verify';
                if (!confirm(`Are you sure you want to ${action} ${user.fullName || user.email}?`)) return;
                verifyMut.mutate(!user.isVerified);
              }}
              disabled={verifyMut.isPending}
              className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-black font-semibold rounded-md py-2 text-sm transition"
            >
              {user.isVerified ? '✕ Revoke Verification' : '✓ Verify User'}
            </button>
            <button
              onClick={() => {
                const action = user.suspended ? 'unsuspend' : 'suspend';
                if (!confirm(`Are you sure you want to ${action} ${user.fullName || user.email}?`)) return;
                suspendMut.mutate(!user.suspended);
              }}
              disabled={suspendMut.isPending}
              className="w-full bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-semibold rounded-md py-2 text-sm transition"
            >
              {user.suspended ? 'Unsuspend' : 'Suspend Account'}
            </button>
          </div>

              <button
              onClick={async () => {
                try {
                  const { getFunctions, httpsCallable } = await import('firebase/functions');
                  const functions = getFunctions(undefined, 'us-central1');
                  const resetPassword = httpsCallable(functions, 'resetPassword');
                  await resetPassword({ targetUid: user.uid });
                  await audit('user.reset_password', { collection: 'users', id: user.uid }, {
                    after: { email: user.email },
                  });
                  alert(`Password reset email sent to ${user.email}`);
                } catch (e: unknown) {
                  alert('Failed to send reset email: ' + (e instanceof Error ? e.message : 'Unknown error'));
                }
              }}
              className="w-full bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 text-secondary font-semibold rounded-md py-2 text-sm transition"
            >
              Send Password Reset
            </button>

          {/* Send message */}
          <div className="border-t border-border pt-4">
            <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-2">
              Send Message to User
            </label>
            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              placeholder="Type an admin message…"
              rows={2}
              className="w-full px-3 py-2 bg-bg-elevated border border-border rounded-md text-sm text-white placeholder:text-white/30 outline-none focus:border-primary resize-none mb-2"
            />
            <button
              onClick={() => sendMsgMut.mutate()}
              disabled={!msgText.trim() || sendMsgMut.isPending}
              className="w-full bg-secondary/20 hover:bg-secondary/30 border border-secondary/30 text-secondary font-semibold rounded-md py-2 text-xs transition disabled:opacity-50"
            >
              {sendMsgMut.isPending ? 'Sending…' : 'Send Notification'}
            </button>
            {sendMsgMut.isSuccess && (
              <div className="text-xs text-primary-light mt-1">Message sent.</div>
            )}
          </div>
        </>
      )}

      {activeTab === 'loans' && (
        <div className="space-y-2">
          {loansQ.isLoading ? (
            <div className="text-white/40 text-sm text-center py-6">Loading loans…</div>
          ) : (loansQ.data ?? []).length === 0 ? (
            <div className="text-white/40 text-sm text-center py-6">No linked loans</div>
          ) : (
            (loansQ.data ?? []).map((loan) => (
              <div key={loan.id} className="bg-bg-elevated border border-border rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${
                      loan.role === 'loaner' ? 'bg-primary/20 text-primary-light' : 'bg-secondary/20 text-secondary'
                    }`}>
                      {loan.role}
                    </span>
                    <span className="text-xs text-white/40 ml-2">#{loan.id.slice(0, 8)}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${
                    loan.status === 'active' ? 'bg-primary/20 text-primary-light' :
                    loan.status === 'overdue' ? 'bg-danger/20 text-danger' :
                    loan.status === 'completed' ? 'bg-primary/20 text-primary' :
                    'bg-bg-elevated text-white/50'
                  }`}>
                    {loan.status}
                  </span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>{loan.type === 'money' ? formatMoney(loan.amount) : loan.itemTitle}</span>
                  <span className="text-xs text-white/40">{formatDate(loan.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-2">
          {txQ.isLoading ? (
            <div className="text-white/40 text-sm text-center py-6">Loading transactions…</div>
          ) : (txQ.data ?? []).length === 0 ? (
            <div className="text-white/40 text-sm text-center py-6">No transactions</div>
          ) : (
            (txQ.data ?? []).map((tx) => (
              <div key={tx.id} className="bg-bg-elevated border border-border rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="capitalize text-white/80">{tx.type}</span>
                    <span className="text-xs text-white/40 ml-2">{tx.description}</span>
                  </div>
                  <span className={tx.direction === 'credit' ? 'text-primary font-semibold' : 'text-danger font-semibold'}>
                    {tx.direction === 'credit' ? '+' : '−'}{formatMoney(tx.amount)}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${
                    tx.status === 'completed' ? 'bg-primary/20 text-primary-light' :
                    tx.status === 'failed' ? 'bg-danger/20 text-danger' :
                    'bg-secondary/20 text-secondary'
                  }`}>{tx.status}</span>
                  <span className="text-xs text-white/40">{formatDate(tx.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-1.5 last:border-b-0">
      <span className="text-white/50 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-white/90 text-right">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3 text-center">
      <div className={`${color} font-bold text-lg tabular-nums`}>{value}</div>
      <div className="text-[10px] text-white/50 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: 'primary' | 'secondary' | 'danger' | 'muted';
}) {
  const map: Record<typeof color, string> = {
    primary: 'bg-primary/15 text-primary-light',
    secondary: 'bg-secondary/15 text-secondary',
    danger: 'bg-danger/15 text-danger',
    muted: 'bg-bg-elevated text-white/50',
  };
  return (
    <span className={`${map[color]} px-2 py-0.5 rounded text-xs`}>{children}</span>
  );
}
