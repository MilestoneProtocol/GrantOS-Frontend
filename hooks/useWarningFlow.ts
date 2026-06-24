'use client';

import { useCallback, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { issueWarning, recordSlash } from '@/lib/warning-api';
import { parseUnits, type Address } from 'viem';
import { useWallet } from '@/lib/wallet/WalletProvider';
import { getFreighterAddress } from '@/lib/stellar/freighter';
import {
  issueWarning as stellarIssueWarning,
  slashMilestone as stellarSlash,
  grantIdBytes,
} from '@/lib/stellar/grant';

export interface UseWarningFlowResult {
  issueWarning: (params: IssueWarningParams) => Promise<void>;
  slashMilestone: (params: SlashMilestoneParams) => Promise<void>;
  isIssuing: boolean;
  isSlashing: boolean;
  error: Error | null;
}

export interface IssueWarningParams {
  grantId: number;
  milestoneIndex: number;
  builderAddress: Address;
  committeeAddress: Address;
  message: string;
  sentinelAddress: Address;
}

export interface SlashMilestoneParams {
  grantId: number;
  milestoneIndex: number;
  escrowAddress: Address;
  amountUsdc: string;
}

export function useWarningFlow(): UseWarningFlowResult {
  const [isIssuing, setIsIssuing] = useState(false);
  const [isSlashing, setIsSlashing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { chainKind, address: stellarAddress } = useWallet();

  const issueWarningHandler = useCallback(
    async (params: IssueWarningParams) => {
      setIsIssuing(true);
      setError(null);

      try {
        // Stellar branch: plant the warning in grant_sentinel via Freighter.
        if (chainKind === 'stellar') {
          const caller = stellarAddress ?? (await getFreighterAddress());
          if (!caller) throw new Error('Connect Freighter to issue a warning.');
          await stellarIssueWarning({
            caller,
            grantId: grantIdBytes(params.grantId),
            milestoneIndex: params.milestoneIndex,
            msgHash: new Uint8Array(32),
          });
          await issueWarning({
            grantId: params.grantId,
            milestoneIndex: params.milestoneIndex,
            builderAddress: params.builderAddress,
            committeeAddress: params.committeeAddress,
            message: params.message,
            attestationUid: '0x0',
            txHash: 'stellar',
            warningTimestamp: Math.floor(Date.now() / 1000).toString(),
          });
          return;
        }

        // Call SentinelEAS.issueWarning
        const grantIdBytes32 = `0x${params.grantId.toString(16).padStart(64, '0')}` as `0x${string}`;
        
        const hash = await writeContractAsync({
          address: params.sentinelAddress,
          abi: [
            {
              name: 'issueWarning',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'grantId', type: 'bytes32' },
                { name: 'milestoneIndex', type: 'uint256' },
                { name: 'recipient', type: 'address' },
                { name: 'message', type: 'string' },
              ],
              outputs: [{ name: '', type: 'bytes32' }],
            },
          ],
          functionName: 'issueWarning',
          args: [grantIdBytes32, BigInt(params.milestoneIndex), params.builderAddress, params.message],
          gasPrice: parseUnits('2', 9),
          chainId: arbitrumSepolia.id,
        });

        // Wait for confirmation
        const receipt = await fetch(`/api/wait-tx?hash=${hash}`).then((r) => r.json());
        
        // Extract attestationUid from logs (returned value)
        const attestationUid = receipt.logs[0]?.topics[0] || hash;

        // Record in backend
        await issueWarning({
          grantId: params.grantId,
          milestoneIndex: params.milestoneIndex,
          builderAddress: params.builderAddress,
          committeeAddress: params.committeeAddress,
          message: params.message,
          attestationUid,
          txHash: hash,
          warningTimestamp: Math.floor(Date.now() / 1000).toString(),
        });
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsIssuing(false);
      }
    },
    [writeContractAsync, chainKind, stellarAddress],
  );

  const slashMilestoneHandler = useCallback(
    async (params: SlashMilestoneParams) => {
      setIsSlashing(true);
      setError(null);

      try {
        // Stellar branch: slash on the Soroban escrow via Freighter.
        if (chainKind === 'stellar') {
          const caller = stellarAddress ?? (await getFreighterAddress());
          if (!caller) throw new Error('Connect Freighter to slash.');
          await stellarSlash({
            escrowId: String(params.escrowAddress),
            voter: caller,
            milestoneId: params.milestoneIndex,
          });
          await recordSlash({
            grantId: params.grantId,
            milestoneIndex: params.milestoneIndex,
            slashTxHash: 'stellar',
            slashedAt: Math.floor(Date.now() / 1000).toString(),
            amountReturnedUsdc: params.amountUsdc,
          });
          return;
        }

        // Call GrantEscrow.slashMilestone
        const hash = await writeContractAsync({
          address: params.escrowAddress,
          abi: [
            {
              name: 'slashMilestone',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [{ name: 'milestoneId', type: 'uint256' }],
              outputs: [],
            },
          ],
          functionName: 'slashMilestone',
          args: [BigInt(params.milestoneIndex)],
          gasPrice: parseUnits('2', 9),
          chainId: arbitrumSepolia.id,
        });

        // Wait for confirmation
        await fetch(`/api/wait-tx?hash=${hash}`).then((r) => r.json());

        // Record slash in backend
        await recordSlash({
          grantId: params.grantId,
          milestoneIndex: params.milestoneIndex,
          slashTxHash: hash,
          slashedAt: Math.floor(Date.now() / 1000).toString(),
          amountReturnedUsdc: params.amountUsdc,
        });
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSlashing(false);
      }
    },
    [writeContractAsync, chainKind, stellarAddress],
  );

  return {
    issueWarning: issueWarningHandler,
    slashMilestone: slashMilestoneHandler,
    isIssuing,
    isSlashing,
    error,
  };
}
