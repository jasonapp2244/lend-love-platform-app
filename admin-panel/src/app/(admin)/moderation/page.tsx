'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { audit } from '@/lib/audit';
import { formatDate } from '@/lib/format';
import type { ContentReport } from '@lendlove/shared';

type Filter = 'all' | 'open' | 'reviewed' | 'actioned' | 'dismissed';

export default function ModerationPage() {
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const reportsQ = useQuery({
    queryKey: ['admin', 'moderation'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db(), 'reports'), orderBy('createdAt', 'desc'), limit(200)),
      );
      return snap.docs.map((d) => d.data() as ContentReport);
    },
  });

  const reports = reportsQ.data ?? [];
  const filtered = useMemo(() => {
    let list = reports;
    if (filter !== 'all') list = list.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.reason.includes(q) || r.contentType.includes(q) || r.description?.toLowerCase().includes(q));
    }
    return list;
  }, [reports, filter, search]);

  const selected = selectedId ? reports.find((r) => r.id === selectedId) : null;

  const actionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await updateDoc(doc(db(), 'reports', id), { status, reviewedAt: Date.now() });
      await audit(`report.${status}`, { collection: 'reports', id }, { after: { status } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'moderation'] }); setSelectedId(null); },
  });

  const stats = { total: reports.length, open: reports.filter((r) => r.status === 'open').length };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Moderation</h1>
          <p className="text-sm text-white/50">
            {reportsQ.isLoading ? 'Loading…' : `${stats.total} reports · ${stats.open} open`}
          </p>
        </div>
        <button onClick={() => reportsQ.refetch()} className="px-4 py-2 text-sm bg-bg-elevated rounded-md hover:bg-border transition">⟳ Refresh</button>
      </div>

      <div className="flex items-center gap-4">
        <input placeholder="Search by reason, type, description…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-bg-elevated border border-border rounded-md text-white text-sm placeholder:text-white/30 outline-none focus:border-primary" />
        <div className="flex gap-1">
          {(['all', 'open', 'reviewed', 'actioned', 'dismissed'] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize transition ${filter === f ? 'bg-primary text-black font-semibold' : 'bg-bg-elevated text-white/70 hover:bg-border'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 overflow-auto">
          {reportsQ.isLoading ? (
            <div className="text-center py-12 text-white/30">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/30">No reports match the current filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-white/50 border-b border-border">
                <th className="pb-3 font-medium">Content</th>
                <th className="pb-3 font-medium">Reason</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} onClick={() => setSelectedId(r.id)}
                    className={`border-b border-border/50 cursor-pointer transition ${selectedId === r.id ? 'bg-primary/10' : 'hover:bg-bg-elevated'}`}>
                    <td className="py-3">
                      <div className="text-white/80 capitalize">{r.contentType}</div>
                      <div className="text-white/40 text-xs">ID: {r.contentId.slice(0, 12)}</div>
                    </td>
                    <td className="py-3 capitalize text-secondary">{r.reason}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        r.status === 'open' ? 'bg-danger/20 text-danger' : r.status === 'actioned' ? 'bg-primary/20 text-primary-light' : 'bg-bg-elevated text-white/50'
                      }`}>{r.status}</span>
                    </td>
                    <td className="py-3 text-white/50 text-xs">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="w-[350px] shrink-0 border border-border rounded-lg p-5">
          {!selected ? (
            <div className="text-center text-white/30 py-12">Select a report to review</div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold capitalize">{selected.contentType} Report</h2>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-white/50">Reason</span><span className="capitalize text-secondary">{selected.reason}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Content ID</span><span className="text-white/80 text-xs">{selected.contentId}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Reporter</span><span className="text-white/80 text-xs">{selected.reporterId.slice(0, 12)}</span></div>
                {selected.reportedUserId && <div className="flex justify-between"><span className="text-white/50">Reported User</span><span className="text-white/80 text-xs">{selected.reportedUserId.slice(0, 12)}</span></div>}
                {selected.description && <div><span className="text-white/50 block mb-1">Description</span><p className="text-white/70 text-xs">{selected.description}</p></div>}
                <div className="flex justify-between"><span className="text-white/50">Reported</span><span className="text-white/80">{formatDate(selected.createdAt)}</span></div>
              </div>
              {selected.status === 'open' && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => actionMutation.mutate({ id: selected.id, status: 'actioned' })}
                    className="flex-1 px-3 py-2 text-xs rounded-md bg-danger text-white font-semibold hover:bg-danger-light transition">
                    Take Action
                  </button>
                  <button onClick={() => actionMutation.mutate({ id: selected.id, status: 'dismissed' })}
                    className="flex-1 px-3 py-2 text-xs rounded-md bg-bg-elevated text-white/70 hover:bg-border transition">
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
