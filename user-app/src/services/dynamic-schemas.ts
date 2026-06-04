/**
 * Dynamic Schema Factory
 * Creates Zod schemas using runtime config from Firestore (admin-configurable)
 * instead of hardcoded constants. This ensures admin config changes
 * actually affect validation in the user app.
 */
import { z } from 'zod';
import { INSTALLMENT_FREQUENCIES } from '../shared';
import type { PlatformConfig } from '../shared';

/**
 * Creates a money loan schema using dynamic config values.
 * Called at validation time with the current platform config.
 */
export function createMoneyLoanSchema(config: PlatformConfig) {
  return z.object({
    type: z.literal('money'),
    amount: z
      .number()
      .min(config.minLoanAmount, `Minimum loan amount is $${config.minLoanAmount}`)
      .max(config.maxLoanAmount, `Maximum loan amount is $${config.maxLoanAmount}`),
    currency: z.string().default('USD'),
    interestRate: z
      .number()
      .min(0)
      .max(config.maxAPR, `Interest cannot exceed ${config.maxAPR}% APR`),
    installments: z.number().int().min(1).max(60),
    installmentFrequency: z.enum(INSTALLMENT_FREQUENCIES),
    lateFeePerDay: z.number().min(0).default(0),
    dueDate: z.number().refine(
      (ms) => {
        const days = (ms - Date.now()) / (1000 * 60 * 60 * 24);
        return days >= config.minLoanTermDays;
      },
      { message: `Loan term must be at least ${config.minLoanTermDays} days.` },
    ),
    description: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
  });
}

/**
 * Creates a loan request schema using dynamic config values.
 */
export function createLoanRequestSchema(config: PlatformConfig) {
  return z.object({
    amount: z
      .number()
      .min(config.minLoanAmount, `Minimum amount is $${config.minLoanAmount}`)
      .max(config.maxLoanAmount, `Maximum amount is $${config.maxLoanAmount}`),
    currency: z.string().default('USD'),
    purpose: z.string().min(5).max(500),
    neededByDate: z.number(),
    repaymentTermMonths: z.number().int().min(2).max(60),
    collateral: z.string().max(200).optional(),
  });
}
