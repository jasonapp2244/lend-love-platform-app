# Lend Love™ — Technical Architecture

**Version:** 1.0
**Date:** 2026-05-11

---

## 1. System Overview

Lend Love is a serverless, cloud-native P2P lending platform built on **Firebase** with a **React Native** mobile client and **Next.js** admin panel. All business logic is centralized in Cloud Functions to enable consistent rule enforcement across both clients.

---

## 2. High-Level Architecture

```
                              ┌──────────────────────────────┐
                              │       END USERS              │
                              │  Loaners + Borrowers         │
                              └──────────────┬───────────────┘
                                             │
                                  ┌──────────┴──────────┐
                                  │                     │
                          ┌───────▼───────┐    ┌────────▼────────┐
                          │  iOS App      │    │  Android App    │
                          │  (Expo / RN)  │    │  (Expo / RN)    │
                          └───────┬───────┘    └────────┬────────┘
                                  │                     │
                                  └──────────┬──────────┘
                                             │ HTTPS
                                             │
        ┌────────────────────┐    ┌──────────▼───────────┐    ┌───────────────────┐
        │ ADMIN OPERATIONS   ├────►   FIREBASE CLOUD     ◄────┤  THIRD-PARTY APIs │
        │ Web Admin Panel    │    │   FUNCTIONS GATEWAY  │    │                    │
        │ (Next.js / Vercel) │    │   (Node.js 20 / TS)  │    │ • ID Analyzer      │
        └────────────────────┘    └──────────┬───────────┘    │ • Paykings (NMI)   │
                                             │                │ • Stream Chat      │
                          ┌──────────────────┼────────────┐   │ • SendGrid         │
                          │                  │         p   │   │ • Twilio           │
                  ┌───────▼──────┐  ┌────────▼─────┐ ┌────▼───┴──────┐
                  │  Firestore   │  │  Firebase    │ │  Firebase     │
                  │  (Database)  │  │  Storage     │ │  Auth         │
                  └──────────────┘  └──────────────┘ └───────────────┘

                           ┌──────────────────────────┐
                           │  Cloud Scheduler         │
                           │  (Cron jobs: reminders,  │
                           │   default detection,     │
                           │   nightly settlements)   │
                           └──────────────────────────┘
```

---

## 3. Component Responsibilities

### 3.1 Mobile User App (React Native + Expo)
- All user-facing flows: auth, marketplace, loans, agreements, chat, KYC, payments, analytics
- **Only consumes Cloud Functions** for sensitive operations (no direct Paykings/ID Analyzer calls)
- Real-time Firestore listeners for chat + loan status
- Local persistence: AsyncStorage for auth tokens, theme, drafts

### 3.2 Admin Panel (Next.js 14)
- Internal operations dashboard
- Role-based access (super-admin, operations, finance, support)
- Server Components for data fetching where possible
- Mandatory 2FA
- All admin actions logged to `adminActions/` audit collection

### 3.3 Firebase Cloud Functions (Backend API)
- **Single source of truth** for business rules
- Validates every input with Zod
- Performs all third-party API calls
- Enforces permissions beyond Firestore Rules
- Emits domain events to other functions (Pub/Sub-style)

### 3.4 Firestore (Primary Database)
- NoSQL document store
- Real-time sync via listeners
- Security Rules deny by default; opt-in per collection
- Indexed for all marketplace queries

### 3.5 Firebase Storage
- KYC document uploads (encrypted at rest)
- Signed loan agreement PDFs
- Profile photos
- Bucket-level Security Rules restrict access by owner + admin

### 3.6 Firebase Auth
- Email/password + custom-token guest accounts
- Custom claims for role (`user` / `admin`) + admin tier
- ID token verification on every Cloud Function call

---

## 4. Data Model (Firestore Collections)

