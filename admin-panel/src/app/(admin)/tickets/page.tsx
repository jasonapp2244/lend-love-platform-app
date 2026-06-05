'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { audit } from '@/lib/audit';
import { formatDate } from '@/lib/format';
import type { SupportTicket } from '@lendlove/shared';

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-danger/20 text-danger',
  high: 'bg-secondary/20 text-secondary',
  normal: 'bg-primary/20 text-primary-light',
  low: 'bg-bg-elevated text-white/50',
};

export default function TicketsPage() {
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const qc = useQueryClient();

  const ticketsQ = useQuery({
    queryKey: ['admin', 'tickets'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db(), 'supportTickets'), orderBy('createdAt', 'desc'), limit(200)),
      );
      return snap.docs.map((d) => d.data() as SupportTicket);
    },
  });

  const tickets = ticketsQ.data ?? [];
  const filtered = useMemo(() => {
    let list = tickets;
    if (filter !== 'all') list = list.filter((t) => t.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.subject.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [tickets, filter, search]);

  const selected = selectedId ? tickets.find((t) => t.id === selectedId) : null;

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await updateDoc(doc(db(), 'supportTickets', id), { status, updatedAt: Date.now() });
      await audit(`ticket.${status}`, { collection: 'supportTickets', id }, { after: { status } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tickets'] }),
  });

  const replyMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const ticket = tickets.find((t) => t.id === id);
      const msgs = ticket?.messages ?? [];
      await updateDoc(doc(db(), 'supportTickets', id), {
        messages: [...msgs, { senderId: 'admin', senderRole: 'admin', text, sentAt: Date.now() }],
        status: 'in_progress',
        updatedAt: Date.now(),
      });
    },
    onSuccess: () => { setReply(''); qc.invalidateQueries({ queryKey: ['admin', 'tickets'] }); },
  });

  const stats = { total: tickets.length, open: tickets.filter((t) => t.status === 'open').length };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-sm text-white/50">{ticketsQ.isLoading ? 'Loading…' : `${stats.total} total · ${stats.open} open`}</p>
        </div>
        <button onClick={() => ticketsQ.refetch()} className="px-4 py-2 text-sm bg-bg-elevated rounded-md hover:bg-border transition">⟳ Refresh</button>
      </div>

      <div className="flex items-center gap-4">
        <input placeholder="Search by subject or description…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 bg-bg-elevated border border-border rounded-md text-white text-sm placeholder:text-white/30 outline-none focus:border-primary" />
        <div className="flex gap-1">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as StatusFilter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize transition ${filter === f ? 'bg-primary text-black font-semibold' : 'bg-bg-elevated text-white/70 hover:bg-border'}`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 overflow-auto">
          {ticketsQ.isLoading ? <div className="text-center py-12 text-white/30">Loading…</div> : filtered.length === 0 ? (
            <div className="text-center py-12 text-white/30">No tickets match the current filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-white/50 border-b border-border">
                <th className="pb-3 font-medium">Subject</th>
                <th className="pb-3 font-medium">Priority</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
              </tr></thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} onClick={() => setSelectedId(t.id)}
                    className={`border-b border-border/50 cursor-pointer transition ${selectedId === t.id ? 'bg-primary/10' : 'hover:bg-bg-elevated'}`}>
                    <td className="py-3">
                      <div className="text-white/80 font-medium">{t.subject}</div>
                      <div className="text-white/40 text-xs truncate max-w-[250px]">{t.description}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.normal}`}>{t.priority}</span>
                    </td>
                    <td className="py-3 capitalize text-white/70 text-xs">{t.status.replace('_', ' ')}</td>
                    <td className="py-3 text-white/50 text-xs">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="w-[380px] shrink-0 border border-border rounded-lg p-5">
          {!selected ? (
            <div className="text-center text-white/30 py-12">Select a ticket to view</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-white/90">{selected.subject}</h2>
                <button onClick={() => setSelectedId(null)} className="text-white/30 hover:text-white">✕</button>
              </div>
              <p className="text-sm text-white/60">{selected.description}</p>
              <div className="border-t border-border pt-3 space-y-2 max-h-[300px] overflow-auto">
                {(selected.messages ?? []).map((m, i) => (
                  <div key={i} className={`p-2 rounded text-xs ${m.senderRole === 'admin' ? 'bg-primary/10 text-primary-light' : 'bg-bg-elevated text-white/70'}`}>
                    <div className="font-semibold mb-1">{m.senderRole === 'admin' ? 'Admin' : 'User'}</div>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type a reply…"
                  className="flex-1 px-3 py-2 text-xs bg-bg-elevated border border-border rounded-md text-white placeholder:text-white/30 outline-none" />
                <button disabled={!reply.trim()} onClick={() => selected && replyMutation.mutate({ id: selected.id, text: reply })}
                  className="px-3 py-2 text-xs rounded-md bg-primary text-black font-semibold disabled:opacity-50">Send</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => statusMutation.mutate({ id: selected.id, status: 'resolved' })}
                  className="flex-1 px-3 py-1.5 text-xs rounded-md bg-primary/20 text-primary-light hover:bg-primary/30 transition">Resolve</button>
                <button onClick={() => statusMutation.mutate({ id: selected.id, status: 'closed' })}
                  className="flex-1 px-3 py-1.5 text-xs rounded-md bg-bg-elevated text-white/50 hover:bg-border transition">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
