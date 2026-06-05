# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Lend Love** is a peer-to-peer (P2P) lending platform supporting **money loans and item loans** between individuals. The platform consists of three connected systems in a monorepo:

1. **Mobile User App** (`user-app/`) — React Native + Expo (iOS, Android, Web)
2. **Web Admin Panel** (`admin-panel/`) — Next.js 14 (App Router)
3. **Backend** (`backend/`) — Firebase Cloud Functions (Node.js 20)
4. **Shared** (`shared/`) — TypeScript types, Zod schemas, constants, theme tokens

Both Loaners and Borrowers use the **same mobile app and account**. A user can lend AND borrow simultaneously.

**Current status:** Demo mode on Firebase Spark plan. All paid integrations (Paykings, ID Analyzer, SendGrid, Twilio) are mocked. Set `demoMode: false` in `user-app/app.json` after upgrading to Blaze.

---

## Store Compliance — First-Class Requirement

P2P lending apps are heavily scrutinized. Read [docs/store-compliance.md](docs/store-compliance.md) before building any user-facing feature.

### Non-Negotiable Rules (all implemented)

1. Account deletion — cascade delete with legal retention (`/delete-account`)
2. Privacy Policy + Terms of Service — linked from sign-up ToS toggle + help page
3. Age verification (18+) — DOB field + Zod schema in sign-up
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

Admin config changes propagate to the user app in real-time via Firestore. This is a critical design decision — understand it before modifying validation or feature flags.

```
Admin Config Page (admin-panel)
  → writes to Firestore config/platform
  → PlatformConfigProvider (user-app) listens via onSnapshot
  → Dynamic Zod schemas use runtime config values
  → Cloud Function reads config before validating loans
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
- `mobile.chatAttachments` — reserved for chat image uploads
- `compliance.requireKycForBorrowing` — blocks unverified borrowers
- `compliance.requireKycForLending` — blocks unverified lenders
- `compliance.amlScreeningEnforced` — routes flagged users to review
- `integrations.paykings.enabled` — enables real payment processing
- `integrations.idAnalyzer.enabled` — enables real KYC verification
- `integrations.streamChat.enabled` — enables Stream Chat at scale
- `maintenance.readOnlyMode` — blocks all creates with maintenance message

---

## Admin Tier Enforcement

Admin tiers restrict which pages and actions each admin role can access. Defined in `admin-panel/src/lib/auth-context.tsx`.

| Page | super | operations | finance | support |
|------|-------|-----------|---------|---------|
| Dashboard | yes | yes | yes | yes |
| Users | yes | yes | - | yes |
| KYC Queue | yes | yes | - | yes |
| Loans | yes | yes | yes | - |
| Agreements | yes | yes | yes | - |
| Reports | yes | - | yes | - |
| Audit Log | yes | - | - | - |
| Config | yes | - | - | - |

Sidebar nav items are filtered by tier. Unauthorized pages show a "Access Restricted" message.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Mobile** | React Native (Expo SDK 51+) + TypeScript |
| **Admin Web** | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| **Backend** | Firebase Cloud Functions (Node.js 20 + TypeScript) |
| **Database** | Firestore (12 collections, 11 composite indexes) |
| **Auth** | Firebase Authentication (email/password + anonymous demo) |
| **Storage** | Firebase Storage (KYC docs, signatures, profiles) |
| **State (mobile)** | Zustand (auth) + TanStack Query (server state) |
| **State (web)** | TanStack Query |
| **Validation** | Zod schemas (shared + dynamic) |
| **Charts (mobile)** | Custom (react-native-svg based, no external chart library) |
| **Chat** | Firestore real-time (Stream Chat ready for scale) |
| **KYC** | ID Analyzer DocuPass (mocked in demo, auto-approves) |
| **Payments** | Paykings + NMI Gateway (not yet integrated, needs Blaze) |

---

## Common Commands

```bash
# Root (runs all workspaces)
npm install              # Install all packages
npm run emulators        # Start Firebase emulators
npm run mobile           # Start user-app Expo dev server
npm run admin            # Start admin-panel Next.js dev (localhost:3000)
npm run typecheck        # Typecheck all packages
npm run lint             # Lint all packages

# User App
cd user-app
npm run start            # Expo dev server
npm run ios              # iOS simulator
npm run android          # Android emulator
npm run web              # Web browser

# Admin Panel
cd admin-panel
npm run dev              # localhost:3000
npm run build            # Production build

# Backend
cd backend/functions
npm run build            # Compile TypeScript
npm run serve            # Build + emulators