```
/users/{userId}
  email, fullName, phone, address, birthday, occupation,
  rating, reviewCount, completedLoans, overdueLoans,
  isVerified, kycSubmissionId, role, notificationsEnabled,
  biometricsEnabled, createdAt, updatedAt

/loans/{loanId}
  type: 'money' | 'item',
  loanerId, borrowerId, status,
  amount, interestRate, installments, installmentFrequency,
  lateFeePerDay, dueDate, returnDate,
  itemTitle, description, condition, deposit, replacementValue,
  notes, agreementId, createdAt, publishedAt

/loanRequests/{requestId}
  borrowerId, amount, purpose, neededByDate,
  repaymentTermMonths, collateral, status, createdAt

/agreements/{agreementId}
  loanId, loanerId, borrowerId,
  loanAmount, interestRate, lateFeePerDay, dueDate,
  terms, loanerSignatureUrl, borrowerSignatureUrl,
  pdfUrl, signedAt

/transactions/{txId}
  loanId, userId, type, direction, amount,
  status, paykingsRef, processedAt, createdAt

/conversations/{convId}
  participantIds[], loanId?, lastMessage, lastMessageAt
  /messages/{msgId}
    senderId, text, attachmentUrl, sentAt, readBy[]

/kycSubmissions/{submissionId}
  userId, idAnalyzerRef, status,
  documents{idUrl, selfieUrl, addressUrl},
  confidenceScore, amlFlag, reviewedBy, reviewedAt

/notifications/{notifId}
  userId, type, title, body, data, read, createdAt

/supportTickets/{ticketId}
  userId, subject, description, status,
  priority, assignedTo, messages[], createdAt

/adminActions/{actionId}
  adminId, action, targetCollection, targetId,
  before, after, ip, userAgent, timestamp

/config/{configKey}
  feePercent, interestCap, minLoan, maxLoan,
  featureFlags, lastUpdatedBy, updatedAt
```

### Key Indexes (firestore.indexes.json)
- `loans` by `status + type + publishedAt DESC`
- `loans` by `loanerId + status + createdAt DESC`
- `loans` by `borrowerId + status + createdAt DESC`
- `loanRequests` by `status + createdAt DESC`
- `transactions` by `userId + createdAt DESC`
- `conversations` by `participantIds (array-contains) + lastMessageAt DESC`
- `notifications` by `userId + read + createdAt DESC`

---

## 5. Security Architecture

### 5.1 Authentication Flow

```
User opens app
   ↓
Firebase Auth check (cached ID token)
   ↓
Token valid? ──No──► Redirect to Login
   ↓ Yes
Decode custom claims (role, kycStatus)
   ↓
Allow access to authorized screens
   ↓
On every API call → Cloud Function verifies ID token + claims
```

### 5.2 Firestore Security Rules (Conceptual)

```javascript
match /users/{uid} {
  allow read: if request.auth.uid == uid || isAdmin();
  allow write: if request.auth.uid == uid;
}

match /loans/{loanId} {
  allow read: if isParticipant(loanId) || isAdmin() || isPublic(resource);
  allow create: if request.auth.uid == request.resource.data.loanerId;
  allow update: if isParticipant(loanId) && validTransition();
}

match /agreements/{agreementId} {
  allow read: if isAgreementParty();
  allow write: if false; // Only via Cloud Function
}

match /transactions/{txId} {
  allow read: if request.auth.uid == resource.data.userId || isAdmin();
  allow write: if false; // Only via Cloud Function
}

match /adminActions/{actionId} {
  allow read: if isAdmin();
  allow write: if false; // Only via Cloud Function
}
```

### 5.3 Storage Security Rules

```
/users/{uid}/profile/*           → owner read/write
/kyc/{uid}/*                     → owner write only, admin read
/agreements/{agreementId}/*      → agreement parties + admin
```

### 5.4 Secret Management
- All third-party API keys stored in Firebase Functions config
- No secrets in client bundle or repo
- Rotation policy: every 90 days
- Production secrets isolated from dev/staging

---

## 6. Integration Architecture

### 6.1 ID Analyzer (KYC)

```
[App] User taps "Start Verification"
  ↓
[Cloud Function] kyc/startVerification
  ↓ POST to ID Analyzer API
[ID Analyzer] Creates DocuPass session
  ↓ returns DocuPass URL
[App] Opens DocuPass URL in WebView
  ↓ user completes ID + selfie + address
[ID Analyzer] Sends webhook to:
[Cloud Function] kyc/webhook
  ↓ verifies signature, updates Firestore:
     users/{uid}.isVerified = true
     kycSubmissions/{id}.status = approved
  ↓ sends push notification to user
```

### 6.2 Paykings (Payments)

```
[App] Borrower hits "Pay $X" on installment
  ↓
[Cloud Function] payments/initiateRepayment
  ↓ POST to NMI Gateway via Paykings credentials
[NMI Gateway] Processes ACH/Card
  ↓ async webhook to:
[Cloud Function] payments/webhook
  ↓ records in transactions/
  ↓ updates loans/{loanId}.balance
  ↓ creates transactions/ for loaner (credit)
  ↓ deducts platform fee → ledger
  ↓ notifies both parties
```

