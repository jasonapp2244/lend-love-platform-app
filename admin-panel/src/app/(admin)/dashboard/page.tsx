'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboardStats } from '@/lib/admin-service';

function formatMoney(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

const KPI = [
  { key: 'totalUsers', label: 'Total Users', tint: 'bg-primary/10', text: 'text-primary-light' },
  {
    key: 'activeLoanCount',
    label: 'Active Loans',
    tint: 'bg-primary/10',
    text: 'text-primary-light',
  },
  {
    key: 'activeLoanValue',
    label: 'Loaned Out (USD)',
    tint: 'bg-secondary/10',
    text: 'text-secondary',
    money: true,
  },
  { key: 'overdueCount', label: 'Overdue', tint: 'bg-danger/10', text: 'text-danger' },
] as const;

export default function DashboardPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: fetchDashboardStats,
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-white/50">Platform overview</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs px-3 py-1.5 bg-bg-surface border border-border rounded-md hover:bg-bg-elevated disabled:opacity-50"
        >
          {isFetching ? 'Refreshing…' : '⟳ Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {KPI.map((card) => {
          const raw = data ? (data as Record<string, number>)[card.key] : 0;
          const value = isLoading ? '…' : 'money' in card && card.money ? formatMoney(raw) : raw;
          return (
            <div
              key={card.key}
              className={`${card.tint} border border-border rounded-xl p-5`}
            >
              <div className="text-xs uppercase tracking-wider text-white/50">{card.label}</div>
              <div className={`mt-2 text-2xl md:text-3xl font-bold ${card.text}`}>{value}</div>
            </div>
          );
        })}
      </div>

      {/* Additional metrics row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-white/50">Default Rate</div>
          <div className="mt-2 text-2xl font-bold text-danger">
            {data ? ((data.overdueCount / Math.max(data.activeLoanCount + data.completedCount, 1)) * 100).toFixed(1) : '0'}%
          </div>
          <div className="text-xs text-white/30 mt-1">Overdue / total loans</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-white/50">Avg Loan Size</div>
          <div className="mt-2 text-2xl font-bold text-primary-light">
            {data && data.activeLoanCount > 0 ? formatMoney(Math.round(data.activeLoanValue / data.activeLoanCount)) : '$0'}
          </div>
          <div className="text-xs text-white/30 mt-1">Active loan value / count</div>
        </div>
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-white/50">Verified Rate</div>
          <div className="mt-2 text-2xl font-bold text-primary-light">
            {data ? Math.round((data.verifiedUsers / Math.max(data.totalUsers, 1)) * 100) : 0}%
          </div>
          <div className="text-xs text-white/30 mt-1">KYC verified / total users</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg-surface border border-border rounded-xl p-6">
          <h2 className="text-sm uppercase tracking-wider text-white/50 mb-4">Loan Types</h2>
          <div className="space-y-2">
            <Row
              label="Money Loans"
              value={data?.moneyLoanCount ?? 0}
              color="bg-primary"
              total={(data?.moneyLoanCount ?? 0) + (data?.itemLoanCount ?? 0) || 1}
            />
            <Row
              label="Item Loans"
              value={data?.itemLoanCount ?? 0}
              color="bg-secondary"
              total={(data?.moneyLoanCount ?? 0) + (data?.itemLoanCount ?? 0) || 1}
            />
          </div>
        </div>

        <div className="bg-bg-surface border border-border rounded-xl p-6">
          <h2 className="text-sm uppercase tracking-wider text-white/50 mb-4">Marketplace</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-white/70">Open loan requests</span>
              <span className="font-bold">{data?.openRequestCount ?? 0}</span>
            </div>
            <div className="flex justify-between border-b border-border py-2">
              <span className="text-white/70">Completed loans</span>
              <span className="font-bold">{data?.completedCount ?? 0}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-white/70">Total platform loans</span>
              <span className="font-bold">
                {(data?.activeLoanCount ?? 0) +
                  (data?.completedCount ?? 0) +
                  (data?.overdueCount ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
  total,
}: {
  label: string;
  value: number;
  color: string;
  total: number;
}) {
  const pct = Math.round((value / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white/70">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div className={`${color} h-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
