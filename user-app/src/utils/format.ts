import { CURRENCY_SYMBOLS } from '../../src/shared';

export function formatMoney(amount: number, currency = 'USD'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
  return `${symbol}${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function formatRelativeFromNow(ms: number): string {
  const diff = ms - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'in 1 day';
  if (days === -1) return '1 day ago';
  if (days > 0 && days < 30) return `in ${days} days`;
  if (days < 0 && days > -30) return `${Math.abs(days)} days ago`;
  const months = Math.round(days / 30);
  return months > 0 ? `in ${months} months` : `${Math.abs(months)} months ago`;
}

export function monthsBetween(fromMs: number, toMs: number): number {
  const diff = toMs - fromMs;
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24 * 30)));
}