### 6.3 Stream Chat

```
[Cloud Function] auth/createUser
  ↓ on user signup
  ↓ POST to Stream API: create user
  ↓ returns Stream user token
  ↓ stores token in user document (encrypted)
[App] Loads chat with Stream token via Cloud Function
```

### 6.4 Notifications Pipeline

```
[Event Triggered] (loan signed, payment due, message received)
  ↓
[Cloud Function] notifications/dispatch
  ↓ creates Firestore notification doc (in-app feed)
  ↓ sends FCM push (if user opted-in)
  ↓ optionally sends SendGrid email
  ↓ optionally sends Twilio SMS (high-priority only)
```

---

## 7. Critical User Flows

### 7.1 Create Loan & Find Borrower

```
[Loaner] Create Loan form → Publish Loan
   ↓ Cloud Function: loans/create (validates, writes Firestore)
   ↓ Marketplace listing appears
[Borrower] Browse Marketplace → tap loan → Contact Loaner
   ↓ Cloud Function: chat/createConversation
   ↓ Stream Chat thread created
[Both] Negotiate via chat
[Loaner] Initiates Draft Agreement
   ↓ Cloud Function: agreements/draft
[Both] Preview & e-Sign (signature canvas)
   ↓ Cloud Function: agreements/finalize
   ↓ generates PDF (Puppeteer in Cloud Function)
   ↓ uploads to Storage
   ↓ loans/{id}.status = 'pending-disbursement'
[Loaner] Initiates Disbursement
   ↓ Cloud Function: payments/disburse (Paykings ACH)
   ↓ loans/{id}.status = 'active'
   ↓ transactions/ created
   ↓ push + email sent to both parties
```

### 7.2 Loan Repayment Cycle

```
[Cloud Scheduler] daily at 8am UTC
  ↓ Cloud Function: payments/processScheduledRepayments
  ↓ finds loans with installments due today
  ↓ initiates ACH debit via Paykings
[Paykings] webhook → success
  ↓ loans/{id}.balance reduced
  ↓ loans/{id}.nextDueDate advanced
  ↓ transactions/ created (debit + credit)
  ↓ push notifications to both parties
[On failure] retry next day; mark overdue after 3 retries
```

### 7.3 KYC Onboarding

```
[App] User profile → KYC Verification → Start
  ↓ Cloud Function: kyc/startVerification
  ↓ DocuPass URL generated
[WebView] User uploads ID + selfie + address
[ID Analyzer] processes (1-3 seconds)
  ↓ webhook → Cloud Function: kyc/webhook
  ↓ confidence > threshold → auto-approve
  ↓ confidence below threshold → admin manual review queue
[Admin] reviews + approves/rejects
  ↓ user.isVerified = true → "Verified" badge appears
```

---

## 8. Admin Panel Architecture

### 8.1 Authentication
- Separate Firebase Auth project? **No** — same project, custom claim `role: admin`
- Admin URL: `admin.lendlove.com`
- Mandatory 2FA via TOTP (e.g., `firebase-admin` + `speakeasy`)

### 8.2 Data Fetching
- **Server Components** (Next.js App Router) call Cloud Functions with admin token
- **Client Components** use TanStack Query for paginated tables + filters
- No direct Firestore reads from admin client — all via Cloud Functions for audit logging

### 8.3 Audit Logging
- Every admin write action passes through `admin/auditedWrite`:
  1. Validates role
  2. Records before/after to `adminActions/`
  3. Executes the actual change
  4. Returns result

---

## 9. Performance Considerations

| Concern | Mitigation |
|---|---|
| **Cold starts on Cloud Functions** | Use min-instances (=1) on critical functions in prod |
| **Firestore document size** | Keep docs <100KB; offload to subcollections (e.g., messages) |
| **Marketplace pagination** | `limit(20).startAfter(lastDoc)` cursor-based |
| **Chat message volume** | Stream Chat handles scale; never store in Firestore |
| **Mobile bundle size** | Hermes engine + EAS Build optimizations |
| **Image uploads** | Compress to WebP via `expo-image-manipulator` before upload |

---

## 10. Deployment Architecture

### 10.1 Environments

| Env | Firebase Project | Purpose |
|---|---|---|
| **Local** | `lendlove-dev` + emulators | Developer machines |
| **Dev** | `lendlove-dev` | Continuous integration tests |
| **Staging** | `lendlove-staging` | Pre-prod testing, beta builds |
| **Production** | `lendlove-prod` | Live users |

