import type { Abi, Address } from 'viem';

export const GRANT_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_GRANT_ESCROW_ADDRESS ||
  '0x0000000000000000000000000000000000000001') as Address;

export const IDENTITY_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS ||
  '0x0000000000000000000000000000000000000002') as Address;

/** Minimal ABI for `GrantIdentityRegistry.getIdentity(address)` reads from the UI. */
export const identityRegistryAbi = [
  {
    type: 'function',
    name: 'isVerified',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'verified', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getIdentity',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'zkVerified', type: 'bool' },
      { name: 'githubHandle', type: 'string' },
      { name: 'accountCreationYear', type: 'uint16' },
      { name: 'contributionTier', type: 'uint8' },
      { name: 'reputationScore', type: 'uint256' },
    ],
  },
] as const satisfies Abi;

/**
 * Read-only GrantEscrow shape aligned with `createGrant` inputs plus `createdAt`.
 * Override this fragment if your deployed contract differs.
 */
export const grantEscrowReadAbi = [
  {
    type: 'function',
    name: 'getGrant',
    stateMutability: 'view',
    inputs: [{ name: 'grantId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'builder', type: 'address' },
          { name: 'streaming', type: 'bool' },
          { name: 'committee', type: 'address[]' },
          { name: 'quorum', type: 'uint256' },
          { name: 'createdAt', type: 'uint256' },
          {
            type: 'tuple[]',
            name: 'milestones',
            components: [
              { name: 'title', type: 'string' },
              { name: 'description', type: 'string' },
              { name: 'amount', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
              { name: 'proofType', type: 'uint8' },
            ],
          },
        ],
      },
    ],
  },
  /**
   * Milestone lifecycle status for submission gating. Convention: `0` = Pending (open for submission).
   * Align with your deployed `GrantEscrow` enum; update if your contract uses different values.
   */
  {
    type: 'function',
    name: 'getMilestoneStatus',
    stateMutability: 'view',
    inputs: [
      { name: 'grantId', type: 'uint256' },
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [{ name: 'status', type: 'uint8' }],
  },
] as const satisfies Abi;

/** Pending = open for builder submission (must match `getMilestoneStatus` onchain enum). */
export const MILESTONE_STATUS_PENDING = 0;

export const grantEscrowAbi: Abi | undefined = undefined;

export const CONTRACTS_READY = Boolean(grantEscrowAbi);

/**
 * Read-only ABI fragments for resolving the list of grants where `member` sits on the committee.
 * Different deployments may expose different view function names — call all and union the results.
 */
export const committeeMembershipAbis = {
  getCommitteeGrantIds: [
    {
      type: 'function',
      name: 'getCommitteeGrantIds',
      stateMutability: 'view',
      inputs: [{ name: 'member', type: 'address' }],
      outputs: [{ type: 'uint256[]' }],
    },
  ] as const satisfies Abi,
  getGrantsByCommittee: [
    {
      type: 'function',
      name: 'getGrantsByCommittee',
      stateMutability: 'view',
      inputs: [{ name: 'member', type: 'address' }],
      outputs: [{ type: 'uint256[]' }],
    },
  ] as const satisfies Abi,
  getCommitteeGrants: [
    {
      type: 'function',
      name: 'getCommitteeGrants',
      stateMutability: 'view',
      inputs: [{ name: 'member', type: 'address' }],
      outputs: [{ type: 'uint256[]' }],
    },
  ] as const satisfies Abi,
};
