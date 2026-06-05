'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatMoney, formatDate } from '@/lib/format';
import type { Agreement } from '@lendlove/shared';

type Filter = 'all' | 'signed' | 'pending';

export default function AgreementsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const agreementsQ = useQuery({
    queryKey: ['admin', 'agreements'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db(), 'agreements'), orderBy('createdAt', 'desc'), limit(500)),
      );
      return snap.docs.map((d) => d.data() as Agreement);
    },
  });

  const agreements = agreementsQ.data ?? [];

  const filtered = useMemo(() => {
    let list = agreements;
    if (filter === 'signed') list = list.filter((a) => !!a.signedAt);
    if (filter === 'pending') list = list.filter((a) => !a.signedAt);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.loanerName?.toLowerCase().includes(q) ||
          a.borrowerName?.toLowerCase().includes(q) ||
          a.loanId?.toLowerCase().includes(q) ||
          a.loanAmount?.toString().includes(q),
      );
    }
    return list;
  }, [agreements, filter, search]);

  const selected = selectedId ? agreements.find((a) => a.id === selectedId) : null;

  const stats = {
    total: agreements.length,
    signed: agreements.filter((a) => !!a.signedAt).length,
    pending: agreements.filter((a) => !a.signedAt).length,
    totalValue: agreements.reduce((s, a) => s + (a.loanAmount ?? 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agreements</h1>
          <p className="text-sm text-white/50">
            {agreementsQ.isLoading
              ? 'Loading…'
              : `${stats.total} total · ${stats.signed} signed · ${stats.pending} pending · ${formatMoney(stats.totalValue)} value`}
          </p>
        </div>
        <button
          onClick={() => agreementsQ.refetch()}
          className="px-4 py-2 text-sm bg-bg-elevated rounded-md hover:bg-border transition"
        >
          ⟳ Refresh
        </button>
      </div>

      <div className="flex items-center gap-4">
        <input
          placeholder="Search by name, loan ID, amount…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-bg-elevated border border-border rounded-md text-white text-sm placeholder:text-white/30 outline-none focus:border-primary"
        />
        <div className="flex gap-1">
          {(['all', 'signed', 'pending'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize transition ${
                filter === f
                  ? 'bg-primary text-black font-semibold'
                  : 'bg-bg-elevated text-white/70 hover:bg-border'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className="flex-1 overflow-auto">
          {agreementsQ.isLoading ? (
            <div className="text-center py-12 text-white/30">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/30">No agreements match the current filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/50 border-b border-border">
                  <th className="pb-3 font-medium">Agreement</th>
                  <th className="pb-3 font-medium">Parties</th>
                  <th className="pb-3 font-medium">TILA</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`border-b border-border/50 cursor-pointer transition ${
                      selectedId === a.id ? 'bg-primary/10' : 'hover:bg-bg-elevated'
                    }`}
                  >
                    <td className="py-3">
                      <div className="text-primary font-semibold">
                        {formatMoney(a.loanAmount, a.currency)}
                      </div>
                      <div className="text-white/40 text-xs">Loan #{a.loanId?.slice(0, 8)}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-white/80">L: {a.loanerName || '—'}</div>
                      <div className="text-white/50">B: {a.borrowerName || '—'}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-white/80">{a.apr}% APR</div>
                      <div className="text-white/40 text-xs">
                        FC: {formatMoney(a.financeCharge)} · Total: {formatMoney(a.totalOfPayments)}
                      </div>
                    </td>
                    <td className="py-3">
                      {a.signedAt ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-primary/20 text-primary-light">
                          SIGNED
                        </span>
                      ) : a.loanerSignatureUrl || a.borrowerSignatureUrl ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-secondary/20 text-secondary">
                          PARTIAL
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-bg-elevated text-white/50">
                          PENDING
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-white/50 text-xs">{formatDate(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        <div className="w-[380px] shrink-0 border border-border rounded-lg p-5">
          {!selected ? (
            <div className="text-center text-white/30 py-12">Select an agreement to view details</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-bold text-primary">
                    {formatMoney(selected.loanAmount, selected.currency)}
                  </h2>
                  <p className="text-xs text-white/40">Agreement #{selected.id.slice(0, 12)}</p>
                </div>
                <button onClick={() => setSelectedId(null)} className="text-white/30 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <h3 className="text-xs text-white/50 font-semibold uppercase tracking-wider">
                  TILA Disclosures
                </h3>
                <Row label="APR" value={`${selected.apr}%`} />
                <Row label="Finance Charge" value={formatMoney(selected.financeCharge)} />
                <Row label="Total of Payments" value={formatMoney(selected.totalOfPayments)} />
                <Row label="Late Fee/Day" value={formatMoney(selected.lateFeePerDay)} />
                <Row label="Interest Rate" value={`${selected.interestRate}%`} />
                <Row label="Due Date" value={formatDate(selected.dueDate)} />
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <h3 className="text-xs text-white/50 font-semibold uppercase tracking-wider">
                  Parties
                </h3>
                <Row label="Loaner" value={selected.loanerName || selected.loanerId} />
                <Row label="Borrower" value={selected.borrowerName || selected.borrowerId} />
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <h3 className="text-xs text-white/50 font-semibold uppercase tracking-wider">
                  Signatures
                </h3>
                <Row
                  label="Loaner Signed"
                  value={selected.loanerSignatureUrl ? '✓ Yes' : '✗ No'}
                  highlight={!!selected.loanerSignatureUrl}
                />
                <Row
                  label="Borrower Signed"
                  value={selected.borrowerSignatureUrl ? '✓ Yes' : '✗ No'}
                  highlight={!!selected.borrowerSignatureUrl}
                />
                {selected.signedAt && (
                  <Row label="Signed At" value={formatDate(selected.signedAt)} />
                )}
              </div>

              {selected.terms && (
                <div className="border-t border-border pt-3 text-sm">
                  <h3 className="text-xs text-white/50 font-semibold uppercase tracking-wider mb-2">
                    Terms
                  </h3>
                  <p className="text-white/70 text-xs leading-relaxed">{selected.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}</span>
      <span className={highlight ? 'text-primary font-semibold' : 'text-white/80'}>{value}</span>
    </div>
  );
}
