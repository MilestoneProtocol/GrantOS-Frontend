import type { Abi, Address } from 'viem';

export const GRANT_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_GRANT_ESCROW_ADDRESS ||
  '0x0000000000000000000000000000000000000001') as Address;

export const IDENTITY_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS ||
  '0x0000000000000000000000000000000000000002') as Address;

/** Minimal ABI for `GrantIdentityRegistry.getIdentity(address)` reads from the UI. */
export const identityRegistryAbi = [
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

export const grantEscrowAbi: Abi | undefined = undefined;

export const CONTRACTS_READY = Boolean(grantEscrowAbi);
