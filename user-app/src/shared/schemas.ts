/**
 * Lend Love™ Zod Schemas
 * Runtime validation — used at every API boundary.
 */
import { z } from 'zod';
import {
  COMPLIANCE,
  PLATFORM_DEFAULTS,
  LOAN_TYPES,
  INSTALLMENT_FREQUENCIES,
} from './constants';

// ---- Sign Up ----
export const SignUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2).max(100),
    birthday: z.string().refine(
      (val) => {
        const dob = new Date(val);
        const ageMs = Date.now() - dob.getTime();
        const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
        return ageYears >= COMPLIANCE.MIN_AGE;
      },
      { message: `You must be at least ${COMPLIANCE.MIN_AGE} years old to use Lend Love.` }
    ),
    acceptedTos: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the Terms of Service.' }),
    }),
  });
export type SignUpInput = z.infer<typeof SignUpSchema>;

// ---- Sign In ----
export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type SignInInput = z.infer<typeof SignInSchema>;

// ---- Create Money Loan ----
export const CreateMoneyLoanSchema = z
  .object({
    type: z.literal('money'),
    amount: z
      .number()
      .min(PLATFORM_DEFAULTS.MIN_LOAN_AMOUNT)
      .max(PLATFORM_DEFAULTS.MAX_LOAN_AMOUNT),
    currency: z.string().default(PLATFORM_DEFAULTS.CURRENCY),
    interestRate: z
      .number()
      .min(0)
      .max(COMPLIANCE.MAX_APR_PERCENT, `Interest cannot exceed ${COMPLIANCE.MAX_APR_PERCENT}% APR`),
    installments: z.number().int().min(1).max(60),
    installmentFrequency: z.enum(INSTALLMENT_FREQUENCIES),
    lateFeePerDay: z.number().min(0).default(0),
    dueDate: z.number().refine(
      (ms) => {
        const days = (ms - Date.now()) / (1000 * 60 * 60 * 24);
        return days >= COMPLIANCE.MIN_LOAN_TERM_DAYS;
      },
      { message: `Loan term must be at least ${COMPLIANCE.MIN_LOAN_TERM_DAYS} days.` }
    ),
    description: z.string().max(500).optional(),
    notes: z.string().max(500).optional(),
  });
export type CreateMoneyLoanInput = z.infer<typeof CreateMoneyLoanSchema>;

// ---- Create Item Loan ----
export const CreateItemLoanSchema = z.object({
  type: z.literal('item'),
  itemTitle: z.string().min(2).max(100),
  description: z.string().min(2).max(1000),
  condition: z.string().min(1).max(50),
  deposit: z.number().min(0).optional(),
  replacementValue: z.number().min(1).max(50_000),
  returnDate: z.number(),
  notes: z.string().max(500).optional(),
});
export type CreateItemLoanInput = z.infer<typeof CreateItemLoanSchema>;

export const CreateLoanSchema = z.discriminatedUnion('type', [
  CreateMoneyLoanSchema,
  CreateItemLoanSchema,
]);
export type CreateLoanInput = z.infer<typeof CreateLoanSchema>;

// ---- Create Loan Request ----
export const CreateLoanRequestSchema = z.object({
  amount: z.number().min(PLATFORM_DEFAULTS.MIN_LOAN_AMOUNT).max(PLATFORM_DEFAULTS.MAX_LOAN_AMOUNT),
  currency: z.string().default(PLATFORM_DEFAULTS.CURRENCY),
  purpose: z.string().min(5).max(500),
  neededByDate: z.number(),
  repaymentTermMonths: z.number().int().min(2).max(60),
  collateral: z.string().max(200).optional(),
});
export type CreateLoanRequestInput = z.infer<typeof CreateLoanRequestSchema>;

// ---- Send Message ----
export const SendMessageSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().min(1).max(2000),
  attachmentUrl: z.string().url().optional(),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

// ---- Update Profile ----
export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional(),
  address: z.string().max(200).optional(),
  occupation: z.string().max(100).optional(),
  notificationsEnabled: z.boolean().optional(),
  biometricsEnabled: z.boolean().optional(),
  themePreference: z.enum(['dark', 'light', 'system']).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ---- Report Content ----
export const ReportContentSchema = z.object({
  reportedUserId: z.string().optional(),
  contentType: z.enum(['message', 'profile', 'listing']),
  contentId: z.string(),
  reason: z.enum(['spam', 'fraud', 'harassment', 'inappropriate', 'other']),
  description: z.string().max(500).optional(),
});
export type ReportContentInput = z.infer<typeof ReportContentSchema>;

// ---- Delete Account ----
export const DeleteAccountSchema = z.object({
  confirmText: z.literal('DELETE', {
    errorMap: () => ({ message: 'Type DELETE to confirm.' }),
  }),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
