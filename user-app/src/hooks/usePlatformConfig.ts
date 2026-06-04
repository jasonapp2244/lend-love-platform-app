/**
 * Platform Config Hook
 * Fetches config/platform from Firestore so admin-panel changes
 * actually control the user app behavior at runtime.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { COMPLIANCE, PLATFORM_DEFAULTS } from '../shared';
import type { PlatformConfig } from '../shared';

// ---- Defaults (used until Firestore doc loads) ----
const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  'mobile.itemLoans': true,
  'mobile.borrowerRequests': true,
  'mobile.biometricLogin': true,
  'mobile.chatAttachments': true,
  'compliance.requireKycForBorrowing': false,
  'compliance.requireKycForLending': false,
  'compliance.amlScreeningEnforced': true,
  'integrations.paykings.enabled': false,
  'integrations.idAnalyzer.enabled': false,
  'integrations.streamChat.enabled': false,
  'maintenance.readOnlyMode': false,
};

function defaultConfig(): PlatformConfig {
  return {
    feePercent: PLATFORM_DEFAULTS.PLATFORM_FEE_PERCENT,
    maxAPR: COMPLIANCE.MAX_APR_PERCENT,
    minLoanAmount: PLATFORM_DEFAULTS.MIN_LOAN_AMOUNT,
    maxLoanAmount: PLATFORM_DEFAULTS.MAX_LOAN_AMOUNT,
    minLoanTermDays: COMPLIANCE.MIN_LOAN_TERM_DAYS,
    minBorrowerAge: COMPLIANCE.MIN_AGE,
    featureFlags: DEFAULT_FEATURE_FLAGS,
    updatedAt: Date.now(),
  };
}

// ---- Context ----
interface PlatformConfigState {
  config: PlatformConfig;
  loading: boolean;
  flag: (key: string) => boolean;
}

const PlatformConfigContext = createContext<PlatformConfigState>({
  config: defaultConfig(),
  loading: true,
  flag: () => false,
});

export function usePlatformConfig() {
  return useContext(PlatformConfigContext);
}

// ---- Provider (goes in _layout.tsx) ----
export function PlatformConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PlatformConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'config', 'platform');

    // Real-time listener — admin changes propagate instantly
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as PlatformConfig;
          setConfig({
            ...defaultConfig(),
            ...data,
            featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...(data.featureFlags ?? {}) },
          });
        }
        setLoading(false);
      },
      () => {
        // On error (e.g., no permission / offline), use defaults
        setLoading(false);
      },
    );

    return unsub;
  }, []);

  const flag = (key: string): boolean => {
    return config.featureFlags[key] ?? false;
  };

  return React.createElement(
    PlatformConfigContext.Provider,
    { value: { config, loading, flag } },
    children,
  );
}
