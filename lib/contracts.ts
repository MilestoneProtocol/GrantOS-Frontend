// lib/contracts.ts
// ABI generated from: forge build (GrantOS-Contracts/out/GrantIdentityRegistry.sol/GrantIdentityRegistry.json)

export const IDENTITY_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS as `0x${string}`) ??
  '0x0000000000000000000000000000000000000000';

export const IDENTITY_REGISTRY_ABI = [
  {
    type: 'constructor',
    inputs: [{ name: '_verifier', type: 'address', internalType: 'address' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'verifyIdentity',
    inputs: [
      { name: 'proof',        type: 'bytes',     internalType: 'bytes'      },
      { name: 'publicInputs', type: 'bytes32[]', internalType: 'bytes32[]'  },
      { name: 'githubHandle', type: 'string',    internalType: 'string'     },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isVerified',
    inputs:  [{ name: 'wallet', type: 'address', internalType: 'address' }],
    outputs: [{ name: '',       type: 'bool',    internalType: 'bool'    }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getIdentity',
    inputs: [{ name: 'wallet', type: 'address', internalType: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        internalType: 'struct GrantIdentityRegistry.Identity',
        components: [
          { name: 'isVerified',   type: 'bool',    internalType: 'bool'    },
          { name: 'tier',         type: 'uint256', internalType: 'uint256' },
          { name: 'githubId',     type: 'uint256', internalType: 'uint256' },
          { name: 'createdYear',  type: 'uint256', internalType: 'uint256' },
          { name: 'githubHandle', type: 'string',  internalType: 'string'  },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'identities',
    inputs:  [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'isVerified',   type: 'bool',    internalType: 'bool'    },
      { name: 'tier',         type: 'uint256', internalType: 'uint256' },
      { name: 'githubId',     type: 'uint256', internalType: 'uint256' },
      { name: 'createdYear',  type: 'uint256', internalType: 'uint256' },
      { name: 'githubHandle', type: 'string',  internalType: 'string'  },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'githubIdToAddress',
    inputs:  [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'verifier',
    inputs:  [],
    outputs: [{ name: '', type: 'address', internalType: 'contract INoirVerifier' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'IdentityVerified',
    inputs: [
      { name: 'wallet',       type: 'address', indexed: true,  internalType: 'address' },
      { name: 'tier',         type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'githubId',     type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'createdYear',  type: 'uint256', indexed: false, internalType: 'uint256' },
      { name: 'githubHandle', type: 'string',  indexed: false, internalType: 'string'  },
    ],
    anonymous: false,
  },
] as const;
