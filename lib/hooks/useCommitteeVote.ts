import { getPublicApiV1Base } from '@/lib/api-config';
import { useCallback, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { grantEscrowAbi } from '@/lib/escrow';
import { parseUnits, type Address, type Hex } from 'viem';
import { useWallet } from '@/lib/wallet/WalletProvider';
import { getFreighterAddress } from '@/lib/stellar/freighter';
import { approveMilestone as stellarApprove, rejectMilestone as stellarReject } from '@/lib/stellar/grant';

export type VoteIntent = 'approve' | 'reject';

export type VoteFlowState =
  | { kind: 'idle' }
  | { kind: 'confirming'; intent: VoteIntent }
  | { kind: 'submitted'; intent: VoteIntent; txHash: string }
  | { kind: 'voted'; intent: VoteIntent; txHash?: string }
  | { kind: 'error'; message: string };

export function useCommitteeVote(escrowAddress: Address, milestoneIndex: number, grantId: number) {
  const [state, setState] = useState<VoteFlowState>({ kind: 'idle' });
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { chainKind, address: stellarAddress } = useWallet();

  const start = useCallback(async (intent: VoteIntent) => {
    setState({ kind: 'confirming', intent });
    try {
      // Stellar branch: vote on the Soroban escrow via Freighter. `escrowAddress`
      // holds the C… escrow contract id for Stellar grants.
      if (chainKind === 'stellar') {
        const voter = stellarAddress ?? (await getFreighterAddress());
        if (!voter) throw new Error('Connect Freighter to vote.');
        const args = { escrowId: String(escrowAddress), voter, milestoneId: milestoneIndex };
        if (intent === 'approve') await stellarApprove(args);
        else await stellarReject(args);
        setState({ kind: 'voted', intent });
        return;
      }

      const hash = await writeContractAsync({
        address: escrowAddress,
        abi: grantEscrowAbi,
        functionName: intent === 'approve' ? 'approveMilestone' : 'rejectMilestone',
        args: [BigInt(milestoneIndex)],
        gasPrice: parseUnits('2', 9),
        chainId: arbitrumSepolia.id,
      });

      setState({ kind: 'submitted', intent, txHash: hash });

      // After transaction is submitted, we wait for receipt
      // but we can also optimistically notify the backend
      // In this case, we'll wait for confirmation to ensure we have the final counts
    } catch (err: any) {
      console.error('Vote failed:', err);
      setState({ kind: 'error', message: err.message || 'Vote failed' });
    }
  }, [escrowAddress, milestoneIndex, writeContractAsync, chainKind, stellarAddress]);

  const recordBackend = useCallback(async (txHash: string, intent: VoteIntent, approvalCount: number, rejectionCount: number, finalStatus?: 'approved' | 'rejected') => {
      try {
          const apiBase = getPublicApiV1Base();
          await fetch(`${apiBase}/milestones/vote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  grantId,
                  milestoneIndex,
                  voterAddress: address,
                  approved: intent === 'approve',
                  approvalCount,
                  rejectionCount,
                  txHash,
                  finalStatus
              })
          });
      } catch (err) {
          console.error('Failed to record vote in backend:', err);
      }
  }, [address, grantId, milestoneIndex]);

  return { state, start, setState, recordBackend };
}
