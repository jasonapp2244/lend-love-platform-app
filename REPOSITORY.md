# Lend Love™ Platform — Repository Guide

> **Repo:** [github.com/alanpaul5433-gif/lend-love-platform](https://github.com/alanpaul5433-gif/lend-love-platform)
> **Visibility:** Public · `main` branch · Tag `v0.1.0-phase1`
> **Stack:** React Native + Expo · Next.js 14 · Firebase · TypeScript

A peer-to-peer lending platform supporting both money and item loans, with a mobile user app, web admin panel, and Firebase backend. Currently runs in **DEMO MODE** on the Firebase Spark (free) plan with paid integrations mocked, so the entire feature set is demoable before upgrading to Blaze.

---

## Table of Contents

1. [Repository at a Glance](#repository-at-a-glance)
2. [Top-Level Structure](#top-level-structure)
3. [Mobile User App (`user-app/`)](#mobile-user-app-user-app)
4. [Web Admin Panel (`admin-panel/`)](#web-admin-panel-admin-panel)
5. [Firebase Backend (`backend/`)](#firebase-backend-backend)
6. [Shared Package (`shared/`)](#shared-package-shared)
7. [Documentation (`docs/`)](#documentation-docs)
8. [AI Engineering Agents (`.claude/agents/`)](#ai-engineering-agents-claudeagents)
9. [Root-Level Files](#root-level-files)
10. [Stats](#stats)
11. [What's Gitignored (Not in Repo)](#whats-gitignored-not-in-repo)
12. [Clone & Run](#clone--run)
13. [Brand Assets](#brand-assets)
14. [Firebase Project Reference](#firebase-project-reference)

---

## Repository at a Glance

| Property | Value |
|---|---|
| **Owner** | `alanpaul5433-gif` |
| **Name** | `lend-love-platform` |
| **Visibility** | 🌍 Public |
| **Default branch** | `main` |
| **Latest tag** | `v0.1.0-phase1` |
| **Commit count** | 4 |
| **License** | None yet (consider adding MIT/Apache) |
| **Description** | Lend Love™ peer-to-peer lending platform — React Native mobile app + Next.js admin panel + Firebase backend |

---

## Top-Level Structure

```
lend-love-platform/
├── user-app/          → React Native + Expo SDK 51 mobile app (iOS + Android)
├── admin-panel/       → Next.js 14 web admin dashboard
├── backend/           → Firebase Cloud Functions, Firestore rules, indexes
├── shared/            → Shared types, Zod schemas, theme tokens (workspace pkg)
├── docs/              → Architecture + store-compliance guides
├── .claude/agents/    → 5 specialized AI engineering agents
├── Loaner UI/         → 20 original mobile mockup screenshots (Loaner)
├── Borrower UI/       → 16 original mobile mockup screenshots (Borrower)
├── CLAUDE.md          → Developer conventions + non-negotiable compliance rules
├── README.md          → Setup + run instructions
├── REPOSITORY.md      → This file
└── Lend Love - Project Document.pdf  → Stakeholder package
```

---

## Mobile User App (`user-app/`)

React Native + Expo SDK 51 + TypeScript. File-based routing via **Expo Router**.

### Screens (`user-app/app/`)

```
app/
├── _layout.tsx                       # Root nav + AuthProvider + ThemeProvider + QueryClient
├── index.tsx                         # Auth-gate redirect (welcome or tabs)
│
├── (auth)/                           # Pre-auth routes
│   ├── welcome.tsx                   # Email/password login + Guest Loaner/Borrower
│   └── sign-up.tsx                   # Sign-up form (placeholder)
│
├── (tabs)/                           # Bottom-tab navigation (Apple HIG)
│   ├── _layout.tsx                   # Ionicons tab bar (outlined/filled)
│   ├── home.tsx                      # Stats + Quick Actions + Active Loans
│   ├── marketplace.tsx               # Money / Items / Requests tabs + search + pull-to-refresh
│   ├── my-loans.tsx                  # Lending + Borrowing tabs + Create Loan FAB
│   ├── chat.tsx                      # Real-time conversation list
│   └── profile.tsx                   # Profile + 6-item menu + Logout
│
├── loan/[id].tsx                     # Loan detail with Contact + Draft Agreement
├── request/[id].tsx                  # Loan request detail
├── chat/[id].tsx                     # Conversation with real-time messages
│
├── agreement/
│   ├── draft/[loanId].tsx            # Draft Agreement form (TILA fields)
│   └── sign/[agreementId].tsx        # Preview + signature canvas + PDF generation
│
├── create-loan.tsx                   # Create Loan (money OR item)
├── request-loan.tsx                  # Borrower posts loan request
├── kyc.tsx                           # 3-step KYC flow (ID + selfie + address)
│
├── account-settings.tsx              # Edit profile + Notifications + Biometrics toggle
├── delete-account.tsx                # GDPR/CCPA two-step deletion
│
├── analytics.tsx                     # Personal stats grid
├── transactions.tsx                  # Transaction history
├── agreements.tsx                    # Signed agreements list
└── help.tsx                          # Support + Privacy + Terms links
```

**23 screens total.**

### Source (`user-app/src/`)

```
src/
├── components/
│   ├── Button.tsx                    # Primary / secondary / outline / ghost / danger variants
│   ├── Input.tsx                     # Text input with label + error states
│   ├── Toggle.tsx                    # iOS-style animated switch
│   ├── DateField.tsx                 # Cross-platform date picker
│   ├── Picker.tsx                    # Modal-based select
│   ├── TypeToggle.tsx                # Money / Item selector
│   ├── TabBar.tsx                    # Reusable tab strip
│   ├── Badge.tsx                     # Status pill (success/warning/danger/neutral)
│   ├── EmptyState.tsx                # Empty list illustration
│   ├── HeartLogo.tsx                 # Brand mark (HeartLogo + FullLogo)
│   ├── LoanCard.tsx                  # Money + item loan card
│   ├── LoanRequestCard.tsx           # Borrower request card
│   ├── SignaturePad.tsx              # SVG-backed signature capture
│   └── StepIndicator.tsx             # KYC 3-step progress
│
├── services/
│   ├── firebase.ts                   # Firebase client init (lazy)
│   ├── auth.ts                       # Sign in/up + Guest demo
│   ├── users.ts                      # updateProfile + deleteAccount cascade
│   ├── loans.ts                      # CRUD + marketplace queries
│   ├── agreements.ts                 # Create draft + sign + TILA HTML PDF
│   ├── chat.ts                       # Firestore real-time messaging
│   ├── kyc.ts                        # Document upload + auto-approve (demo)
│   └── demo-seed.ts                  # Idempotent guest-account seeder
│
├── hooks/
│   └── useMarketplace.ts             # TanStack Query hooks
│
├── store/
│   └── auth.ts                       # Zustand auth state
│
├── theme/
│   └── ThemeProvider.tsx             # Dark/Light theme switcher
│
├── shared/                           # Inlined shared package (see below)
│
├── utils/
│   └── format.ts                     # formatMoney, formatDate, monthsBetween
│
└── config/
    └── env.ts                        # Firebase config + DEMO_MODE flag
```

### Assets (`user-app/assets/`)

| File | Purpose | Size |
|---|---|---|
| `icon.png` | App icon (1024×1024) | Heart-$ on green tile |
| `adaptive-icon.png` | Android adaptive icon | Same as icon |
| `favicon.png` | Web preview (48×48) | Mini mark |
| `splash.png` | Splash screen (1242×2688) | Full wordmark on black |
| `logo-mark.png` | In-app compact mark | 256×256 |
| `logo-full.png` | Welcome screen wordmark | 1850×1310 |

### Config

| File | Purpose |
|---|---|
| `app.json` | Expo config — bundle ID `com.lendlove.app`, permissions, plugins |
| `eas.json` | EAS Build profiles — `preview` (APK), `staging` (APK), `production` (AAB) |
| `babel.config.js` | `babel-preset-expo` |
| `tsconfig.json` | TypeScript strict mode |
| `package.json` | Dependencies + scripts |

---

## Web Admin Panel (`admin-panel/`)

Next.js 14 (App Router) + Tailwind CSS + TanStack Query.

### Pages (`admin-panel/src/app/`)

```
app/
├── layout.tsx                        # Root + QueryProvider + AuthProvider
├── page.tsx                          # Auth-gate redirect
│
├── login/page.tsx                    # Email/password + "Continue as Demo Admin"
├── not-authorized/page.tsx           # Non-admin signed-in users
│
└── (admin)/                          # Authenticated admin routes
    ├── layout.tsx                    # Sidebar navigation
    ├── dashboard/page.tsx            # Live KPI strip + loan-types chart
    ├── users/page.tsx                # User table + search/filter + verify/suspend
    ├── kyc/page.tsx                  # KYC review queue + document viewer
    ├── loans/page.tsx                # All loans + status changes + admin notes
    ├── reports/page.tsx              # Date-range KPIs + 5 CSV exports
    ├── audit/page.tsx                # Immutable audit log + expandable diff
    └── config/page.tsx               # Platform settings + 12 feature flags
```

**9 admin pages + 2 auth routes.**

### Lib (`admin-panel/src/lib/`)

```
lib/
├── firebase.ts                       # Firebase client (lazy getters)
├── auth.ts                           # Email sign-in + Demo Admin
├── auth-context.tsx                  # AuthProvider + useRequireAdmin
├── query-provider.tsx                # TanStack Query setup
├── admin-service.ts                  # User management + dashboard KPIs
├── kyc-service.ts                    # Approve/reject/flag KYC
├── loan-service.ts                   # Loan management + admin notes
├── audit.ts                          # `audit()` helper for every admin action
├── audit-service.ts                  # Audit log fetching
├── reports-service.ts                # KYC funnel + CSV export helpers
├── config-service.ts                 # Platform config CRUD with diff audit
└── format.ts                         # formatMoney, formatDate, formatDateTime
```

### Components (`admin-panel/src/components/`)

```
components/
├── Toggle.tsx                        # Switch for feature flags
└── LoanStatusBadge.tsx               # 9-status color-coded badge
```

### Config

| File | Purpose |
|---|---|
| `next.config.mjs` | Next.js config + `transpilePackages` |
| `tailwind.config.ts` | Brand color palette tokens |
| `tsconfig.json` | TypeScript strict mode |
| `postcss.config.mjs` | Tailwind/Autoprefixer |

---

## Firebase Backend (`backend/`)

```
backend/
├── firestore.rules                   # Security rules — owner/admin/demo checks
├── firestore.indexes.json            # 11 deployed composite indexes
├── storage.rules                     # Per-user KYC + signature paths
└── functions/
    ├── package.json                  # Node 20 + firebase-admin + firebase-functions
    ├── tsconfig.json
    └── src/
        ├── index.ts                  # Exports all functions
        ├── lib/errors.ts             # HttpsError helpers
        ├── auth/
        │   └── onCreateUser.ts       # Profile bootstrap on signup
        ├── loans/
        │   └── createLoan.ts         # Loan create w/ APR + term compliance
        ├── users/
        │   └── deleteAccount.ts      # GDPR/CCPA cascade delete
        └── admin/
            └── setRole.ts            # Custom claims for admin promotion
```

### Firestore Collections

| Collection | Purpose |
|---|---|
| `users/{uid}` | User profile, role, KYC status |
| `loans/{id}` | Money + item loans |
| `loanRequests/{id}` | Borrower-posted loan requests |
| `agreements/{id}` | Signed loan agreements with TILA fields |
| `transactions/{id}` | Disbursements + repayments + fees |
| `conversations/{id}/messages/{id}` | Real-time chat |
| `kycSubmissions/{id}` | KYC documents + AML flags |
| `notifications/{id}` | In-app notifications |
| `supportTickets/{id}` | Help requests |
| `adminActions/{id}` | Immutable audit log |
| `config/platform` | Platform settings + feature flags |
| `reports/{id}` | User-flagged content reports |

### Storage Paths

| Path | Access |
|---|---|
| `users/{uid}/profile/*` | Owner read/write |
| `kyc/{uid}/*` | Owner write; admin read |
| `signatures/{uid}/*` | Owner write; participant read |
| `agreements/{id}/*` | Cloud Functions only |

---

## Shared Package (`shared/`)

Workspace package consumed by all three apps. Also inlined into `user-app/src/shared/` for EAS Build compatibility.

```
shared/src/
├── index.ts                          # Re-exports
├── types.ts                          # Domain types
├── schemas.ts                        # Zod schemas with compliance guards
├── constants.ts                      # Brand + compliance + demo constants
└── theme.ts                          # Color tokens + spacing + typography
```

### Compliance Constants (Hardcoded)

```ts
export const COMPLIANCE = {
  MIN_AGE: 18,                        // Legal contract requirement
  MAX_APR_PERCENT: 36,                // Google Play Personal Loan Policy
  MIN_LOAN_TERM_DAYS: 60,             // Google Play minimum
  TILA_REQUIRED_FIELDS: [...]
};
```

### Brand Tokens

```ts
brandColors:
  primary       #3D9A2E   (Lend Green)
  primaryLight  #5DBF3F
  primaryDark   #236E16
  secondary     #F5A800   (Lend Gold)
  danger        #D32F2F   (Heart Red)
```

---

## Documentation (`docs/`)

| File | Content |
|---|---|
| `architecture.md` | System diagram, data model, security, integration flows, scaling plan |
| `store-compliance.md` | Apple + Google approval-on-first-attempt guide; per-engineer checklists |

---

## AI Engineering Agents (`.claude/agents/`)

5 specialized agents with detailed system prompts:

| Agent | Domain |
|---|---|
| `frontend-engineer.md` | React Native mobile + Next.js admin UI |
| `backend-engineer.md` | Cloud Functions + Firestore + security rules |
| `integrations-engineer.md` | Paykings, ID Analyzer, Stream Chat, SendGrid, Twilio |
| `qa-engineer.md` | Unit / integration / E2E / compliance tests |
| `devops-engineer.md` | CI/CD, EAS Build, app-store submission |

Each agent includes scope, coding standards, definition-of-done, anti-patterns, and handoff rules.

---

## Root-Level Files

| File | Purpose |
|---|---|
| `CLAUDE.md` | Developer guide — conventions, tech stack, **non-negotiable compliance rules** |
| `README.md` | Setup + run instructions |
| `REPOSITORY.md` | This file |
| `Lend Love - Project Document.pdf` | Stakeholder package (branded PDF) |
| `Lend Love - Project Document.md` | Same content as markdown source |
| `firebase.json` | Firebase project config |
| `package.json` | npm workspaces root |
| `package-lock.json` | npm lockfile |
| `.firebaserc` | Firebase project alias (`lend-love`) |
| `.gitignore` | Excludes `node_modules`, `.env`, builds |
| `generate-logo.js` | Brand asset generator (SVG → PNG via sharp) |
| `generate-pdf.js` | Stakeholder PDF generator (Markdown → PDF) |

### Mockup Folders

| Folder | Content |
|---|---|
| `Loaner UI/` | 20 original Loaner mobile mockup screenshots |
| `Borrower UI/` | 16 original Borrower mobile mockup screenshots |

---

## Stats

| Metric | Value |
|---|---|
| Mobile screens | 23 |
| Admin pages | 9 |
| React components | ~30 |
| Service modules | 15 |
| Cloud Function entry points | 4 (scaffolded for Blaze) |
| Firestore collections | 12 |
| Firestore composite indexes | 11 |
| Specialized AI agents | 5 |
| Brand asset PNGs | 6 |
| Documentation files | 4 |
| Total commits | 4 |
| Tag | `v0.1.0-phase1` |

---

## What's Gitignored (Not in Repo)

```
node_modules/                # Dependencies — install with `npm install`
.env, .env.local             # Secrets — none committed
.expo/, .next/, dist/        # Build outputs
ios/, android/               # Native projects — Expo handles via EAS
.claude/settings.local.json  # Per-user permission state
*.keystore, *.p12            # Signing certificates
serviceAccountKey*.json      # Firebase Admin SDK keys
```

### Secret Posture

| Item | Status |
|---|---|
| Firebase Web API Key (`src/config/env.ts`) | ✅ Public-safe (always exposed to clients, protected by security rules) |
| `.env*` files | ✅ None committed |
| Service account keys | ✅ None committed |
| Demo passwords | ⚠️ Visible in `shared/constants.ts` (intentional — not real auth) |

---

## Clone & Run

```bash
# Clone
git clone https://github.com/alanpaul5433-gif/lend-love-platform.git
cd lend-love-platform

# Install all workspaces
npm install

# Run mobile (Expo)
npm run mobile          # then press 'a' for Android emulator,
                        # 'w' for web preview, or scan QR with Expo Go

# Run admin panel (Next.js)
npm run admin           # opens at http://localhost:3000

# Run Firebase emulators (optional)
npm run emulators       # opens UI at http://localhost:4000

# Build mobile APK via EAS (requires Expo account)
cd user-app
eas build --platform android --profile preview
```

### Demo Account Credentials

| Account | Email | Password |
|---|---|---|
| Guest Loaner | `guest.loaner@demo.app` | `demo-mode-no-validation` |
| Guest Borrower | `guest.borrower@demo.app` | `demo-mode-no-validation` |
| Demo Admin | (auto-created via "Continue as Demo Admin" button) | — |

The mobile Welcome screen and admin Login page both expose one-click Demo buttons that handle the credentials automatically.

---

## Brand Assets

Generated by `generate-logo.js` (SVG → PNG via `sharp`):

| Color | Hex | Usage |
|---|---|---|
| Lend Green | `#3D9A2E` | Primary buttons, active states, success |
| Lime Green | `#5DBF3F` | Gradient top, highlights |
| Forest Green | `#236E16` | Gradient bottom, pressed states |
| Lend Gold | `#F5A800` | Secondary actions, "Request Loan", LOVE wordmark |
| Heart Red | `#D32F2F` | Danger, overdue, heart mark |

---

## Firebase Project Reference

| Property | Value |
|---|---|
| Project ID | `lend-love` |
| Region | `nam5` (US multi-region) |
| Plan | Spark (free) — Blaze upgrade required before production |
| Web App ID | `1:523440774704:web:91b5bf75348ec84e5e97f5` |
| Android Bundle | `com.lendlove.app` |
| iOS Bundle | `com.lendlove.app` |
| Auth providers | Email/Password (Anonymous disabled — demo uses email/password) |
| Storage bucket | `lend-love.firebasestorage.app` |

---

## Commit Log

```
1007b51  feat: brand logo assets + Apple-HIG vector icons throughout
c8bd970  fix: demo-mode auth, seed, and Firestore index corrections
c533296  chore: gitignore Claude session-local settings
f223910  Phase 1: Demo-ready Lend Love™ platform     ← tag v0.1.0-phase1
```

---

*Last updated: 2026-05-12*
*Lend Love™ — Peer-to-peer lending platform.*
