import type { Address } from 'viem';

/** EAS core contract on the connected chain (e.g. Arbitrum One). */
export const EAS_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_EAS_CONTRACT_ADDRESS ||
  '') as Address;

/** Registered schema UID for milestone submission attestations. */
export const EAS_SCHEMA_UID = (process.env.NEXT_PUBLIC_EAS_SCHEMA_UID ||
  '') as `0x${string}`;

/**
 * Must match the schema registered onchain for `EAS_SCHEMA_UID`.
 * Field order and names must match registration exactly.
 */
export const EAS_MILESTONE_SCHEMA_RAW =
  process.env.NEXT_PUBLIC_EAS_MILESTONE_SCHEMA_RAW?.trim() ||
  'bytes32 zkProofHash,string builderSummary,string aiVerdictLabel,string aiExplanation,string prUrl,uint256 grantId,uint256 milestoneIndex';

export function easConfigured(): boolean {
  return Boolean(
    EAS_CONTRACT_ADDRESS &&
      EAS_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' &&
      EAS_SCHEMA_UID &&
      EAS_SCHEMA_UID !==
        '0x0000000000000000000000000000000000000000000000000000000000000000'
  );
}
