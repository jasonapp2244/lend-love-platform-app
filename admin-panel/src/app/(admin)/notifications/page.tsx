'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, query, where, limit, doc, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { audit } from '@/lib/audit';
import { formatDate } from '@/lib/format';
import type { User } from '@lendlove/shared';

type Audience = 'all' | 'verified' | 'unverified' | 'admin';
type Tab = 'broadcast' | 'banners' | 'templates';

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('broadcast');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications & Announcements</h1>
        <p className="text-sm text-white/50">Send broadcasts, manage banners, and edit templates</p>
      </div>

      <div className="flex gap-1 text-xs bg-bg-surface border border-border rounded-md p-1 w-fit">
        {([
          { key: 'broadcast', label: 'Push Broadcast' },
          { key: 'banners', label: 'In-App Banners' },
          { key: 'templates', label: 'Message Templates' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded whitespace-nowrap ${tab === t.key ? 'bg-primary text-black font-semibold' : 'text-white/60 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'broadcast' && <BroadcastSection />}
      {tab === 'banners' && <BannersSection />}
      {tab === 'templates' && <TemplatesSection />}
    </div>
  );
}

// ---- Broadcast Section (original + email option) ----

function BroadcastSection() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [sendEmail, setSendEmail] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error('Title and body required');
      const _db = db();
      const usersSnap = await getDocs(query(collection(_db, 'users'), limit(500)));
      let users = usersSnap.docs.map((d) => d.data() as User);
      if (audience === 'verified') users = users.filter((u) => u.isVerified);
      if (audience === 'unverified') users = users.filter((u) => !u.isVerified);
      if (audience === 'admin') users = users.filter((u) => u.role === 'admin');

      let count = 0;
      for (const user of users) {
        if (!user.uid) continue;
        const nRef = doc(collection(_db, 'notifications'));
        await setDoc(nRef, {
          id: nRef.id,
          userId: user.uid,
          type: 'admin-message',
          title: title.trim(),
          body: body.trim(),
          ...(sendEmail ? { data: { sendEmail: 'true' } } : {}),
          read: false,
          createdAt: Date.now(),
        });
        count++;
      }

      await audit('notification.broadcast', { collection: 'notifications', id: 'broadcast' }, {
        after: { title, audience, recipientCount: count, emailIncluded: sendEmail },
      });

      return count;
    },
    onSuccess: (count) => {
      setSent(count);
      setSendError(null);
      setTitle('');
      setBody('');
    },
    onError: (err: unknown) => {
      setSendError(err instanceof Error ? err.message : 'Failed to send notification. Please try again.');
    },
  });

  return (
    <div className="max-w-2xl space-y-4">
      {sent !== null && (
        <div className="bg-primary/15 border border-primary rounded-lg p-4 text-primary-light text-sm">
          Notification sent to {sent} users{sendEmail ? ' (with email)' : ''}.
          <button onClick={() => setSent(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {sendError && (
        <div className="bg-danger/15 border border-danger rounded-lg p-4 text-danger text-sm">
          Error: {sendError}
          <button onClick={() => setSendError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
        <div>
          <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-1">Audience</label>
          <div className="flex gap-2">
            {(['all', 'verified', 'unverified', 'admin'] as Audience[]).map((a) => (
              <button key={a} onClick={() => setAudience(a)}
                className={`px-4 py-2 text-sm rounded-md capitalize transition ${audience === a ? 'bg-primary text-black font-semibold' : 'bg-bg-elevated text-white/70 hover:bg-border'}`}>
                {a === 'all' ? 'All Users' : a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-1">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title"
            className="w-full px-4 py-2 bg-bg-elevated border border-border rounded-md text-white text-sm placeholder:text-white/30 outline-none focus:border-primary" />
        </div>

        <div>
          <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-1">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification body text" rows={4}
            className="w-full px-4 py-2 bg-bg-elevated border border-border rounded-md text-white text-sm placeholder:text-white/30 outline-none focus:border-primary resize-none" />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSendEmail(!sendEmail)}
            className={`px-4 py-2 text-sm rounded-md transition ${sendEmail ? 'bg-secondary text-black font-semibold' : 'bg-bg-elevated text-white/70 hover:bg-border'}`}
          >
            {sendEmail ? '✓ Email included' : '+ Include email'}
          </button>
          <span className="text-xs text-white/40">
            {sendEmail ? 'Recipients will also receive an email via SendGrid' : 'Push notification only'}
          </span>
        </div>

        <button disabled={!title.trim() || !body.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
          className="w-full px-4 py-3 rounded-md bg-primary text-black font-semibold text-sm hover:bg-primary-light transition disabled:opacity-50">
          {sendMutation.isPending ? 'Sending…' : `Send to ${audience === 'all' ? 'All Users' : audience}`}
        </button>
      </div>
    </div>
  );
}

// ---- In-App Banners Section ----

function BannersSection() {
  const qc = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<'info' | 'warning' | 'success'>('info');

  const bannersQ = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db(), 'banners'), orderBy('createdAt', 'desc'), limit(20)));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() as { message: string; type: string; active: boolean; createdAt: number } }));
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim()) return;
      const ref = doc(collection(db(), 'banners'));
      await setDoc(ref, {
        id: ref.id,
        message: newMessage.trim(),
        type: newType,
        active: true,
        createdAt: Date.now(),
      });
      await audit('banner.create', { collection: 'banners', id: ref.id }, {
        after: { message: newMessage, type: newType },
      });
    },
    onSuccess: () => { setNewMessage(''); qc.invalidateQueries({ queryKey: ['admin', 'banners'] }); },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db(), 'banners', id));
      await audit('banner.delete', { collection: 'banners', id }, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'banners'] }),
  });

  const banners = bannersQ.data ?? [];

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
        <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block">Create Banner</label>

        <div className="flex gap-2">
          {(['info', 'warning', 'success'] as const).map((t) => (
            <button key={t} onClick={() => setNewType(t)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize ${newType === t ? (t === 'warning' ? 'bg-secondary text-black font-semibold' : t === 'success' ? 'bg-primary text-black font-semibold' : 'bg-blue-500/80 text-white font-semibold') : 'bg-bg-elevated text-white/70 hover:bg-border'}`}>
              {t}
            </button>
          ))}
        </div>

        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Banner message shown to all users…"
          className="w-full px-4 py-2 bg-bg-elevated border border-border rounded-md text-white text-sm placeholder:text-white/30 outline-none focus:border-primary" />

        <button
          onClick={() => createMut.mutate()}
          disabled={!newMessage.trim() || createMut.isPending}
          className="w-full px-4 py-2 bg-primary text-black font-semibold rounded-md text-sm hover:bg-primary-light transition disabled:opacity-50"
        >
          {createMut.isPending ? 'Creating…' : 'Publish Banner'}
        </button>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-6">
        <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block mb-3">Active Banners</label>
        {bannersQ.isLoading ? (
          <div className="text-white/30 text-sm">Loading…</div>
        ) : banners.length === 0 ? (
          <div className="text-white/30 text-sm">No banners active</div>
        ) : (
          <div className="space-y-2">
            {banners.map((b) => (
              <div key={b.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                b.type === 'warning' ? 'bg-secondary/10 border-secondary/30' :
                b.type === 'success' ? 'bg-primary/10 border-primary/30' :
                'bg-blue-500/10 border-blue-500/30'
              }`}>
                <div className="flex-1">
                  <span className={`text-xs uppercase font-semibold mr-2 ${
                    b.type === 'warning' ? 'text-secondary' : b.type === 'success' ? 'text-primary-light' : 'text-blue-400'
                  }`}>{b.type}</span>
                  <span className="text-sm text-white/80">{b.message}</span>
                  <span className="text-xs text-white/30 ml-2">{formatDate(b.createdAt)}</span>
                </div>
                <button
                  onClick={() => deleteMut.mutate(b.id)}
                  className="text-danger text-xs hover:underline ml-3"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Message Templates Section ----

function TemplatesSection() {
  const [templates, setTemplates] = useState([
    { id: 'welcome', name: 'Welcome', subject: 'Welcome to Lend Love!', body: 'Thanks for joining Lend Love. Start by verifying your identity to unlock all lending features.' },
    { id: 'kyc-reminder', name: 'KYC Reminder', subject: 'Complete Your Verification', body: 'Hi {name}, complete your identity verification to start lending and borrowing on Lend Love.' },
    { id: 'payment-reminder', name: 'Payment Reminder', subject: 'Payment Due Soon', body: 'Hi {name}, your payment of ${amount} is due on {dueDate}. Please ensure funds are available.' },
    { id: 'loan-approved', name: 'Loan Approved', subject: 'Your Loan Has Been Funded', body: 'Great news! Your loan request has been matched and the agreement is ready for signing.' },
    { id: 'overdue', name: 'Overdue Notice', subject: 'Payment Overdue', body: 'Hi {name}, your payment of ${amount} is overdue. Late fees may apply. Please make a payment as soon as possible.' },
  ]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-bg-surface border border-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <label className="text-xs text-white/50 font-semibold uppercase tracking-wider block">Message Templates</label>
            <p className="text-xs text-white/40 mt-1">
              Templates for automated notifications. Use {'{name}'}, {'{amount}'}, {'{dueDate}'} as placeholders.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-bg-elevated border border-border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold text-sm text-white/90">{t.name}</span>
                  <span className="text-xs text-white/30 ml-2 font-mono">{t.id}</span>
                </div>
                <button
                  onClick={() => {
                    if (editing === t.id) {
                      setTemplates(templates.map((tpl) =>
                        tpl.id === t.id ? { ...tpl, subject: editSubject, body: editBody } : tpl
                      ));
                      setEditing(null);
                    } else {
                      setEditing(t.id);
                      setEditSubject(t.subject);
                      setEditBody(t.body);
                    }
                  }}
                  className="text-xs px-3 py-1 bg-primary/20 text-primary-light rounded hover:bg-primary/30 transition"
                >
                  {editing === t.id ? 'Save' : 'Edit'}
                </button>
              </div>

              {editing === t.id ? (
                <div className="space-y-2">
                  <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-md text-xs text-white outline-none focus:border-primary"
                    placeholder="Subject line" />
                  <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3}
                    className="w-full px-3 py-2 bg-bg-base border border-border rounded-md text-xs text-white outline-none focus:border-primary resize-none"
                    placeholder="Message body" />
                </div>
              ) : (
                <div>
                  <div className="text-xs text-secondary mb-1">Subject: {t.subject}</div>
                  <p className="text-xs text-white/60 leading-relaxed">{t.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
