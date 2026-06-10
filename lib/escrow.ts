import { getAddress } from 'viem';
import type { Abi } from 'viem';

// getAddress throws at module load on malformed or mis-checksummed env
// values, so a bad address fails immediately with a clear message instead
// of surfacing mid-flow inside a transaction.
export const GRANT_FACTORY_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_GRANT_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000003'
);

export const GRANT_ESCROW_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_GRANT_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000001'
);

export const IDENTITY_REGISTRY_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000002'
);

export const CONTRACTS_READY =
  GRANT_FACTORY_ADDRESS !== '0x0000000000000000000000000000000000000003';

export const ESCROW_READY =
  GRANT_ESCROW_ADDRESS !== '0x0000000000000000000000000000000000000001';

/** Minimal ABI for `GrantIdentityRegistry.getIdentity(address)` reads from the UI. */
export const identityRegistryAbi = [
  {
    type: 'function',
    name: 'isVerified',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'getIdentity',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'isVerified', type: 'bool' },
          { name: 'tier', type: 'uint256' },
          { name: 'githubId', type: 'uint256' },
          { name: 'createdYear', type: 'uint256' },
          { name: 'githubHandle', type: 'string' },
        ],
      },
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
    inputs: [],
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
              { name: 'state', type: 'uint8' },
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
      { name: 'milestoneIndex', type: 'uint256' },
    ],
    outputs: [{ name: 'status', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'getSubmission',
    stateMutability: 'view',
    inputs: [{ name: 'milestoneId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'proofHash', type: 'bytes32' },
          { name: 'easAttestationUid', type: 'bytes32' },
          { name: 'builderSummary', type: 'string' },
          { name: 'submittedAt', type: 'uint256' },
          { name: 'approvalCount', type: 'uint256' },
          { name: 'rejectionCount', type: 'uint256' },
        ],
      },
    ],
  },
] as const satisfies Abi;

/** Pending = open for builder submission (must match `getMilestoneStatus` onchain enum). */
export const MILESTONE_STATUS_PENDING = 0;
export const MILESTONE_STATUS_SUBMITTED = 1;
export const MILESTONE_STATUS_APPROVED = 2;
export const MILESTONE_STATUS_REJECTED = 3;
export const MILESTONE_STATUS_SLASHED = 4;
export const MILESTONE_STATUS_STREAMING = 5;

