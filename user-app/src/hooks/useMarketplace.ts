import { useQuery } from '@tanstack/react-query';
import {
  fetchMarketplaceLoans,
  fetchMarketplaceRequests,
  fetchMyLending,
  fetchMyBorrowing,
} from '../services/loans';
import type { LoanType } from '../../src/shared';

export function useMarketplaceLoans(type: LoanType) {
  return useQuery({
    queryKey: ['marketplace', 'loans', type],
    queryFn: () => fetchMarketplaceLoans(type),
    staleTime: 30_000,
  });
}

export function useMarketplaceRequests() {
  return useQuery({
    queryKey: ['marketplace', 'requests'],
    queryFn: fetchMarketplaceRequests,
    staleTime: 30_000,
  });
}

export function useMyLending(uid: string | null) {
  return useQuery({
    queryKey: ['myLoans', 'lending', uid],
    queryFn: () => fetchMyLending(uid!),
    enabled: !!uid,
    staleTime: 30_000,
  });
}

export function useMyBorrowing(uid: string | null) {
  return useQuery({
    queryKey: ['myLoans', 'borrowing', uid],
    queryFn: () => fetchMyBorrowing(uid!),
    enabled: !!uid,
    staleTime: 30_000,
  });
}
