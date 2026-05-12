/**
 * Lend Love™ Constants
 * Compliance-critical constants and platform configuration defaults.
 */

// ---- Store Compliance (Apple + Google Play Personal Loan Policy) ----
export const COMPLIANCE = {
  /** Minimum borrower age (legal contract requirement) */
  MIN_AGE: 18,
  /** Maximum APR allowed by Google Play Personal Loan Policy */
  MAX_APR_PERCENT: 36,
  /** Minimum loan term (Google bans single-payment loans <60 days) */
  MIN_LOAN_TERM_DAYS: 60,
  /** Required disclosures in agreement PDF (TILA) */
  TILA_REQUIRED_FIELDS: [
    'apr',
    'financeCharge',
    'amountFinanced',
    'totalOfPayments',
    'paymentSchedule',
    'lateFee',
    'prepaymentTerms',
  ] as const,
} as const;

// ---- Platform Defaults ----
export const PLATFORM_DEFAULTS = {
  MIN_LOAN_AMOUNT: 50,
  MAX_LOAN_AMOUNT: 10_000,
  DEFAULT_INTEREST_PERCENT: 5,
  DEFAULT_LATE_FEE_PER_DAY: 0,
  PLATFORM_FEE_PERCENT: 1.5,
  CURRENCY: 'USD',
} as const;

// ---- Demo Mode ----
export const DEMO = {
  LOANER_UID: 'demo-loaner',
  BORROWER_UID: 'demo-borrower',
  LOANER_EMAIL: 'guest.loaner@demo.app',
  BORROWER_EMAIL: 'guest.borrower@demo.app',
  PASSWORD: 'demo-mode-no-validation',
} as const;

// ---- Loan Status Enum ----
export const LOAN_STATUS = [
  'draft',
  'published',
  'pending-agreement',
  'pending-disbursement',
  'active',
  'overdue',
  'completed',
  'cancelled',
  'defaulted',
] as const;
export type LoanStatus = (typeof LOAN_STATUS)[number];

// ---- Loan Type ----
export const LOAN_TYPES = ['money', 'item'] as const;
export type LoanType = (typeof LOAN_TYPES)[number];

// ---- Installment Frequency ----
export const INSTALLMENT_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'oneTime'] as const;
export type InstallmentFrequency = (typeof INSTALLMENT_FREQUENCIES)[number];

// ---- Transaction Type ----
export const TRANSACTION_TYPES = [
  'disbursement',
  'repayment',
  'fee',
  'refund',
  'chargeback',
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

// ---- KYC Status ----
export const KYC_STATUS = ['none', 'pending', 'approved', 'rejected', 'manual_review'] as const;
export type KycStatus = (typeof KYC_STATUS)[number];

// ---- User Role ----
export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---- Admin Tier ----
export const ADMIN_TIERS = ['super', 'operations', 'finance', 'support'] as const;
export type AdminTier = (typeof ADMIN_TIERS)[number];

// ---- Currency Symbol ----
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

// ---- App Metadata ----
export const APP_NAME = 'Lend Love';
export const APP_TM = 'Lend Love™';
export const BUNDLE_ID = 'com.lendlove.app';
export const PRIVACY_URL = 'https://lendlove.com/privacy';
export const TERMS_URL = 'https://lendlove.com/terms';
export const DELETE_ACCOUNT_URL = 'https://lendlove.com/delete-account';
export const SUPPORT_URL = 'https://lendlove.com/support';
