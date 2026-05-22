import type { Abi } from 'viem';

/**
 * Write ABI for milestone submission. Aligned with the latest GrantEscrow.sol.
 */
export const grantEscrowSubmitAbi = [
  {
    type: 'function',
    name: 'submitMilestone',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'milestoneId', type: 'uint256' },
      { name: 'proof', type: 'bytes' },
      { name: 'publicInputs', type: 'bytes32[]' },
      { name: 'easAttestationUid', type: 'bytes32' },
      { name: 'builderSummary', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'MilestoneSubmitted',
    inputs: [
      { name: 'milestoneId', type: 'uint256', indexed: true },
      { name: 'builder', type: 'address', indexed: true },
      { name: 'proofHash', type: 'bytes32', indexed: false },
      { name: 'easAttestationUid', type: 'bytes32', indexed: false },
      { name: 'builderSummary', type: 'string', indexed: false },
    ],
  },
] as const satisfies Abi;
