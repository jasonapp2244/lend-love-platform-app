import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import type { Agreement, Loan, MoneyLoan } from '../../src/shared';

interface DraftInput {
  loan: MoneyLoan;
  loanerId: string;
  loanerName: string;
  borrowerId: string;
  borrowerName: string;
  lateFeePerDay: number;
  terms: string;
}

/**
 * Compute TILA-required figures. Simplified APR using simple interest for
 * single-payment money loans; for installment loans we apply the stated
 * interest as APR directly (compliance-validated in CreateLoanSchema).
 */
function computeTila(loan: MoneyLoan) {
  const principal = loan.amount;
  const apr = loan.interestRate;
  const months = Math.max(
    1,
    Math.round((loan.dueDate - Date.now()) / (1000 * 60 * 60 * 24 * 30))
  );
  const annualRate = apr / 100;
  const totalInterest = +(principal * annualRate * (months / 12)).toFixed(2);
  const totalOfPayments = +(principal + totalInterest).toFixed(2);
  return { apr, financeCharge: totalInterest, totalOfPayments };
}

export async function createDraftAgreement(input: DraftInput): Promise<string> {
  const ref = doc(collection(db, 'agreements'));
  const tila = computeTila(input.loan);
  const now = Date.now();

  const agreement: Agreement = {
    id: ref.id,
    loanId: input.loan.id,
    loanerId: input.loanerId,
    borrowerId: input.borrowerId,
    loanerName: input.loanerName,
    borrowerName: input.borrowerName,
    loanAmount: input.loan.amount,
    currency: input.loan.currency,
    interestRate: input.loan.interestRate,
    apr: tila.apr,
    financeCharge: tila.financeCharge,
    totalOfPayments: tila.totalOfPayments,
    lateFeePerDay: input.lateFeePerDay,
    dueDate: input.loan.dueDate,
    terms: input.terms,
    createdAt: now,
  };

  await setDoc(ref, agreement);

  // Link agreement to loan
  await updateDoc(doc(db, 'loans', input.loan.id), {
    agreementId: ref.id,
    status: 'pending-agreement',
    updatedAt: now,
  });

  return ref.id;
}

export async function fetchAgreement(id: string): Promise<Agreement | null> {
  const snap = await getDoc(doc(db, 'agreements', id));
  return snap.exists() ? (snap.data() as Agreement) : null;
}

/**
 * Save a user's signature (SVG string) to Storage + update the agreement doc.
 * Uses Firebase Storage data-URL upload so it works in demo + production.
 */
export async function signAgreement(
  agreementId: string,
  party: 'loaner' | 'borrower',
  signerUid: string,
  signatureSvg: string
): Promise<void> {
  const path = `signatures/${signerUid}/${agreementId}-${party}-${Date.now()}.svg`;
  const sRef = storageRef(storage, path);
  await uploadString(sRef, signatureSvg, 'raw', { contentType: 'image/svg+xml' });
  const url = await getDownloadURL(sRef);

  const field = party === 'loaner' ? 'loanerSignatureUrl' : 'borrowerSignatureUrl';

  const snap = await getDoc(doc(db, 'agreements', agreementId));
  const data = snap.data() as Agreement | undefined;
  const otherSigned =
    party === 'loaner' ? !!data?.borrowerSignatureUrl : !!data?.loanerSignatureUrl;

  await updateDoc(doc(db, 'agreements', agreementId), {
    [field]: url,
    signedAt: otherSigned ? Date.now() : data?.signedAt ?? null,
  });

  if (otherSigned && data?.loanId) {
    await updateDoc(doc(db, 'loans', data.loanId), {
      status: 'active',
      updatedAt: Date.now(),
    });
  }
}

/**
 * TILA-compliant agreement HTML — used for PDF generation via expo-print.
 * Contains all required disclosures: APR, Finance Charge, Amount Financed,
 * Total of Payments, Payment Schedule, Late Fees.
 */
