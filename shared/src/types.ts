/**
 * Lend Love™ Domain Types
 * Used by mobile app, admin panel, and backend.
 */
import type {
  LoanStatus,
  LoanType,
  InstallmentFrequency,
  TransactionType,
  KycStatus,
  UserRole,
  AdminTier,
} from './constants';

// ---- User ----
export interface User {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  birthday?: string; // ISO date
  occupation?: string;
  rating: number;
  reviewCount: number;
  completedLoans: number;
  overdueLoans: number;
  totalLent: number;
  totalBorrowed: number;
  isVerified: boolean;
  kycStatus: KycStatus;
  kycSubmissionId?: string;
  role: UserRole;
  adminTier?: AdminTier;
  notificationsEnabled: boolean;
  biometricsEnabled: boolean;
  themePreference?: 'dark' | 'light' | 'system';
  fcmTokens?: string[];
  isDemo?: boolean; // true for Guest Loaner / Guest Borrower
  suspended?: boolean; // soft-suspended by admin
  blockedUserIds?: string[];
  createdAt: number; // ms timestamp
  updatedAt: number;
}

// ---- Loan ----
export interface BaseLoan {
  id: string;
  type: LoanType;
  loanerId: string;
  borrowerId?: string; // null until matched
  status: LoanStatus;
  notes?: string;
  agreementId?: string;
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface MoneyLoan extends BaseLoan {
  type: 'money';
  amount: number;
  currency: string;
  interestRate: number; // % APR
  installments: number;
  installmentFrequency: InstallmentFrequency;
  installmentAmount?: number; // computed
  lateFeePerDay: number;
  dueDate: number; // ms timestamp
  balance?: number; // remaining
  nextDueDate?: number;
  description?: string;
}

export interface ItemLoan extends BaseLoan {
  type: 'item';
  itemTitle: string;
  description: string;
  condition: string;
  deposit?: number;
  replacementValue: number;
  returnDate: number;
  imageUrl?: string;
}

export type Loan = MoneyLoan | ItemLoan;

// ---- Loan Request ----
export interface LoanRequest {
  id: string;
  borrowerId: string;
  amount: number;
  currency: string;
  purpose: string;
  neededByDate: number;
  repaymentTermMonths: number;
  collateral?: string;
  status: 'open' | 'fulfilled' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}

// ---- Agreement ----
export interface Agreement {
  id: string;
  loanId: string;
  loanerId: string;
  borrowerId: string;
  loanerName: string;
  borrowerName: string;
  loanAmount: number;
  currency: string;
  interestRate: number;
  apr: number;
  financeCharge: number;
  totalOfPayments: number;
  lateFeePerDay: number;
  dueDate: number;
  terms: string;
  loanerSignatureUrl?: string;
  borrowerSignatureUrl?: string;
  pdfUrl?: string;
  signedAt?: number;
  createdAt: number;
}

// ---- Transaction ----
export interface Transaction {
  id: string;
  loanId: string;
  userId: string;
  type: TransactionType;
  direction: 'credit' | 'debit';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  description?: string;
  paykingsRef?: string;
  processedAt?: number;
  createdAt: number;
}

// ---- Conversation + Messages ----
export interface Conversation {
  id: string;
  participantIds: string[];
  loanId?: string;
  lastMessage: string;
  lastMessageAt: number;
  lastSenderId?: string;
  unreadCount?: Record<string, number>;
  createdAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf';
  sentAt: number;
  readBy: string[];
}

// ---- KYC Submission ----
export interface KycSubmission {
  id: string;
  userId: string;
  idAnalyzerRef?: string;
  status: KycStatus;
  documents?: {
    idUrl?: string;
    selfieUrl?: string;
    addressUrl?: string;
  };
  confidenceScore?: number;
  amlFlag?: boolean;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
}

// ---- Notification ----
export interface Notification {
  id: string;
  userId: string;
  type:
    | 'loan-published'
    | 'loan-applied'
    | 'agreement-signed'
    | 'payment-due'
    | 'payment-received'
    | 'payment-overdue'
    | 'message-received'
    | 'kyc-approved'
    | 'kyc-rejected'
    | 'admin-message';
  title: string;
  body: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: number;
}

// ---- Support Ticket ----
export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  messages: Array<{
    senderId: string;
    senderRole: 'user' | 'admin';
    text: string;
    sentAt: number;
  }>;
  createdAt: number;
  updatedAt: number;
}

// ---- Admin Audit Action ----
export interface AdminAction {
  id: string;
  adminId: string;
  action: string;
  targetCollection: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: number;
}

// ---- Platform Config ----
export interface PlatformConfig {
  feePercent: number;
  maxAPR: number;
  minLoanAmount: number;
  maxLoanAmount: number;
  minLoanTermDays: number;
  minBorrowerAge: number;
  featureFlags: Record<string, boolean>;
  lastUpdatedBy?: string;
  updatedAt: number;
}

// ---- User-Generated Content Report ----
export interface ContentReport {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  contentType: 'message' | 'profile' | 'listing';
  contentId: string;
  reason: 'spam' | 'fraud' | 'harassment' | 'inappropriate' | 'other';
  description?: string;
  status: 'open' | 'reviewed' | 'actioned' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: number;
  createdAt: number;
}
