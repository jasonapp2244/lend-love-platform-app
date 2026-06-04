import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import {
  CreateItemLoanSchema,
  COMPLIANCE,
  PLATFORM_DEFAULTS,
  INSTALLMENT_FREQUENCIES,
} from '@lendlove/shared';
import type { PlatformConfig } from '@lendlove/shared';
import { requireAuth, badRequest } from '../lib/errors';

/**
 * Creates a loan (money or item). Enforces:
 * - Auth required
 * - Loaner must be the calling user
 * - Dynamic validation from admin-configurable platform config
 * - Falls back to hardcoded compliance constants if config not found
 */
export const createLoan = onCall({ region: 'us-central1' }, async (req) => {
  const uid = requireAuth(req.auth);

  // Read platform config dynamically from Firestore (admin-configurable)
  const db = admin.firestore();
  const configSnap = await db.doc('config/platform').get();
  const cfg = configSnap.exists ? (configSnap.data() as PlatformConfig) : null;

  const maxAPR = cfg?.maxAPR ?? COMPLIANCE.MAX_APR_PERCENT;
  const minAmount = cfg?.minLoanAmount ?? PLATFORM_DEFAULTS.MIN_LOAN_AMOUNT;
  const maxAmount = cfg?.maxLoanAmount ?? PLATFORM_DEFAULTS.MAX_LOAN_AMOUNT;
  const minTermDays = cfg?.minLoanTermDays ?? COMPLIANCE.MIN_LOAN_TERM_DAYS;

  // Build money loan schema with dynamic config
  const DynamicMoneyLoanSchema = z.object({
    type: z.literal('money'),
    amount: z.number().min(minAmount).max(maxAmount),
    currency: z.string().default('USD'),
    interestRate: z.number().min(0).max(maxAPR, `Interest cannot exceed ${maxAPR}% APR`),
    installments: z.number().int().min(1).max(60),
    installmentFrequency: z.enum(INSTALLMENT_FREQUENCIES),
    lateFeePerDay: z.number().min(0).default(0),
    dueDate: z.number().refine(
      (ms) => (ms - Date.now()) / (1000 * 60 * 60 * 24) >= minTermDays,
      { message: `Loan term must be at least ${minTermDays} days.` },
    ),
    description: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
  });

  const DynamicCreateLoanSchema = z.discriminatedUnion('type', [
    DynamicMoneyLoanSchema,
    CreateItemLoanSchema,
  ]);

  const parsed = DynamicCreateLoanSchema.safeParse(req.data);
  if (!parsed.success) {
    badRequest(parsed.error.errors.map((e) => e.message).join('; '));
  }

  const loanRef = db.collection('loans').doc();
  const now = Date.now();

  await loanRef.set({
    id: loanRef.id,
    ...parsed.data,
    loanerId: uid,
    status: 'published',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return { success: true, loanId: loanRef.id };
});
