'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDate } from '@/lib/format';
import type { User, KycSubmission } from '@lendlove/shared';

export default function CompliancePage() {
  const [tab, setTab] = useState<'aml' | 'gdpr' | 'suspicious'>('aml');

  // AML flagged KYC submissions
  const amlQ = useQuery({
    queryKey: ['admin', 'compliance', 'aml'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db(), 'kycSubmissions'), orderBy('createdAt', 'desc'), limit(200)),
      );
      return snap.docs.map((d) => d.data() as KycSubmission).filter((k) => k.amlFlag === true);
    },
  });

  // Users with pending deletion (suspended = soft delete)
  const gdprQ = useQuery({
    queryKey: ['admin', 'compliance', 'gdpr'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db(), 'users'), limit(500)),
      );
      return snap.docs.map((d) => d.data() as User).filter((u) => u.suspended === true);
    },
  });

  // Suspicious users (high overdue, low rating)
  const suspiciousQ = useQuery({
    queryKey: ['admin', 'compliance', 'suspicious'],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db(), 'users'), limit(500)),
      );
      return snap.docs.map((d) => d.data() as User).filter(
        (u) => (u.overdueLoans ?? 0) > 0 || (u.rating ?? 5) < 2,
      );
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance Center</h1>
        <p className="text-sm text-white/50">AML screening, GDPR requests, suspicious activity monitoring</p>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'aml', label: `AML Flags (${amlQ.data?.length ?? 0})` },
          { key: 'gdpr', label: `GDPR/Suspensions (${gdprQ.data?.length ?? 0})` },
          { key: 'suspicious', label: `Suspicious Users (${suspiciousQ.data?.length ?? 0})` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 text-sm rounded-md transition ${tab === t.key ? 'bg-primary text-black font-semibold' : 'bg-bg-elevated text-white/70 hover:bg-border'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'aml' && (
        <div className="bg-bg-surface border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">AML/PEP Flagged Users</h2>
          {(amlQ.data ?? []).length === 0 ? (
            <p className="text-white/30 text-center py-8">No AML flags found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-white/50 border-b border-border">
                <th className="pb-3 font-medium">User ID</th>
                <th className="pb-3 font-medium">Confidence</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Submitted</th>
              </tr></thead>
              <tbody>
                {(amlQ.data ?? []).map((k) => (
                  <tr key={k.id} className="border-b border-border/50">
                    <td className="py-3 text-white/80 text-xs">{k.userId.slice(0, 16)}</td>
                    <td className="py-3 text-danger font-semibold">{Math.round((k.confidenceScore ?? 0) * 100)}%</td>
                    <td className="py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-danger/20 text-danger uppercase">{k.status}</span></td>
                    <td className="py-3 text-white/50 text-xs">{formatDate(k.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'gdpr' && (
        <div className="bg-bg-surface border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Suspended / GDPR Data Deletion Requests</h2>
          {(gdprQ.data ?? []).length === 0 ? (
            <p className="text-white/30 text-center py-8">No suspended users or deletion requests.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-white/50 border-b border-border">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Joined</th>
              </tr></thead>
              <tbody>
                {(gdprQ.data ?? []).map((u) => (
                  <tr key={u.uid} className="border-b border-border/50">
                    <td className="py-3 text-white/80">{u.fullName}</td>
                    <td className="py-3 text-white/60 text-xs">{u.email}</td>
                    <td className="py-3"><span className="px-2 py-0.5 rounded text-xs font-semibold bg-danger/20 text-danger uppercase">Suspended</span></td>
                    <td className="py-3 text-white/50 text-xs">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-4 p-3 bg-bg-elevated rounded text-xs text-white/40">
            GDPR/CCPA deletion: Users can delete their account in-app via Delete Account. This triggers cascade deletion
            (profile, KYC docs, tokens) with 7-year legal retention for loan records (anonymized).
          </div>
        </div>
      )}

      {tab === 'suspicious' && (
        <div className="bg-bg-surface border border-border rounded-lg p-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Suspicious Activity (Overdue Loans or Low Rating)</h2>
          {(suspiciousQ.data ?? []).length === 0 ? (
            <p className="text-white/30 text-center py-8">No suspicious activity detected.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-white/50 border-b border-border">
                <th className="pb-3 font-medium">User</th>
                <th className="pb-3 font-medium">Overdue</th>
                <th className="pb-3 font-medium">Rating</th>
                <th className="pb-3 font-medium">Completed</th>
              </tr></thead>
              <tbody>
                {(suspiciousQ.data ?? []).map((u) => (
                  <tr key={u.uid} className="border-b border-border/50">
                    <td className="py-3">
                      <div className="text-white/80">{u.fullName}</div>
                      <div className="text-white/40 text-xs">{u.email}</div>
                    </td>
                    <td className="py-3 text-danger font-semibold">{u.overdueLoans ?? 0}</td>
                    <td className="py-3 text-secondary">{(u.rating ?? 0).toFixed(1)}</td>
                    <td className="py-3 text-white/70">{u.completedLoans ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
