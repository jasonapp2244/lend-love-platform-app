# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Lend Love** is a peer-to-peer (P2P) lending platform supporting **money loans and item loans** between individuals. The platform consists of three connected systems in a monorepo:

1. **Mobile User App** (`user-app/`) — React Native + Expo (iOS, Android, Web) — 20 screens
2. **Web Admin Panel** (`admin-panel/`) — Next.js 14 (App Router) — 14 pages
3. **Backend** (`backend/`) — Firebase Cloud Functions (Node.js 20) — 4 functions
4. **Shared** (`shared/`) — TypeScript types, Zod schemas, constants, theme tokens

Both Loaners and Borrowers use the **same mobile app and account**. A user can lend AND borrow simultaneously.

**Current status:** Demo mode on Firebase Spark plan. All paid integrations (Paykings, ID Analyzer, SendGrid, Twilio) are mocked. Set `demoMode: false` in `user-app/app.json` after upgrading to Blaze.

---

## Store Compliance — First-Class Requirement

P2P lending apps are heavily scrutinized. Read [docs/store-compliance.md](docs/store-compliance.md) before building any user-facing feature.

### Non-Negotiable Rules (all implemented)

1. Account deletion — cascade delete with legal retention (`/delete-account`)
2. Privacy Policy + Terms of Service — linked from sign-up ToS toggle + help page
3. Age verification (18+) — DOB field + Zod schema + email verification on sign-up
4. APR caps (36%) — dynamic from admin config, enforced in client + Cloud Function + Firestore rules
5. Loan term minimum (60 days) — dynamic from admin config
6. TILA disclosures — APR, finance charge, total of payments in every agreement
7. AML disclosure — shown before KYC starts
8. Report + Block — ReportModal component + block service on chat, profiles, listings
9. Permission justification — iOS `NSUsageDescription` + Android permissions in app.json
10. No misleading terms — never call loans "credits", "tokens", "coins"
11. No Apple IAP / Google Play Billing — uses Paykings (external payment processor)
12. Demo account for reviewers — Guest Loaner + Guest Borrower with pre-seeded data
13. Crash protection — ErrorBoundary wraps entire app
14. Accessibility — labels on Button, Input, Toggle, LoanCard, TabBar
15. Target Android API 34+, iOS 15+

---

## Architecture: Dynamic Platform Config

Admin config changes propagate to the user app in real-time via Firestore.

```
Admin Config Page (admin-panel)
  -> writes to Firestore config/platform
  -> PlatformConfigProvider (user-app) listens via onSnapshot
  -> Dynamic Zod schemas use runtime config values
  -> Cloud Function reads config before validating loans
```

**Key files:**
- `user-app/src/hooks/usePlatformConfig.ts` — React Context + real-time Firestore listener
- `user-app/src/services/dynamic-schemas.ts` — Schema factory using config values
- `admin-panel/src/lib/config-service.ts` — Read/write platform config
- `backend/functions/src/loans/createLoan.ts` — Reads config/platform before validation

**Feature flags** (11 total, all wired to user app):
- `mobile.itemLoans` — hides/shows Items tab + item loan toggle
- `mobile.borrowerRequests` — hides/shows Requests tab
- `mobile.biometricLogin` — hides/shows biometric toggle in settings
- `mobile.chatAttachments` — controls chat image attachment button
- `compliance.requireKycForBorrowing` — blocks unverified borrowers
- `compliance.requireKycForLending` — blocks unverified lenders
- `compliance.amlScreeningEnforced` — routes flagged users to review
- `integrations.paykings.enabled` — enables real payment processing + payment UI
- `integrations.idAnalyzer.enabled` — enables real KYC verification
- `integrations.streamChat.enabled` — enables Stream Chat at scale
- `maintenance.readOnlyMode` — blocks all creates with maintenance message

---

## Admin Tier Enforcement

Admin tiers restrict which pages each admin role can access. Defined in `admin-panel/src/lib/auth-context.tsx`.

