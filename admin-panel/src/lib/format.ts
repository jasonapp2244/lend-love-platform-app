import { CURRENCY_SYMBOLS } from '@lendlove/shared';

export function formatMoney(amount: number, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
  return `${symbol}${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/** Convert a ms-timestamp (or Firestore Timestamp-like object) to a safe Date, or null. */
function toSafeDate(value: unknown): Date | null {
  if (!value) return null;
  // Firestore Timestamp objects have a toMillis() method
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return new Date((value as { toMillis: () => number }).toMillis());
  }
  // Firestore Timestamps also expose { seconds, nanoseconds }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  if (typeof value !== 'number' || isNaN(value)) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(ms: number | undefined): string {
  const d = toSafeDate(ms);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(ms: number | undefined): string {
  const d = toSafeDate(ms);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}