### 10.2 Mobile Distribution

```
Pull Request → GitHub Actions → EAS Build (preview) → Firebase App Distribution
   ↓ on merge to main
EAS Build (staging) → Internal TestFlight + Internal Track
   ↓ on git tag (vX.Y.Z)
EAS Build (production) → App Store Connect + Play Console submission
```

### 10.3 Admin Panel Deployment

```
PR → Vercel preview deployment
main branch → Vercel staging (staging.admin.lendlove.com)
git tag → Vercel production (admin.lendlove.com)
```

### 10.4 Backend Deployment

```
main branch → GitHub Actions → firebase deploy --only functions (staging)
git tag → GitHub Actions → firebase deploy --only functions (prod)
```

---

## 11. Monitoring & Observability

| Layer | Tool | Watches |
|---|---|---|
| **App crashes** | Sentry + Crashlytics | Crash-free user rate, top errors |
| **Cloud Functions** | Google Cloud Logging | Errors, timeouts, cold-start times |
| **API performance** | Sentry tracing | P95 latency per function |
| **User behavior** | Mixpanel + Firebase Analytics | Funnel completions, retention |
| **Uptime** | UptimeRobot | Admin panel + key Cloud Functions |
| **Payment failures** | Custom dashboard in admin panel | Chargebacks, failed ACH retries |

---

## 12. Disaster Recovery

### 12.1 Backups
- **Firestore**: scheduled daily exports to Cloud Storage (90-day retention)
- **Storage**: versioning enabled; 30-day soft delete
- **Code**: GitHub (no single point of failure)
- **Secrets**: Backup in 1Password vault (encrypted)

### 12.2 Recovery Targets
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 24 hours

### 12.3 Incident Response
- PagerDuty rotation for on-call
- Runbooks in `docs/runbooks/`
- Post-incident review template

---

## 13. Compliance Architecture

> **App Store + Play Store compliance is a first-class architectural concern.**
> See [store-compliance.md](store-compliance.md) for the full implementation guide.

### 13.1 PII Handling
- Encrypted at rest (Firestore default + KMS for KYC docs)
- Encrypted in transit (TLS 1.3)
- Access logged via Firestore + admin audit log
- GDPR delete request → Cloud Function chains deletes across all collections

### 13.1a Store Compliance Surface Areas

| Component | Compliance Concern |
|---|---|
| **Sign-up screen** | Age 18+ check, ToS acceptance, Privacy Policy link |
| **Account Settings** | In-app account deletion (two-step) |
| **Create Loan flow** | APR cap enforcement, term floor (≥60 days), TILA disclosure preview |
| **Agreement PDF** | TILA disclosures: APR, finance charge, total of payments, schedule |
| **KYC start** | AML disclosure shown before consent |
| **Chat + Profile** | Report + block on user-generated content |
| **Permissions** | Justification strings in `Info.plist` + `AndroidManifest.xml` |
| **Web pages** | `/privacy`, `/terms`, `/delete-account` hosted before submission |

### 13.2 Financial Compliance
- TILA disclosures embedded in agreement PDFs (APR calculation)
- AML/PEP screening via ID Analyzer on every KYC
- Transaction monitoring rules in Cloud Functions (large amounts, velocity)
- Suspicious Activity Report generation in admin panel

### 13.3 Data Retention
- Active users: indefinite
- Inactive users (>2 years): notified, then anonymized
- Loan records: 7 years (US lending requirement)
- Audit logs: 7 years (immutable)

---

## 14. Scaling Plan

| Stage | Users | Approach |
|---|---|---|
| **0–1k MAU** | Pilot | Firebase free tier sufficient |
| **1k–10k MAU** | Growth | Firebase Blaze plan, optimize indexes |
| **10k–100k MAU** | Scale | Cloud Functions concurrency tuning, read replicas via Firestore |
| **100k+ MAU** | Mature | Consider moving high-volume reads to BigQuery + materialized views |

---

## 15. Open Questions / Future Considerations

- **Credit scoring**: integrate Experian/Equifax for risk-based interest rates?
- **Insurance**: partner with loan insurance providers?
- **Group loans**: multi-loaner funded single loan?
- **International expansion**: multi-currency support, regional KYC providers?
- **Web user app**: do we also build a desktop version of the user app?

---

*Document owner: Engineering*
*Last reviewed: 2026-05-11*
