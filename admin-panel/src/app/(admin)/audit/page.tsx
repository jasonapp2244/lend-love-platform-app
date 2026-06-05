'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAuditLog, type AuditRow } from '@/lib/audit-service';
import { formatDateTime } from '@/lib/format';

type Category = 'all' | 'user' | 'kyc' | 'loan';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  user: 'Users',
  kyc: 'KYC',
  loan: 'Loans',
};

const ACTION_STYLE: Record<
  string,
  { label: string; cls: string; icon: string }
> = {
  'user.verify': { label: 'Verified user', cls: 'text-primary-light', icon: '✓' },
  'user.revoke_verification': {
    label: 'Revoked verification',
    cls: 'text-danger',
    icon: '✕',
  },
  'user.suspend': { label: 'Suspended user', cls: 'text-danger', icon: '⚠' },
  'user.unsuspend': { label: 'Unsuspended user', cls: 'text-primary-light', icon: '✓' },
  'kyc.approve': { label: 'Approved KYC', cls: 'text-primary-light', icon: '✓' },
  'kyc.reject': { label: 'Rejected KYC', cls: 'text-danger', icon: '✕' },
  'kyc.flag_manual': {
    label: 'Flagged for manual review',
    cls: 'text-secondary',
    icon: '⚑',
  },
  'loan.active': { label: 'Loan marked active', cls: 'text-primary-light', icon: '●' },
  'loan.completed': { label: 'Loan completed', cls: 'text-primary-light', icon: '✓' },
  'loan.overdue': { label: 'Loan marked overdue', cls: 'text-danger', icon: '⚠' },
  'loan.cancelled': { label: 'Loan cancelled', cls: 'text-white/60', icon: '✕' },
  'loan.defaulted': { label: 'Loan defaulted', cls: 'text-danger', icon: '✕' },
  'loan.note': { label: 'Added admin note', cls: 'text-secondary', icon: '✎' },
};

function categoryOf(action: string): Category {
  if (action.startsWith('user.')) return 'user';
  if (action.startsWith('kyc.')) return 'kyc';
  if (action.startsWith('loan.')) return 'loan';
  return 'all';
}

export default function AuditLogPage() {
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const auditQ = useQuery({
    queryKey: ['admin', 'audit'],
    queryFn: fetchAuditLog,
  });

  const filtered = useMemo(() => {
    let rows = auditQ.data ?? [];
    if (category !== 'all') rows = rows.filter((r) => categoryOf(r.action) === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.action.toLowerCase().includes(q) ||
          r.admin?.fullName?.toLowerCase().includes(q) ||
          r.admin?.email?.toLowerCase().includes(q) ||
          r.targetId.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [auditQ.data, category, search]);

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-white/50">
            Immutable record of every admin action · {auditQ.data?.length ?? 0} entries
          </p>
        </div>
        <button
          onClick={() => auditQ.refetch()}
          className="text-xs px-3 py-1.5 bg-bg-surface border border-border rounded-md hover:bg-bg-elevated"
        >
          ⟳ Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by action, admin, target ID…"
          className="flex-1 min-w-[240px] bg-bg-elevated border border-border rounded-md px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex gap-1 text-xs bg-bg-surface border border-border rounded-md p-1">
          {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded ${
                category === c
                  ? 'bg-primary text-black font-semibold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-bg-surface border border-border rounded-xl overflow-hidden">
        {auditQ.isLoading ? (
          <div className="text-center py-10 text-white/40">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-white/40">
            No audit entries match the current filter.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((row) => (
              <AuditEntry
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AuditEntry({
  row,
  expanded,
  onToggle,
}: {
  row: AuditRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const style = ACTION_STYLE[row.action] ?? {
    label: row.action,
    cls: 'text-white/70',
    icon: '•',
  };
  return (
    <li>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 hover:bg-bg-elevated transition flex gap-3 items-start"
      >
        <div className={`text-base mt-0.5 w-5 text-center ${style.cls}`}>{style.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm font-semibold truncate">
              <span className={style.cls}>{style.label}</span>
            </div>
            <div className="text-xs text-white/40 whitespace-nowrap">
              {formatDateTime(row.timestamp)}
            </div>
          </div>
          <div className="text-xs text-white/50 mt-0.5 flex flex-wrap gap-x-3">
            <span>
              by{' '}
              <span className="text-white/80">
                {row.admin?.fullName ?? row.adminId.slice(0, 8)}
              </span>
            </span>
            <span>
              target:{' '}
              <code className="text-white/70 font-mono">
                {row.targetCollection}/{row.targetId.slice(0, 10)}
              </code>
            </span>
            <span className="text-white/30">{expanded ? '▾ Hide details' : '▸ Show details'}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="bg-bg-base px-4 py-3 border-t border-border space-y-3 text-xs">
          <div>
            <div className="text-white/40 uppercase tracking-wider mb-1">Action ID</div>
            <code className="font-mono text-white/70">{row.id}</code>
          </div>
          <div>
            <div className="text-white/40 uppercase tracking-wider mb-1">Admin</div>
            <div className="text-white/80">
              {row.admin?.fullName ?? '—'}{' '}
              <span className="text-white/40">({row.admin?.email ?? row.adminId})</span>
            </div>
          </div>
          {row.before ? (
            <div>
              <div className="text-white/40 uppercase tracking-wider mb-1">Before</div>
              <pre className="bg-bg-elevated border border-border rounded-md p-2 overflow-x-auto text-white/70 font-mono">
                {JSON.stringify(row.before, null, 2)}
              </pre>
            </div>
          ) : null}
          {row.after ? (
            <div>
              <div className="text-white/40 uppercase tracking-wider mb-1">After</div>
              <pre className="bg-bg-elevated border border-border rounded-md p-2 overflow-x-auto text-primary-light font-mono">
                {JSON.stringify(row.after, null, 2)}
              </pre>
            </div>
          ) : null}
          {row.ip ? (
            <div>
              <div className="text-white/40 uppercase tracking-wider mb-1">IP Address</div>
              <code className="font-mono text-white/70">{row.ip}</code>
            </div>
          ) : null}
          {row.userAgent ? (
            <div>
              <div className="text-white/40 uppercase tracking-wider mb-1">User Agent</div>
              <div className="text-white/50 font-mono break-all">{row.userAgent}</div>
            </div>
          ) : null}
        </div>
      )}
    </li>
  );
}
