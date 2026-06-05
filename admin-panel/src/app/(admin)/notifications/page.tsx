'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { collection, getDocs, query, where, limit, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { audit } from '@/lib/audit';
import type { User } from '@lendlove/shared';

type Audience = 'all' | 'verified' | 'unverified' | 'admin';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [sent, setSent] = useState<number | null>(null);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) throw new Error('Title and body required');
      const _db = db();
      // Fetch target users
      const usersSnap = await getDocs(query(collection(_db, 'users'), limit(500)));
      let users = usersSnap.docs.map((d) => d.data() as User);
      if (audience === 'verified') users = users.filter((u) => u.isVerified);
      if (audience === 'unverified') users = users.filter((u) => !u.isVerified);
      if (audience === 'admin') users = users.filter((u) => u.role === 'admin');

      // Create notification doc for each user
      let count = 0;
      for (const user of users) {
        const nRef = doc(collection(_db, 'notifications'));
        await setDoc(nRef, {
          id: nRef.id,
          userId: user.uid,
          type: 'admin-message',
          title: title.trim(),
          body: body.trim(),
          read: false,
          createdAt: Date.now(),
        });
        count++;
      }

      await audit('notification.broadcast', { collection: 'notifications', id: 'broadcast' }, {
        after: { title, audience, recipientCount: count },
      });

      return count;
    },
    onSuccess: (count) => {
      setSent(count);
      setTitle('');
      setBody('');
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Notifications & Announcements</h1>
        <p className="text-sm text-white/50">Send broadcast notifications to users</p>
      </div>

      {sent !== null && (
        <div className="bg-primary/15 border border-primary rounded-lg p-4 text-primary-light text-sm">
          Notification sent to {sent} users.
          <button onClick={() => setSent(null)} className="ml-2 underline">Dismiss</button>
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

        <button disabled={!title.trim() || !body.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
          className="w-full px-4 py-3 rounded-md bg-primary text-black font-semibold text-sm hover:bg-primary-light transition disabled:opacity-50">
          {sendMutation.isPending ? 'Sending…' : `Send to ${audience === 'all' ? 'All Users' : audience}`}
        </button>
      </div>

      <div className="bg-bg-surface border border-border rounded-lg p-6 space-y-3">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">How It Works</h2>
        <ul className="text-sm text-white/60 space-y-1 list-disc list-inside">
          <li>Creates a notification document for each target user in Firestore</li>
          <li>Users see notifications in their Notifications page (bell icon)</li>
          <li>Unread notifications show a red badge count on the home screen</li>
          <li>Push delivery (FCM) will be active once Firebase Blaze plan is enabled</li>
        </ul>
      </div>
    </div>
  );
}