| Page | super | operations | finance | support |
|------|-------|-----------|---------|---------|
| Dashboard | yes | yes | yes | yes |
| Users | yes | yes | - | yes |
| KYC Queue | yes | yes | - | yes |
| Loans | yes | yes | yes | - |
| Agreements | yes | yes | yes | - |
| Transactions | yes | - | yes | - |
| Moderation | yes | yes | - | yes |
| Support Tickets | yes | yes | - | yes |
| Reports | yes | - | yes | - |
| Notifications | yes | yes | - | - |
| Compliance | yes | - | - | - |
| Audit Log | yes | - | - | - |
| Config | yes | - | - | - |

Sidebar nav items (13 total) are filtered by tier. Unauthorized pages show "Access Restricted".

---

## User App Screens (20 total)

| Screen | Route | Key Features |
|--------|-------|-------------|
| Welcome/Login | `/welcome` | Email/password, Forgot Password, Guest demo buttons |
| Sign Up | `/sign-up` | Full name, email, password, DOB (18+), ToS toggle, email verification |
| Home | `/(tabs)/home` | Stats, quick actions, active loans, notification bell with badge |
| Marketplace | `/(tabs)/marketplace` | 3 tabs (Money/Items/Requests), search, infinite scroll |
| My Loans | `/(tabs)/my-loans` | Lending/Borrowing tabs, skeleton loaders |
| Chat | `/(tabs)/chat` | Real-time messages, image attachments, report/block menu |
| Profile | `/(tabs)/profile` | Rating, verified badge, menu links |
| Create Loan | `/create-loan` | Money/Item toggle, dynamic validation from admin config |
| Request Loan | `/request-loan` | Amount, purpose, term, collateral |
| Loan Detail | `/loan/[id]` | Full details, contact, draft agreement, leave review (completed loans) |
| Analytics | `/analytics` | KPI cards, donut chart, status bars, lending vs borrowing |
| Transactions | `/transactions` | Transaction history list |
| Agreements | `/agreements` | Agreement list with self-loan detection |
| KYC | `/kyc` | 3-step flow (ID, selfie, address), AML disclosure |
| Account Settings | `/account-settings` | Edit profile, notifications toggle, biometrics toggle |
| Notifications | `/notifications` | Notification list with read/unread state, badge count |
| Payment Methods | `/payment-methods` | Add card/bank (Paykings-ready), demo banner |
| Repayment | `/repayment` | Loan summary, pay now, auto-pay setup |
| Help | `/help` | Support, privacy, terms links |
| Delete Account | `/delete-account` | Warning, cascade delete, DELETE confirmation |

---

## Admin Panel Pages (14 total)

| Page | Route | Key Features |
|------|-------|-------------|
| Login | `/login` | Email/password + Demo Admin button |
| Dashboard | `/dashboard` | 7 KPI cards (users, loans, value, overdue, default rate, avg loan, verified rate), loan types, marketplace |
| Users | `/users` | Search, filter, verify/suspend, detail panel |
| KYC Queue | `/kyc` | Filter by status, approve/reject/flag, document viewer |
| Loans | `/loans` | 16 loans, status filters, admin notes, agreement viewer |
| Agreements | `/agreements` | TILA data, signatures, filters (all/signed/pending) |
| Transactions | `/transactions` | Status filters, volume stats, color-coded amounts |
| Moderation | `/moderation` | Content reports, Take Action/Dismiss with audit |
| Support Tickets | `/tickets` | Priority badges, message thread, admin reply, resolve/close |
| Reports | `/reports` | Date filters, KPIs, KYC funnel, 5 CSV exports, top loaners/borrowers |
| Notifications | `/notifications` | Broadcast form, audience selector (all/verified/unverified/admin) |
| Compliance | `/compliance` | 3 tabs: AML flags, GDPR/suspensions, suspicious activity |
| Audit Log | `/audit` | Search, category filters, before/after values, IP address |
| Config | `/config` | 11 feature flags, 6 numeric settings, compliance banner |

---

## Key Services & Components

