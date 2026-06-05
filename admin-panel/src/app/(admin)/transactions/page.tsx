'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatMoney, formatDate } from '@/lib/format';
import type { Transaction } from '@lendlove/shared';

type StatusFilter = 'all' | 'pending' | 'completed' | 'failed' | 'reversed';

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-primary/20 text-primary-light',
  pending: 'bg-secondary/20 text-secondary',
  failed: 'bg-danger/20 text-danger',
  reversed: 'bg-bg-elevated text-white/50',
};

export default function TransactionsPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');

  const txQ = useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db(), 'transactions'), orderBy('createdAt', 'desc'), limit(500)),
      );
      return snap.docs.map((d) => d.data() as Transaction);
    },
  });

  const transactions = txQ.data ?? [];
  const filtered = useMemo(() => {
    let list = transactions;
    if (filter !== 'all') list = list.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.loanId?.includes(q) || t.userId?.includes(q) || t.description?.toLowerCase().includes(q));
    }
    return list;
  }, [transactions, filter, search]);

  const stats = {
    total: transactions.length,
    volume: transactions.filter((t) => t.status === 'completed').reduce((s, t) => s + t.amount, 0),
    pending: transactions.filter((t) => t.status === 'pending').length,
    failed: transactions.filter((t) => t.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transaction Management</h1>
          <p className="text-sm text-white/50">
            {txQ.isLoading ? 'Loading…' : `${stats.total} total · ${formatMoney(stats.volume)} volume · ${stats.pending} pending · ${stats.failed} failed`}
          </p>
        </div>
        <button onClick={() => txQ.refetch()} className="px-4 py-2 text-sm bg-bg-elevated rounded-md hover:bg-border transition">⟳ Refresh</button>
      </div>

      <div className="flex items-center gap-4">
        <input placeholder="Search by loan ID, user, description…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-bg-elevated border border-border rounded-md text-white text-sm placeholder:text-white/30 outline-none focus:border-primary" />
        <div className="flex gap-1">
          {(['all', 'pending', 'completed', 'failed', 'reversed'] as StatusFilter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize transition ${filter === f ? 'bg-primary text-black font-semibold' : 'bg-bg-elevated text-white/70 hover:bg-border'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto">
        {txQ.isLoading ? (
          <div className="text-center py-12 text-white/30">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-white/30">No transactions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/50 border-b border-border">
                <th className="pb-3 font-medium">Transaction</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Amount</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-bg-elevated transition">
                  <td className="py-3">
                    <div className="text-white/80 text-xs">Loan #{t.loanId?.slice(0, 8)}</div>
                    <div className="text-white/40 text-xs">{t.description ?? '—'}</div>
                  </td>
                  <td className="py-3 capitalize text-white/70">{t.type}</td>
                  <td className="py-3">
                    <span className={t.direction === 'credit' ? 'text-primary' : 'text-danger'}>
                      {t.direction === 'credit' ? '+' : '−'}{formatMoney(t.amount, t.currency)}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${STATUS_COLORS[t.status] ?? STATUS_COLORS.pending}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 text-white/50 text-xs">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
