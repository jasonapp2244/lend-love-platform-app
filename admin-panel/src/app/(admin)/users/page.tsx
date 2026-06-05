'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUsers,
  setUserVerification,
  setUserSuspended,
} from '@/lib/admin-service';
import type { User } from '@lendlove/shared';

type FilterKey = 'all' | 'verified' | 'unverified' | 'admin' | 'demo';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
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
    return list;
  }, [usersQ.data, search, filter]);

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
            {usersQ.data?.length ?? 0} total users
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-4">
        <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-elevated text-white/60 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Loans</th>
                <th className="text-right px-4 py-3">Rating</th>
              </tr>
            </thead>
            <tbody>
              {usersQ.isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-white/40">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-white/40">
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
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {u.completedLoans ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {u.rating?.toFixed(1) ?? '–'}
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

  const verifyMut = useMutation({
    mutationFn: (next: boolean) => setUserVerification(user!.uid, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
  const suspendMut = useMutation({
    mutationFn: (next: boolean) => setUserSuspended(user!.uid, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
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
    <div className="bg-bg-surface border border-border rounded-xl p-6 sticky top-6 h-fit">
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

      <div className="space-y-1 text-sm mb-5">
        <Field label="UID" value={user.uid.slice(0, 12) + '…'} />
        <Field label="Phone" value={user.phone || '—'} />
        <Field label="Address" value={user.address || '—'} />
        <Field label="Occupation" value={user.occupation || '—'} />
        <Field label="Birthday" value={user.birthday || '—'} />
        <Field label="KYC Status" value={user.kycStatus} />
        <Field
          label="Created"
          value={new Date(user.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
          })}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <Stat label="Completed" value={user.completedLoans ?? 0} color="text-primary-light" />
        <Stat label="Overdue" value={user.overdueLoans ?? 0} color="text-danger" />
        <Stat label="Rating" value={user.rating?.toFixed(1) ?? '–'} color="text-secondary" />
      </div>

      <div className="space-y-2">
        <button
          onClick={() => verifyMut.mutate(!user.isVerified)}
          disabled={verifyMut.isPending}
          className="w-full bg-primary hover:bg-primary-light disabled:opacity-50 text-black font-semibold rounded-md py-2 text-sm transition"
        >
          {user.isVerified ? '✕ Revoke Verification' : '✓ Verify User'}
        </button>
        <button
          onClick={() => suspendMut.mutate(!(user as User & { suspended?: boolean }).suspended)}
          disabled={suspendMut.isPending}
          className="w-full bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-semibold rounded-md py-2 text-sm transition"
        >
          {(user as User & { suspended?: boolean }).suspended
            ? 'Unsuspend'
            : 'Suspend Account'}
        </button>
      </div>
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
