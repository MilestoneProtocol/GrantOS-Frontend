import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ReputationScore } from './useBuilderReputation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export function useBuilderReputations(addresses: string[]) {
  const queries = useQueries({
    queries: addresses.map((address) => ({
      queryKey: ['builder-reputation', address],
      queryFn: async (): Promise<ReputationScore> => {
        const res = await fetch(`${API_BASE}/grants/builder/${address}/reputation`);
        if (!res.ok) {
          // Return default score if not found
          return {
            score: 50,
            letterGrade: 'C',
            deliveryRate: 0,
            zkVerified: false,
            breakdown: {
              approvedOnTime: 0,
              approvedLate: 0,
              zkProofsSubmitted: 0,
              rejected: 0,
              warningsReceived: 0,
              slashed: 0,
              totalPoints: 0,
            },
            history: [],
          };
        }
        return res.json();
      },
      staleTime: 60000,
      enabled: Boolean(address),
    })),
  });

  const queryDataJson = JSON.stringify(queries.map((q) => q.data?.score ?? null));
  const addressesJson = JSON.stringify(addresses);

  const reputationMap = useMemo(() => {
    const map = new Map<string, ReputationScore>();
    addresses.forEach((address, index) => {
      const data = queries[index]?.data;
      if (data) {
        map.set(address.toLowerCase(), data as ReputationScore);
      }
    });
    return map;
  }, [queryDataJson, addressesJson]);

  const isLoading = useMemo(() => queries.some((q) => q.isLoading), [queries]);

  return {
    reputations: reputationMap,
    isLoading,
  };
}