### Auth & Security
- `user-app/src/services/auth.ts` — Sign in/up, email verification, guest demo
- `user-app/src/services/biometrics.ts` — FaceID/fingerprint via expo-local-authentication
- `user-app/src/services/push-notifications.ts` — FCM token registration, foreground handler
- `admin-panel/src/lib/audit.ts` — Audit logging with IP capture

### Moderation & Reviews
- `user-app/src/components/ReportModal.tsx` — Report content (5 reasons)
- `user-app/src/components/ReviewModal.tsx` — 5-star rating + comment
- `user-app/src/services/moderation.ts` — Block/unblock users
- `user-app/src/services/reviews.ts` — Submit review, update aggregate rating

### Chat
- `user-app/src/services/chat.ts` — Real-time messages, attachments, counterparty name resolution
- Image attachments upload to `chat/{convId}/` in Firebase Storage

### Payments (Paykings-ready)
- `user-app/app/payment-methods.tsx` — Card/bank forms, gated by `integrations.paykings.enabled`
- `user-app/app/repayment.tsx` — Loan summary, pay now, auto-pay setup

### Error Handling & UX
- `user-app/src/components/ErrorBoundary.tsx` — Global crash boundary
- `user-app/src/components/OfflineBanner.tsx` — Network status detection
- `user-app/src/components/SkeletonCard.tsx` — Shimmer loading cards

### Cloud Functions (4 total)
- `backend/functions/src/auth/onCreateUser.ts` — Profile bootstrap
- `backend/functions/src/loans/createLoan.ts` — Dynamic validation from config
- `backend/functions/src/users/deleteAccount.ts` — GDPR cascade delete
- `backend/functions/src/admin/setRole.ts` — Admin promotion (super-admin only)

---

## CI/CD

GitHub Actions workflow in `.github/workflows/ci.yml`:
- **On PR/push to main**: Typecheck all 3 packages
- **On push to main**: Deploy Firestore/Storage rules + Cloud Functions (requires `FIREBASE_TOKEN` secret)

---

## Environment Variables

Firebase credentials are read from `.env` files (not hardcoded in source). See `.env.example` in both `user-app/` and `admin-panel/`.

---

## Coding Conventions

- **Strict TypeScript** — no `any`, use `unknown` if truly unknown
- **Zod validation** at all API boundaries (client forms + Cloud Functions)
- **Dynamic config** — never hardcode compliance values. Use `usePlatformConfig()` or Firestore `config/platform`
- **Feature flags** — check via `flag('key')` from `usePlatformConfig()`, not hardcoded booleans
- **Firestore queries** — always use `where` + `orderBy` with indexes, paginate with `startAfter()`, use `limit()`
- **Accessibility** — add `accessibilityRole` and `accessibilityLabel` to all interactive elements
- **Named exports** for components, one component per file
- **Server state in TanStack Query**, local UI state in Zustand

---

## What Needs External Setup (Not Code)

| Item | What's Needed |
|------|--------------|
| Firebase Blaze upgrade | Billing setup (pay-as-you-go, free tier included) |
| Paykings merchant account | Business registration + API credentials |
| ID Analyzer account | Paid subscription + API key |
| Privacy Policy hosting | Domain + page at lendlove.com/privacy |
| Terms of Service hosting | Domain + page at lendlove.com/terms |
| FIREBASE_TOKEN secret | GitHub secret for CI/CD deployment |
| Set demoMode: false | In user-app/app.json after Blaze upgrade |

---

## Don'ts

- Don't put API keys in client source code — use `.env` files
- Don't hardcode compliance values — read from `usePlatformConfig()` or Firestore `config/platform`
- Don't bypass Cloud Functions for payment/KYC calls
- Don't fetch unbounded Firestore queries — always use `limit()`
- Don't skip Firestore data validation in rules
- Don't commit `.env` or `.env.local` files
- Don't use Apple IAP or Google Play Billing for loans
- Don't call loans "credits", "tokens", "coins"
- Don't ship UGC features without report + block
- Don't add features without checking the feature flag system first

---

*Last updated: 2026-06-06*
