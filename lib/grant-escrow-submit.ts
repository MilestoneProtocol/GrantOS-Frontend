import type { Abi } from 'viem';

/**
 * Write ABI for milestone submission. Align `InvalidProof` and argument layout with deployment.
 */
export const grantEscrowSubmitAbi = [
  {
    type: 'error',
    name: 'InvalidProof',
    inputs: [],
  },
  {
    type: 'function',
    name: 'submitMilestone',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'grantId', type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
      { name: 'zkProof', type: 'bytes' },
      { name: 'easAttestationUID', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const satisfies Abi;
