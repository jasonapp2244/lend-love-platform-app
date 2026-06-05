'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { collection as coll, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  fetchReportsOverview,
  exportUsersCsv,
  exportLoansCsv,
  exportAgreementsCsv,
  exportTransactionsCsv,
  exportKycCsv,
  type DateRange,
} from '@/lib/reports-service';
import { formatMoney } from '@/lib/format';
import type { User } from '@lendlove/shared';

const RANGES: Array<{ key: DateRange; label: string }> = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];

export default function ReportsPage() {
  const [range, setRange] = useState<DateRange>('30d');

  const overviewQ = useQuery({
    queryKey: ['admin', 'reports', range],
    queryFn: () => fetchReportsOverview(range),
  });

  const stats = overviewQ.data;

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-white/50">
            Aggregated insights + CSV exports for compliance and operations
          </p>
        </div>
      </div>

      <div className="flex gap-1 text-xs bg-bg-surface border border-border rounded-md p-1 mb-6 w-fit">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 rounded whitespace-nowrap ${
              range === r.key
                ? 'bg-primary text-black font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          tint="bg-primary/10"
          text="text-primary-light"
          label="New Users"
          value={stats?.users.total}
          sub={stats ? `${stats.users.verified} verified · ${stats.users.admins} admins` : ''}
          loading={overviewQ.isLoading}
        />
        <KpiCard
          tint="bg-primary/10"
          text="text-primary-light"
          label="Loans Originated"
          value={stats?.loans.total}
          sub={stats ? `${stats.loans.active} active · ${stats.loans.completed} done` : ''}
          loading={overviewQ.isLoading}
        />
        <KpiCard
          tint="bg-secondary/10"
          text="text-secondary"
          label="Loaned (USD)"
          value={stats ? formatMoney(stats.loans.moneyValue) : undefined}
          sub={stats ? `${formatMoney(stats.loans.itemValue)} in item value` : ''}
          loading={overviewQ.isLoading}
        />
        <KpiCard
          tint="bg-secondary/10"
          text="text-secondary"
          label={`Platform Revenue (${stats ? stats.revenue.feeRate : '–'}% fee)`}
          value={stats ? formatMoney(stats.revenue.gross) : undefined}
          sub={`Projected on disbursed loans`}
          loading={overviewQ.isLoading}
        />
      </div>

      {/* KYC funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Panel title="KYC Funnel">
          {!stats ? (
            <div className="text-white/40 text-sm">Loading…</div>
          ) : (
            <div className="space-y-2">
              <FunnelRow label="Submitted" value={stats.kyc.all} total={stats.kyc.all || 1} color="bg-primary-light" />
              <FunnelRow
                label="Pending"
                value={stats.kyc.pending}
                total={stats.kyc.all || 1}
                color="bg-secondary"
              />
              <FunnelRow
                label="Manual Review"
                value={stats.kyc.manual_review}
                total={stats.kyc.all || 1}
                color="bg-danger-light"
              />
              <FunnelRow
                label="Approved"
                value={stats.kyc.approved}
                total={stats.kyc.all || 1}
                color="bg-primary"
              />
              <FunnelRow
                label="Rejected"
                value={stats.kyc.rejected}
                total={stats.kyc.all || 1}
                color="bg-danger"
              />
            </div>
          )}
        </Panel>

        <Panel title="Transactions Summary">
          {!stats ? (
            <div className="text-white/40 text-sm">Loading…</div>
          ) : (
            <div className="space-y-2 text-sm">
              <StatRow label="Total transactions" value={stats.transactions.total} />
              <StatRow label="Completed volume" value={formatMoney(stats.transactions.volume)} />
              <StatRow label="Signed agreements" value={stats.agreements.signed} />
              <StatRow
                label="Pending signature"
                value={stats.agreements.total - stats.agreements.signed}
              />
              <StatRow label="Overdue loans" value={stats.loans.overdue} highlight={stats.loans.overdue > 0 ? 'text-danger' : undefined} />
            </div>
          )}
        </Panel>
      </div>

      {/* CSV exports */}
      <div className="bg-bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold">CSV Exports</h2>
            <p className="text-xs text-white/50">
              Download data for the selected range. Use for compliance audits, accounting, and
              regulatory reporting.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <ExportCard
            title="Users"
            description="All users with KYC status, ratings, loan stats"
            exporter={() => exportUsersCsv(range)}
          />
          <ExportCard
            title="Loans"
            description="All loans (money + item) with parties and status"
            exporter={() => exportLoansCsv(range)}
          />
          <ExportCard
            title="Agreements"
            description="TILA-compliant agreement records: APR, finance charge, total"
            exporter={() => exportAgreementsCsv(range)}
          />
          <ExportCard
            title="Transactions"
            description="Disbursements, repayments, fees, refunds"
            exporter={() => exportTransactionsCsv(range)}
          />
          <ExportCard
            title="KYC Submissions"
            description="Submission status, confidence scores, AML flags"
            exporter={() => exportKycCsv(range)}
          />
        </div>
      </div>

      {/* Top Loaners & Borrowers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Top Loaners (by total lent)">
          {!overviewQ.data ? <div className="text-white/30">Loading…</div> : (
            <TopUsersList collection="users" sortField="totalLent" labelField="totalLent" />
          )}
        </Panel>
        <Panel title="Top Borrowers (by total borrowed)">
          {!overviewQ.data ? <div className="text-white/30">Loading…</div> : (
            <TopUsersList collection="users" sortField="totalBorrowed" labelField="totalBorrowed" />
          )}
        </Panel>
      </div>
    </div>
  );
}

function TopUsersList({ collection: _col, sortField, labelField }: { collection: string; sortField: string; labelField: string }) {
  const topQ = useQuery({
    queryKey: ['admin', 'top', sortField],
    queryFn: async () => {
      const snap = await getDocs(query(coll(db(), _col), orderBy(sortField, 'desc'), limit(5)));
      return snap.docs.map((d) => d.data() as User);
    },
  });
  const users = topQ.data ?? [];
  if (users.length === 0) return <div className="text-white/30 text-sm">No data yet</div>;
  return (
    <div className="space-y-2 text-sm">
      {users.map((u, i) => (
        <div key={u.uid ?? i} className="flex justify-between border-b border-border/50 pb-2">
          <div>
            <span className="text-white/80 font-medium">{u.fullName || 'Anonymous'}</span>
            <span className="text-white/30 text-xs ml-2">{u.email}</span>
          </div>
          <span className="font-bold text-primary tabular-nums">${((u as any)[labelField] ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({
  tint,
  text,
  label,
  value,
  sub,
  loading,
}: {
  tint: string;
  text: string;
  label: string;
  value?: number | string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className={`${tint} border border-border rounded-xl p-5`}>
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className={`mt-2 text-2xl md:text-3xl font-bold ${text}`}>
        {loading ? '…' : value ?? '—'}
      </div>
      {sub ? <div className="text-[11px] text-white/40 mt-1">{sub}</div> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-6">
      <h2 className="text-sm uppercase tracking-wider text-white/50 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function FunnelRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white/70">{label}</span>
        <span className="font-semibold tabular-nums">
          {value}{' '}
          <span className="text-white/40 text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div className={`${color} h-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: string;
}) {
  return (
    <div className="flex justify-between border-b border-border py-2 last:border-b-0">
      <span className="text-white/60">{label}</span>
      <span className={`font-semibold tabular-nums ${highlight ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

function ExportCard({
  title,
  description,
  exporter,
}: {
  title: string;
  description: string;
  exporter: () => Promise<number>;
}) {
  const mut = useMutation({
    mutationFn: exporter,
  });

  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-4 flex flex-col gap-2">
      <div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-white/50 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending}
        className="mt-1 bg-primary hover:bg-primary-light disabled:opacity-50 text-black font-semibold rounded-md py-2 text-sm transition"
      >
        {mut.isPending ? 'Generating…' : '⬇ Export CSV'}
      </button>
      {mut.isSuccess ? (
        <div className="text-[11px] text-primary-light">
          ✓ Exported {mut.data} row{mut.data === 1 ? '' : 's'}
        </div>
      ) : null}
      {mut.isError ? (
        <div className="text-[11px] text-danger">Export failed — try again.</div>
      ) : null}
    </div>
  );
}
