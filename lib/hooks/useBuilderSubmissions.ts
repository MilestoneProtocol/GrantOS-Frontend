import { getPublicApiV1Base } from '@/lib/api-config';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

export type MilestoneStatus = 'Pending' | 'Submitted' | 'Approved' | 'Rejected';

export function useBuilderSubmissions() {
  const { address } = useAccount();
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchSubmissions = async () => {
      try {
        const apiBase = getPublicApiV1Base();
        const res = await fetch(`${apiBase}/milestones/builder?address=${address}`);
        if (!res.ok) throw new Error(`Failed to fetch builder submissions: ${res.status}`);
        const data = await res.json();
        
        // Key by grantId-milestoneIndex
        const map: Record<string, any> = {};
        data.forEach((s: any) => {
          map[`${s.grantId}-${s.milestoneIndex}`] = s;
        });
        setSubmissions(map);
      } catch (err) {
        console.error('Failed to fetch builder submissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [address]);

  return { submissions, loading };
}
