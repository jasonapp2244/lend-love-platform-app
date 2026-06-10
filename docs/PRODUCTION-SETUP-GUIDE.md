# Lend Love Platform - Production Setup Guide

> Everything needed to take the platform from demo/emulator mode to a fully live production deployment.

---

## Table of Contents

1. [Overview](#overview)
2. [Firebase (Core Platform)](#1-firebase-core-platform)
3. [Paykings Payment Gateway](#2-paykings-payment-gateway)
4. [ID Analyzer KYC Verification](#3-id-analyzer-kyc-verification)
5. [SendGrid Transactional Email](#4-sendgrid-transactional-email)
6. [Twilio SMS & OTP](#5-twilio-sms--otp)
7. [Sentry Error Monitoring](#6-sentry-error-monitoring-optional)
8. [Stream Chat (Planned)](#7-stream-chat-planned--optional)
9. [Vercel (Admin Panel Hosting)](#8-vercel-admin-panel-hosting)
10. [EAS Build (Mobile App Distribution)](#9-eas-build-mobile-app-distribution)
11. [App Store & Play Store Accounts](#10-app-store--play-store-accounts)
12. [Environment Variables Reference](#11-environment-variables-reference)
13. [Deployment Checklist](#12-deployment-checklist)
14. [Estimated Monthly Costs](#13-estimated-monthly-costs)

---

## Overview

The platform uses **6 required third-party services** and **3 optional services**, all gated behind feature flags in the admin panel Configuration page. In demo mode, every integration gracefully falls back to mocks or no-ops.

| Service | Purpose | Required? | Monthly Cost |
|---------|---------|-----------|-------------|
| Firebase (Blaze) | Auth, Firestore, Storage, Functions, FCM | Yes | ~$25-100 |
| Paykings (NMI) | Payment processing (ACH + card) | Yes | ~$50 + 2.9% per txn |
| ID Analyzer | KYC document verification + AML | Yes | $89+ |
| SendGrid | Transactional email | Yes | Free-$20 |
| Twilio | SMS notifications + OTP | Yes | ~$1/mo + $0.0075/SMS |
| Sentry | Error monitoring & crash reporting | Optional | Free tier available |
| Stream Chat | Scalable real-time messaging | Optional | Free tier (25 MAU) |
| Vercel | Admin panel hosting | Yes | Free tier available |
| EAS Build | iOS/Android app builds | Yes | Free (30 builds/mo) |

---

## 1. Firebase (Core Platform)

Firebase is the backbone of the entire platform - authentication, database, file storage, serverless functions, and push notifications.

### What It Powers
- **Firebase Auth** - Email/password login, custom claims for roles (user/admin/super)
- **Cloud Firestore** - All application data (users, loans, agreements, transactions, chat, notifications)
- **Firebase Storage** - KYC documents, chat attachments, agreement PDFs, profile photos
- **Cloud Functions** - 13 serverless functions handling business logic
- **Cloud Messaging (FCM)** - Push notifications to mobile devices
- **Firebase Analytics** - Product usage tracking (17 custom events)

### Current State
- Project ID: `lend-love`
- Currently on **Spark plan** (free) using local emulators
- Emulator ports: Auth (9099), Firestore (8080), Functions (5001), Storage (9199), Emulator UI (4000)

### Setup Steps

#### Step 1: Upgrade to Blaze Plan
1. Go to [Firebase Console](https://console.firebase.google.com) > Project `lend-love`
2. Click **Upgrade** in the bottom-left
3. Select **Blaze (pay-as-you-go)** plan
4. Add a billing account (credit card required)
5. Set a **budget alert** at $50/month to avoid surprises

> Blaze is required for Cloud Functions, outbound network calls (Paykings, SendGrid, Twilio), and Cloud Scheduler (cron jobs for overdue loans).

#### Step 2: Deploy Firestore Security Rules
```bash
cd backend
firebase deploy --only firestore:rules
```

#### Step 3: Deploy Storage Security Rules
```bash
firebase deploy --only storage:rules
```

#### Step 4: Deploy Cloud Functions
```bash
cd backend/functions
npm run build
firebase deploy --only functions
```

#### Step 5: Set Cloud Function Secrets
```bash
# Payment processing
firebase functions:secrets:set PAYKINGS_API_KEY
firebase functions:secrets:set PAYKINGS_WEBHOOK_SECRET

# KYC verification
firebase functions:secrets:set ID_ANALYZER_API_KEY
firebase functions:secrets:set ID_ANALYZER_CALLBACK_URL

# Email
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set SENDGRID_FROM_EMAIL

# SMS
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_FROM_NUMBER
```

#### Step 6: Enable Cloud Scheduler
The following cron jobs will auto-deploy with Cloud Functions:
- `markOverdueLoans` - Daily at 00:00 UTC
- `accrueLateFees` - Daily at 01:00 UTC
- `processInstallmentSchedule` - Daily at 08:00 UTC

#### Step 7: Create First Admin User
```bash
# Use the Cloud Function (requires Blaze)
firebase functions:call setRole --data '{"uid":"<USER_UID>","role":"super"}'
```

Or use the Firebase Console > Authentication > find the user > Custom Claims > set `{"role":"super"}`.

### Files That Reference Firebase
```
admin-panel/src/lib/firebase.ts          # Admin panel Firebase init
user-app/src/services/firebase.ts        # Mobile app Firebase init
user-app/src/config/env.ts               # Mobile app config values
backend/functions/src/index.ts           # All Cloud Functions entry
backend/firestore.rules                  # Security rules
backend/storage.rules                    # Storage rules
```

---

## 2. Paykings Payment Gateway

Paykings is a high-risk payment processor built on the NMI (Network Merchants Inc) gateway. Required because standard processors (Stripe, PayPal) typically don't allow P2P lending.

### What It Powers
- Loan disbursements (sending money to borrowers)
- Loan repayments (collecting money from borrowers)
- Refund processing
- Chargeback handling via webhooks

### Setup Steps

#### Step 1: Apply for a Merchant Account
1. Go to [paykings.com](https://paykings.com)
2. Click **Apply Now** or contact sales
3. You'll need:
   - Business registration documents (LLC/Corp)
   - EIN (Employer Identification Number)
   - A business bank account
   - Processing volume estimates
   - Description of P2P lending business model
4. Approval takes **3-10 business days** (high-risk underwriting)

#### Step 2: Get API Credentials
After approval:
1. Log into the NMI Gateway portal
2. Navigate to **Settings > Security Keys**
3. Generate a new API Security Key
4. Navigate to **Settings > Webhooks**
5. Add webhook URL: `https://us-central1-lend-love.cloudfunctions.net/handlePaykingsWebhook`
6. Note the webhook signing secret

#### Step 3: Configure in Firebase
```bash
firebase functions:secrets:set PAYKINGS_API_KEY        # NMI security key
firebase functions:secrets:set PAYKINGS_WEBHOOK_SECRET  # Webhook HMAC secret
```

#### Step 4: Enable in Admin Panel
1. Go to Admin Panel > Configuration
2. Under **Integrations (Production)**, toggle **Paykings payments** ON

### API Details
- **Endpoint**: `https://secure.paykingsgateway.com/api/transact.php`
- **Auth**: Security key in POST body
- **Supported**: ACH, Visa, Mastercard, Amex, Discover
- **Webhook events**: `transaction.complete`, `transaction.refund`, `transaction.chargeback`

### Files That Reference Paykings
```
backend/functions/src/lib/paykings.ts                    # API client
backend/functions/src/payments/processPayment.ts         # Payment processing
backend/functions/src/payments/handlePaykingsWebhook.ts  # Webhook handler
```

---

## 3. ID Analyzer KYC Verification

ID Analyzer provides document verification, facial recognition, and AML/PEP screening to comply with Know Your Customer regulations.

### What It Powers
- Government ID authentication (driver's license, passport)
- Selfie liveness check + face matching against ID
- Proof of address verification
- AML/PEP (Anti-Money Laundering / Politically Exposed Persons) screening
- Automatic approve/reject based on confidence scores

### Verification Flow
```
User uploads ID + Selfie + Proof of Address
    ↓
Cloud Function calls ID Analyzer /scan API
    ↓
ID Analyzer processes (async, 5-30 seconds)
    ↓
Webhook callback to handleIdAnalyzerWebhook
    ↓
Auto-approve (confidence >= 0.85)  OR  Manual review queue (< 0.85 or AML flag)
```

### Setup Steps

#### Step 1: Create an Account
1. Go to [idanalyzer.com](https://www.idanalyzer.com)
2. Sign up for an account
3. Choose a plan:
   - **Basic**: $89/month (300 scans)
   - **Professional**: $249/month (1,000 scans)
   - **Enterprise**: Custom pricing

#### Step 2: Get API Key
1. Log into ID Analyzer dashboard
2. Navigate to **API Keys**
3. Copy your API key

#### Step 3: Configure Webhook URL
Set the callback URL to your deployed Cloud Function:
```
https://us-central1-lend-love.cloudfunctions.net/handleIdAnalyzerWebhook
```

#### Step 4: Configure in Firebase
```bash
firebase functions:secrets:set ID_ANALYZER_API_KEY
firebase functions:secrets:set ID_ANALYZER_CALLBACK_URL  # Your webhook URL
```

#### Step 5: Enable in Admin Panel
1. Go to Admin Panel > Configuration
2. Toggle **ID Analyzer KYC** ON
3. Optionally toggle **Require KYC to borrow** and **Require KYC to lend** under Compliance

### Confidence Thresholds (configured in code)
| Score | Action |
|-------|--------|
| >= 0.85 | Auto-approved |
| < 0.85 | Sent to manual review queue |
| Face mismatch or auth < 0.5 | Auto-rejected |
| AML/PEP flag | Sent to manual review + flagged in Compliance |

### Files That Reference ID Analyzer
```
backend/functions/src/kyc/verifyIdentity.ts            # Core verification function
backend/functions/src/kyc/handleIdAnalyzerWebhook.ts   # Webhook callback handler
user-app/src/services/kyc.ts                            # Client-side KYC service
user-app/app/kyc.tsx                                    # KYC UI screen
```

---

## 4. SendGrid Transactional Email

SendGrid handles all automated email delivery from the platform.

### What It Powers
- Welcome emails on sign-up
- KYC verification status notifications
- Loan agreement ready-to-sign emails
- Payment reminder emails
- Payment overdue notifications
- Password reset emails
- Admin broadcast emails (when "Include email" is toggled)

### Setup Steps

#### Step 1: Create an Account
1. Go to [sendgrid.com](https://sendgrid.com)
2. Sign up (free tier: 100 emails/day)
3. Verify your account via email

#### Step 2: Verify a Sender
1. Go to **Settings > Sender Authentication**
2. Either:
   - **Domain Authentication** (recommended): Add DNS records to your domain
   - **Single Sender Verification**: Verify one email address (e.g., noreply@lendlove.com)

#### Step 3: Create an API Key
1. Go to **Settings > API Keys**
2. Click **Create API Key**
3. Name it (e.g., "Lend Love Production")
4. Select **Restricted Access** with only **Mail Send** permission
5. Copy the API key (shown only once)

#### Step 4: Configure in Firebase
```bash
firebase functions:secrets:set SENDGRID_API_KEY       # Your API key
firebase functions:secrets:set SENDGRID_FROM_EMAIL    # e.g., noreply@lendlove.com
```

### Files That Reference SendGrid
```
backend/functions/src/lib/sendEmail.ts                    # SendGrid client
backend/functions/src/notifications/dispatchNotification.ts  # Dispatcher
```

---

## 5. Twilio SMS & OTP

Twilio provides SMS delivery for high-priority notifications and optional two-factor authentication.

### What It Powers
- High-priority SMS alerts (payment overdue, KYC rejected)
- Optional 2FA for admin login
- Phone number verification (future)
- Rate-limited to 5 SMS/day per user

### Setup Steps

#### Step 1: Create an Account
1. Go to [twilio.com](https://www.twilio.com)
2. Sign up for a free trial ($15 credit)
3. Verify your phone number

#### Step 2: Get a Phone Number
1. Go to **Phone Numbers > Manage > Buy a number**
2. Choose a US number with SMS capability
3. Cost: ~$1.00/month

#### Step 3: Get Credentials
1. Go to **Account > API keys & tokens**
2. Note your **Account SID** and **Auth Token** from the dashboard

#### Step 4: Configure in Firebase
```bash
firebase functions:secrets:set TWILIO_ACCOUNT_SID     # Account SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN       # Auth Token
firebase functions:secrets:set TWILIO_FROM_NUMBER      # e.g., +15551234567
```

### Cost
- Phone number: ~$1.00/month
- Per SMS (US): ~$0.0079
- Per SMS (international): varies ($0.01-0.10)

### Files That Reference Twilio
```
backend/functions/src/lib/sendSms.ts                      # Twilio client
backend/functions/src/notifications/dispatchNotification.ts  # Dispatcher
```

---

## 6. Sentry Error Monitoring (Optional)

Sentry captures runtime errors, crashes, and performance data from both the admin panel and mobile app.

### What It Powers
- JavaScript error tracking (admin panel)
- React Native crash reporting (mobile app)
- Performance monitoring (API response times)
- Release tracking (which deploy introduced a bug)

### Setup Steps

#### Step 1: Create a Sentry Account
1. Go to [sentry.io](https://sentry.io)
2. Sign up (free tier: 5K errors/month)
3. Create a new organization

#### Step 2: Create Two Projects
1. **Project 1**: Platform = Next.js (for admin panel)
   - Copy the DSN (e.g., `https://abc123@o456.ingest.sentry.io/789`)
2. **Project 2**: Platform = React Native (for mobile app)
   - Copy the DSN

#### Step 3: Install SDKs
```bash
# Admin panel
cd admin-panel
npm install @sentry/nextjs

# Mobile app
cd user-app
npx expo install @sentry/react-native
```

#### Step 4: Set Environment Variables
Admin panel `.env.local`:
```
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

Mobile app `.env`:
```
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

### Files That Reference Sentry
```
admin-panel/src/lib/sentry.ts    # Next.js Sentry setup (20% sampling in prod)
user-app/src/lib/sentry.ts       # React Native Sentry setup
```

---

## 7. Stream Chat (Planned / Optional)

Stream Chat is a scalable real-time messaging service. Currently the platform uses Firestore-backed chat which works well for small-medium scale. Stream Chat is intended for when the platform scales beyond ~10K concurrent users.

### Current State
- Chat currently runs on Firestore subcollections (`conversations/{id}/messages`)
- Feature flag `integrations.streamChat.enabled` exists but Stream Chat is NOT yet integrated
- The `chat.ts` service is designed with a provider-agnostic API so switching is a one-file change

### When to Switch
- When chat latency becomes noticeable (>500ms)
- When exceeding ~50K messages/day
- When needing features like typing indicators, read receipts, reactions, threads

### Setup (When Ready)
1. Go to [getstream.io](https://getstream.io/chat/)
2. Create an app (free tier: 25 monthly active users)
3. Get API Key and Secret
4. Install SDK: `npm install stream-chat stream-chat-react-native`
5. Replace Firestore chat calls in `user-app/src/services/chat.ts`

---

## 8. Vercel (Admin Panel Hosting)

Vercel hosts the Next.js admin panel with automatic deployments from GitHub.

### Setup Steps

#### Step 1: Create a Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account

#### Step 2: Import the Project
1. Click **Add New > Project**
2. Import the `lend-love-platform-app` repository
3. Set the **Root Directory** to `admin-panel`
4. Set the **Framework Preset** to Next.js
5. Add environment variables:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCP7tBukcECV5wJjyIN0ws4WUv9JJEJBJQ
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=lend-love.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=lend-love
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=lend-love.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=523440774704
   NEXT_PUBLIC_FIREBASE_APP_ID=1:523440774704:web:91b5bf75348ec84e5e97f5
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-33CPMMF8Z6
   ```

#### Step 3: Configure GitHub CI/CD (Optional)
Add these GitHub secrets for automatic deployments:
```
VERCEL_TOKEN         # From Vercel > Settings > Tokens
VERCEL_ORG_ID        # From .vercel/project.json
VERCEL_PROJECT_ID    # From .vercel/project.json
```

#### Step 4: Set Custom Domain (Optional)
1. Go to Vercel Project > Settings > Domains
2. Add `admin.lendlove.com` (or your domain)
3. Update DNS records as instructed

---

## 9. EAS Build (Mobile App Distribution)

Expo Application Services (EAS) builds and distributes the iOS and Android apps.

### Setup Steps

#### Step 1: Create an Expo Account
1. Go to [expo.dev](https://expo.dev)
2. Sign up for an account
3. Install EAS CLI: `npm install -g eas-cli`
4. Login: `eas login`

#### Step 2: Configure EAS
The project already has `eas.json` configured with three build profiles:
- **development** - Debug builds with dev client
- **preview** - Internal testing builds
- **production** - Store-ready builds

#### Step 3: Build for Testing
```bash
cd user-app

# Android APK (internal testing)
eas build --profile preview --platform android

# iOS (requires Apple Developer account)
eas build --profile preview --platform ios
```

#### Step 4: Build for Store Submission
```bash
# Android AAB (Play Store)
eas build --profile production --platform android

# iOS IPA (App Store)
eas build --profile production --platform ios
```

#### Step 5: Submit to Stores
```bash
# Submit to Google Play
eas submit --platform android

# Submit to Apple App Store
eas submit --platform ios
```

#### Step 6: GitHub CI/CD (Optional)
Add GitHub secret:
```
EXPO_TOKEN    # From expo.dev > Settings > Access Tokens
```

---

## 10. App Store & Play Store Accounts

### Apple Developer Account
1. Go to [developer.apple.com](https://developer.apple.com)
2. Enroll in the Apple Developer Program ($99/year)
3. Create an App ID and provisioning profiles
4. Required for iOS builds and App Store submission
5. **App Store Review**: Prepare for extra scrutiny as a lending app:
   - Privacy policy URL
   - Terms of service URL
   - Lending license documentation (varies by state)

### Google Play Developer Account
1. Go to [play.google.com/console](https://play.google.com/console)
2. Create a developer account ($25 one-time fee)
3. **Google Play Lending Policy** (already built into the app):
   - APR must be <= 36% (enforced in code + admin config)
   - Loan term must be >= 60 days (enforced)
   - Borrower must be >= 18 years (enforced)
   - Full TILA disclosures required (implemented in agreement signing)
4. Create a signing key via EAS or upload your own

---

## 11. Environment Variables Reference

### Backend - Cloud Function Secrets
Set via `firebase functions:secrets:set <KEY>`:

| Variable | Service | Required |
|----------|---------|----------|
| `PAYKINGS_API_KEY` | Paykings | Yes (for payments) |
| `PAYKINGS_WEBHOOK_SECRET` | Paykings | Yes (for payments) |
| `ID_ANALYZER_API_KEY` | ID Analyzer | Yes (for KYC) |
| `ID_ANALYZER_CALLBACK_URL` | ID Analyzer | Yes (for KYC) |
| `SENDGRID_API_KEY` | SendGrid | Yes (for email) |
| `SENDGRID_FROM_EMAIL` | SendGrid | Yes (for email) |
| `TWILIO_ACCOUNT_SID` | Twilio | Yes (for SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio | Yes (for SMS) |
| `TWILIO_FROM_NUMBER` | Twilio | Yes (for SMS) |

### Admin Panel - `.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Google Analytics ID |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |

### User App - `.env`

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase mobile API key |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID` | Google Analytics ID |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |

### GitHub Secrets (CI/CD)

| Secret | Service | Purpose |
|--------|---------|---------|
| `FIREBASE_TOKEN` | Firebase CLI | Deploy functions & rules |
| `EXPO_TOKEN` | EAS Build | Build mobile apps |
| `VERCEL_TOKEN` | Vercel | Deploy admin panel |
| `VERCEL_ORG_ID` | Vercel | Organization identifier |
| `VERCEL_PROJECT_ID` | Vercel | Project identifier |

---

## 12. Deployment Checklist

### Phase A: Firebase Production Setup
- [ ] Upgrade Firebase to Blaze plan
- [ ] Deploy Firestore security rules
- [ ] Deploy Storage security rules
- [ ] Deploy Cloud Functions
- [ ] Set all 9 Cloud Function secrets
- [ ] Verify cron jobs are scheduled (Cloud Scheduler)
- [ ] Create first super-admin user via `setRole` function
- [ ] Test Firestore indexes are created (auto-created on first query)

### Phase B: Third-Party Service Accounts
- [ ] Apply for Paykings merchant account (allow 3-10 days)
- [ ] Sign up for ID Analyzer and get API key
- [ ] Set up SendGrid account + verify sender domain
- [ ] Set up Twilio account + buy phone number
- [ ] (Optional) Set up Sentry projects for admin + mobile

### Phase C: Admin Panel Deployment
- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variables in Vercel dashboard
- [ ] Deploy and verify admin panel loads
- [ ] (Optional) Configure custom domain

### Phase D: Mobile App Builds
- [ ] Set up Expo/EAS account
- [ ] Create Apple Developer account ($99/year)
- [ ] Create Google Play Developer account ($25)
- [ ] Build preview APK and test on real device
- [ ] Build production AAB/IPA

### Phase E: Go Live Configuration
- [ ] Log into Admin Panel as super-admin
- [ ] Go to Configuration page
- [ ] Enable **Paykings payments** toggle
- [ ] Enable **ID Analyzer KYC** toggle
- [ ] Enable **Require KYC to borrow** toggle
- [ ] Enable **Require KYC to lend** toggle
- [ ] Review loan limits ($50-$10,000) and APR caps (36%)
- [ ] Review state-specific APR caps (NY: 16%, FL: 30%, CT: 12%, etc.)
- [ ] Verify platform fee (1.5%)
- [ ] Disable demo mode in user app

### Phase F: App Store Submission
- [ ] Prepare privacy policy page (already built at `/privacy`)
- [ ] Prepare terms of service page (already built at `/terms`)
- [ ] Prepare delete account page (already built at `/delete-account`)
- [ ] Submit to Google Play (lending policy compliance built-in)
- [ ] Submit to Apple App Store (expect extended review for financial apps)
- [ ] Respond to any reviewer questions about lending compliance

---

## 13. Estimated Monthly Costs

### Small Scale (< 500 users)

| Service | Cost |
|---------|------|
| Firebase Blaze | ~$25/mo (free tier covers most usage) |
| Paykings | ~$50/mo gateway + 2.9% + $0.30 per transaction |
| ID Analyzer | $89/mo (300 verifications) |
| SendGrid | Free (100 emails/day) |
| Twilio | ~$2/mo (number + occasional SMS) |
| Vercel | Free (hobby plan) |
| EAS Build | Free (30 builds/month) |
| Sentry | Free (5K errors/month) |
| Apple Developer | $99/year (~$8/mo) |
| Google Play | $25 one-time |
| **Total** | **~$175/mo + transaction fees** |

### Medium Scale (500-5,000 users)

| Service | Cost |
|---------|------|
| Firebase Blaze | ~$50-200/mo |
| Paykings | ~$50/mo + transaction fees |
| ID Analyzer | $249/mo (1,000 verifications) |
| SendGrid | $20/mo (50K emails) |
| Twilio | ~$10-50/mo |
| Vercel | Free or $20/mo (Pro) |
| EAS Build | Free or $99/mo (priority builds) |
| Sentry | Free or $26/mo (50K events) |
| **Total** | **~$400-700/mo + transaction fees** |

---

## Feature Flags Reference

All toggles are in Admin Panel > Configuration and take effect immediately:

| Flag | Default | What It Controls |
|------|---------|-----------------|
| `integrations.paykings.enabled` | OFF | Real payment processing |
| `integrations.idAnalyzer.enabled` | OFF | Real KYC verification |
| `integrations.streamChat.enabled` | OFF | Stream Chat (not yet integrated) |
| `compliance.requireKycForBorrowing` | OFF | Block borrowing without KYC |
| `compliance.requireKycForLending` | OFF | Block lending without KYC |
| `compliance.amlScreeningEnforced` | ON | Route AML flags to manual review |
| `mobile.itemLoans` | ON | Item lending feature |
| `mobile.borrowerRequests` | ON | Borrower request marketplace |
| `mobile.biometricLogin` | ON | FaceID/fingerprint login |
| `mobile.chatAttachments` | ON | Images/PDFs in chat |
| `maintenance.readOnlyMode` | OFF | Emergency kill switch (blocks all writes) |

---

## Cloud Functions Reference

13 functions deployed to `us-central1`:

| Function | Trigger | Purpose |
|----------|---------|---------|
| `setRole` | HTTPS Callable | Assign user roles (admin/super) |
| `resetPassword` | HTTPS Callable | Send password reset email |
| `processPayment` | HTTPS Callable | Process loan disbursement/repayment via Paykings |
| `handlePaykingsWebhook` | HTTPS Request | Receive payment status callbacks |
| `verifyIdentity` | HTTPS Callable | Submit KYC documents to ID Analyzer |
| `handleIdAnalyzerWebhook` | HTTPS Request | Receive KYC verification results |
| `dispatchNotification` | Firestore Trigger | Send push/email/SMS on new notification docs |
| `markOverdueLoans` | Scheduled (daily 00:00) | Flag loans past due date |
| `accrueLateFees` | Scheduled (daily 01:00) | Calculate and apply late fees |
| `processInstallmentSchedule` | Scheduled (daily 08:00) | Generate upcoming installment reminders |
| `onUserDelete` | Auth Trigger | GDPR cascade delete (profile, KYC, tokens) |
| `onLoanCreate` | Firestore Trigger | Update user stats on new loan |
| `onTransactionCreate` | Firestore Trigger | Update loan balance on payment |

---

*Last updated: June 11, 2026*