# Deploy
npm run deploy:rules     # Firestore + Storage rules
npm run deploy:functions # Cloud Functions
```

---

## Environment Variables

Firebase credentials are read from `.env` files (not hardcoded in source).

### Mobile App (`user-app/.env`)
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Admin Panel (`admin-panel/.env.local`)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Backend (Firebase Functions Config)
```bash
firebase functions:config:set \
  idanalyzer.api_key="..." \
  paykings.api_key="..." \
  paykings.gateway_id="..." \
  sendgrid.api_key="..." \
  twilio.account_sid="..." \
  twilio.auth_token="..."
```

---

## Firestore Security Rules

Rules are in `backend/firestore.rules` (200+ lines). They enforce:

- **Auth checks** — owner, admin, participant validation per collection
- **Data validation** — field types, ranges (amount > 0, APR 0-36%, text length limits)
- **Immutability** — loanerId cannot change after creation, agreement terms locked after creation
- **Demo mode** — `isDemoMode()` function checks if Paykings integration is disabled; transaction creates are only allowed in demo mode
- **14 collections covered**: users, loans, loanRequests, agreements, transactions, conversations, messages, kycSubmissions, notifications, supportTickets, adminActions, config, reports, blockedUsers

---

## Key Files

### Platform Config System
- `user-app/src/hooks/usePlatformConfig.ts` — Real-time config provider
- `user-app/src/services/dynamic-schemas.ts` — Dynamic Zod schema factory
- `admin-panel/src/lib/config-service.ts` — Config CRUD + audit

### Auth & Permissions
- `user-app/src/store/auth.ts` — Zustand auth store
- `admin-panel/src/lib/auth-context.tsx` — Auth provider + `useRequireAdmin()` + `useAdminTierAccess()`

### Moderation
- `user-app/src/components/ReportModal.tsx` — Report content modal (5 reasons)
- `user-app/src/services/moderation.ts` — Block/unblock user service

### Error Handling
- `user-app/src/components/ErrorBoundary.tsx` — Global crash boundary
- `user-app/src/components/OfflineBanner.tsx` — Network status banner

### UX Components
- `user-app/src/components/SkeletonCard.tsx` — Shimmer loading cards
- `user-app/src/components/SignaturePad.tsx` — SVG signature capture

### Cloud Functions (4 total)
- `backend/functions/src/auth/onCreateUser.ts` — Profile bootstrap
- `backend/functions/src/loans/createLoan.ts` — Dynamic validation from config
- `backend/functions/src/users/deleteAccount.ts` — GDPR cascade delete
- `backend/functions/src/admin/setRole.ts` — Admin promotion (super-admin only)

---

## CI/CD

GitHub Actions workflow in `.github/workflows/ci.yml`:
- **On PR/push to main**: Typecheck all 3 packages (user-app, admin-panel, backend/functions)
- **On push to main**: Deploy Firestore/Storage rules + Cloud Functions (requires `FIREBASE_TOKEN` secret)

---

## Coding Conventions

- **Strict TypeScript** — no `any`, use `unknown` if truly unknown
- **Zod validation** at all API boundaries (client forms + Cloud Functions)
- **Dynamic config** — never hardcode compliance values (APR cap, loan limits). Use `usePlatformConfig()` hook or read from `config/platform` Firestore doc
- **Feature flags** — check via `flag('mobile.itemLoans')` from `usePlatformConfig()`, not hardcoded booleans
- **Firestore queries** — always use `where` + `orderBy` with indexes, paginate with `startAfter()`, use `limit()` on every query
- **Accessibility** — add `accessibilityRole` and `accessibilityLabel` to all interactive elements
- **Named exports** for components, one component per file
- **Server state in TanStack Query**, local UI state in Zustand — never put server data in Zustand

---

## Workflow: Adding a New Feature

1. Define types in `shared/src/types.ts`
2. Add Zod schema in `shared/src/schemas.ts` (or dynamic schema in `user-app/src/services/dynamic-schemas.ts` if it needs config values)
3. Implement Cloud Function in `backend/functions/src/`
4. Update `backend/firestore.rules` with data validation
5. Add client service in `user-app/src/services/`
6. Build UI screen in `user-app/app/`
7. If admin-visible, add admin page in `admin-panel/src/app/(admin)/`
8. Run `npm run typecheck` across all packages before committing

---

## What's Not Yet Built (Needs Blaze Plan)

These features are architecturally ready but require Firebase Blaze upgrade + API credentials:

- **Paykings payment processing** — Transaction model exists, feature flag ready, Cloud Function stub needed
- **ID Analyzer real KYC** — Currently auto-approves in demo, production calls DocuPass API
- **SendGrid email notifications** — Notification types defined, delivery functions not built
- **Twilio SMS alerts** — Same as above
- **FCM push notifications** — expo-notifications not yet installed
- **Scheduled overdue checker** — Needs Blaze for scheduled functions

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

*Last updated: 2026-06-05*
