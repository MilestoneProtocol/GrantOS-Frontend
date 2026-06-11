import {
  EAS_CONTRACT_ADDRESS,
  EAS_MILESTONE_SCHEMA_RAW,
  EAS_SCHEMA_UID,
  easConfigured,
} from '@/lib/eas-config';
import type { AiVerifierVerdict } from '@/lib/ai-verifier';
import type { Address } from 'viem';

export type MilestoneAttestationParams = {
  zkProofHash: `0x${string}`;
  builderSummary: string;
  aiVerdictLabel: AiVerifierVerdict | string;
  aiExplanation: string;
  prUrl: string;
  grantId: bigint;
  milestoneIndex: bigint;
  /** Attestation recipient; defaults to zero address (informational package). */
  recipient?: Address;
};

/**
 * Creates an onchain EAS attestation using the connected wallet (window.ethereum).
 * Requires `NEXT_PUBLIC_EAS_CONTRACT_ADDRESS` and `NEXT_PUBLIC_EAS_SCHEMA_UID`.
 */
export async function attestMilestoneSubmissionPackage(
  params: MilestoneAttestationParams
): Promise<`0x${string}`> {
  if (!easConfigured()) {
    throw new Error(
      'EAS is not configured. Set NEXT_PUBLIC_EAS_CONTRACT_ADDRESS and NEXT_PUBLIC_EAS_SCHEMA_UID.'
    );
  }
  const injected =
    typeof window !== 'undefined'
      ? (window as unknown as { ethereum?: import('ethers').Eip1193Provider }).ethereum
      : undefined;
  if (!injected) {
    throw new Error('Wallet not available');
  }

  const [{ BrowserProvider }, { EAS, SchemaEncoder }] = await Promise.all([
    import('ethers'),
    import('@ethereum-attestation-service/eas-sdk'),
  ]);

  const provider = new BrowserProvider(injected);
  const signer = await provider.getSigner();

  const encoder = new SchemaEncoder(EAS_MILESTONE_SCHEMA_RAW);
  const data = encoder.encodeData([
    { name: 'zkProofHash', type: 'bytes32', value: params.zkProofHash },
    { name: 'builderSummary', type: 'string', value: params.builderSummary },
    {
      name: 'aiVerdictLabel',
      type: 'string',
      value: String(params.aiVerdictLabel),
    },
    { name: 'aiExplanation', type: 'string', value: params.aiExplanation },
    { name: 'prUrl', type: 'string', value: params.prUrl },
    { name: 'grantId', type: 'uint256', value: params.grantId },
    { name: 'milestoneIndex', type: 'uint256', value: params.milestoneIndex },
  ]);

  const eas = new EAS(EAS_CONTRACT_ADDRESS);
  eas.connect(signer);

  const ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
  const recipient =
    params.recipient ?? ('0x0000000000000000000000000000000000000000' as Address);

  const tx = await eas.attest(
    {
      schema: EAS_SCHEMA_UID,
      data: {
        recipient,
        expirationTime: BigInt(0),
        revocable: true,
        refUID: ZERO,
        data,
        value: BigInt(0),
      },
    },
    // Pin a 2 gwei legacy gasPrice, matching every other tx in the app
    // (e.g. OnchainSubmitStep). Without it the EAS SDK lets ethers estimate
    // maxFeePerGas == baseFee with no buffer, which the RPC rejects the moment
    // Arbitrum's base fee ticks up ("max fee per gas less than block base fee").
    { gasPrice: 2_000_000_000n },
  );

  const uid = await tx.wait();
  if (!uid || typeof uid !== 'string') {
    throw new Error('EAS attestation did not return a UID');
  }
  return uid as `0x${string}`;
}