export const grantFactoryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_implementation",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_usdc",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_registry",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_sentinel",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_superfluid",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_verifier",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createGrant",
    "inputs": [
      {
        "name": "grantee",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "streaming",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "committee",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "quorum",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestones",
        "type": "tuple[]",
        "internalType": "struct GrantEscrow.MilestoneInput[]",
        "components": [
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proofType",
            "type": "uint8",
            "internalType": "enum GrantEscrow.ProofType"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "grantId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "escrowAddr",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "grantCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grants",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "implementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "sentinel",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "superfluid",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifier",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "usdc",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "GrantCreated",
    "inputs": [
      {
        "name": "grantId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "escrow",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "grantor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "grantee",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "totalAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
] as const satisfies Abi;

export const grantEscrowAbi = [
  {
    "type": "function",
    "name": "approveMilestone",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelGrant",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelled",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "committee",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createdAt",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getGrant",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct GrantEscrow.GrantView",
        "components": [
          {
            "name": "builder",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "streaming",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "committee",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "quorum",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "milestones",
            "type": "tuple[]",
            "internalType": "struct GrantEscrow.Milestone[]",
            "components": [
              {
                "name": "title",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "description",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "deadline",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "proofType",
                "type": "uint8",
                "internalType": "enum GrantEscrow.ProofType"
              },
              {
                "name": "state",
                "type": "uint8",
                "internalType": "enum GrantEscrow.MilestoneState"
              }
            ]
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getMilestoneCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getMilestoneStatus",
    "inputs": [
      {
        "name": "milestoneIndex",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum GrantEscrow.MilestoneState"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSubmission",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct GrantEscrow.Submission",
        "components": [
          {
            "name": "proofHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "easAttestationUid",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "builderSummary",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "submittedAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "approvalCount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rejectionCount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantee",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grantor",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasVoted",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "_usdc",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_registry",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_sentinel",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_superfluid",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_grantor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_grantee",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_isStreaming",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "_committee",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "_quorum",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_milestones",
        "type": "tuple[]",
        "internalType": "struct GrantEscrow.MilestoneInput[]",
        "components": [
          {
            "name": "title",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proofType",
            "type": "uint8",
            "internalType": "enum GrantEscrow.ProofType"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isStreaming",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "milestones",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "title",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "description",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "proofType",
        "type": "uint8",
        "internalType": "enum GrantEscrow.ProofType"
      },
      {
        "name": "state",
        "type": "uint8",
        "internalType": "enum GrantEscrow.MilestoneState"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifier",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract INoirVerifier"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "quorum",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "registry",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IGrantIdentityRegistry"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rejectMilestone",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "sentinel",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract ISentinelEAS"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setProofVerifier",
    "inputs": [
      {
        "name": "_verifier",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "slashMilestone",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitMilestone",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "proof",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "publicInputs",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      },
      {
        "name": "easAttestationUid",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "builderSummary",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submissions",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "proofHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "easAttestationUid",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "builderSummary",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "submittedAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "approvalCount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "rejectionCount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "superfluid",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract ISuperfluidMock"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "usdc",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "GrantCancelled",
    "inputs": [
      {
        "name": "grantor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "refundedAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneApproved",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "streaming",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneRejected",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "rejectionCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneSubmitted",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "builder",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "proofHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "easAttestationUid",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "builderSummary",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VoteCast",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "voter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "approvalCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "rejectionCount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
] as const satisfies Abi;

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

// ── On-chain event ABIs (match the deployed contracts) ────────────────────
//
// These mirror the events as actually emitted on-chain. Grants are deployed
// one escrow per grant, so lifecycle events come from each escrow and carry no
// grantId/title (the escrow IS the grant). `GrantCreated` comes from the
// factory, and `WarningIssued` from the shared SentinelEAS.

/** Lifecycle events emitted by each per-grant `GrantEscrow`. */
export const escrowLifecycleEventsAbi = [
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
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'milestoneId', type: 'uint256', indexed: true },
      { name: 'voter', type: 'address', indexed: true },
      { name: 'approved', type: 'bool', indexed: false },
      { name: 'approvalCount', type: 'uint256', indexed: false },
      { name: 'rejectionCount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneApproved',
    inputs: [
      { name: 'milestoneId', type: 'uint256', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'streaming', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneRejected',
    inputs: [
      { name: 'milestoneId', type: 'uint256', indexed: true },
      { name: 'rejectionCount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MilestoneSlashed',
    inputs: [
      { name: 'milestoneId', type: 'uint256', indexed: true },
      { name: 'grantor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'slashedAt', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'GrantCancelled',
    inputs: [
      { name: 'grantor', type: 'address', indexed: true },
      { name: 'refundedAmount', type: 'uint256', indexed: false },
    ],
  },
] as const satisfies Abi;

/** `GrantCreated`, emitted by the `GrantFactory` (a single contract). */
export const factoryGrantCreatedEventsAbi = [
  {
    type: 'event',
    name: 'GrantCreated',
    inputs: [
      { name: 'grantId', type: 'uint256', indexed: true },
      { name: 'escrow', type: 'address', indexed: true },
      { name: 'grantor', type: 'address', indexed: true },
      { name: 'grantee', type: 'address', indexed: false },
      { name: 'totalAmount', type: 'uint256', indexed: false },
    ],
  },
] as const satisfies Abi;

/** `WarningIssued`, emitted by the shared `SentinelEAS` contract. */
export const sentinelWarningEventsAbi = [
  {
    type: 'event',
    name: 'WarningIssued',
    inputs: [
      { name: 'grantId', type: 'bytes32', indexed: true },
      { name: 'milestoneIndex', type: 'uint256', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'attestationUid', type: 'bytes32', indexed: false },
      { name: 'message', type: 'string', indexed: false },
    ],
  },
] as const satisfies Abi;

/** Reads the shared SentinelEAS address from a deployed escrow. */
export const escrowMetaAbi = [
  {
    type: 'function',
    name: 'grantId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'sentinel',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const satisfies Abi;