export function buildAgreementHtml(a: Agreement): string {
  const fmt = (n: number) => `$${n.toFixed(2)}`;
  const date = (ms: number) =>
    new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });

  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Loan Agreement ${a.id}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 32px; color: #1F2937; font-size: 13px; line-height: 1.5; }
  h1 { color: #3D9A2E; border-bottom: 2px solid #3D9A2E; padding-bottom: 8px; margin-bottom: 6px; }
  h2 { color: #236E16; font-size: 14px; margin-top: 24px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td { padding: 6px 0; vertical-align: top; }
  td:first-child { color: #555; width: 45%; }
  td:last-child { font-weight: 600; color: #111827; }
  .meta { color: #888; font-size: 11px; }
  .tila { background: #FFFBEB; border-left: 4px solid #F5A800; padding: 12px 16px; margin: 12px 0; }
  .tila strong { color: #78350F; }
  .sig-row { display: flex; gap: 40px; margin-top: 48px; }
  .sig-row > div { flex: 1; border-top: 1px solid #333; padding-top: 6px; }
  .small { font-size: 11px; color: #777; }
</style></head>
<body>
  <h1>Loan Agreement</h1>
  <div class="meta">Agreement ID: ${a.id}</div>
  <div class="meta">Loan ID: ${a.loanId}</div>
  <div class="meta">Date: ${date(a.createdAt)}</div>

  <h2>Parties</h2>
  <table>
    <tr><td>Loaner</td><td>${a.loanerName}</td></tr>
    <tr><td>Borrower</td><td>${a.borrowerName}</td></tr>
  </table>

  <h2>Loan Terms</h2>
  <table>
    <tr><td>Amount</td><td>${fmt(a.loanAmount)}</td></tr>
    <tr><td>Interest Rate</td><td>${a.interestRate.toFixed(2)}%</td></tr>
    <tr><td>Late Fee / Day</td><td>${fmt(a.lateFeePerDay)}</td></tr>
    <tr><td>Due Date</td><td>${date(a.dueDate)}</td></tr>
  </table>

  <h2>Federal Truth-in-Lending Disclosure</h2>
  <div class="tila">
    <table>
      <tr><td><strong>Annual Percentage Rate (APR)</strong></td><td><strong>${a.apr.toFixed(2)}%</strong></td></tr>
      <tr><td><strong>Finance Charge</strong></td><td><strong>${fmt(a.financeCharge)}</strong></td></tr>
      <tr><td><strong>Amount Financed</strong></td><td><strong>${fmt(a.loanAmount)}</strong></td></tr>
      <tr><td><strong>Total of Payments</strong></td><td><strong>${fmt(a.totalOfPayments)}</strong></td></tr>
    </table>
    <div class="small">The cost of your credit as a yearly rate (APR), the dollar amount the credit will cost you (Finance Charge), the amount of credit provided to you (Amount Financed), and the amount you will have paid after all scheduled payments (Total of Payments). See Payment Schedule below.</div>
  </div>

  <h2>Payment Schedule</h2>
  <table>
    <tr><td>Single payment of</td><td>${fmt(a.totalOfPayments)} due ${date(a.dueDate)}</td></tr>
  </table>

  <h2>Late Payment Fee</h2>
  <table>
    <tr><td>If your payment is late</td><td>${fmt(a.lateFeePerDay)} per day past the due date</td></tr>
  </table>

  <h2>Prepayment</h2>
  <div>You may pay off all or part of your loan early without penalty.</div>

  <h2>Terms &amp; Conditions</h2>
  <div>${a.terms.replace(/\n/g, '<br/>')}</div>

  <h2>Signatures</h2>
  <div class="sig-row">
    <div>
      ${a.borrowerSignatureUrl ? `<img src="${a.borrowerSignatureUrl}" alt="Borrower signature" style="max-width:200px;max-height:60px"/>` : '<div style="height:60px"></div>'}
      <div>Borrower: ${a.borrowerName}</div>
    </div>
    <div>
      ${a.loanerSignatureUrl ? `<img src="${a.loanerSignatureUrl}" alt="Loaner signature" style="max-width:200px;max-height:60px"/>` : '<div style="height:60px"></div>'}
      <div>Loaner: ${a.loanerName}</div>
    </div>
  </div>

  <div style="margin-top:60px" class="small">
    Generated by Lend Love™. This is a binding peer-to-peer loan agreement
    between the Loaner and Borrower named above. Lend Love is not a party to
    the loan and does not guarantee repayment.
  </div>
</body></html>`;
}
