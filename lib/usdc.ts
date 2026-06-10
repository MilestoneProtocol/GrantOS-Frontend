import { getAddress } from 'viem';
import type { Abi } from 'viem';

export const USDC_DECIMALS = 6;

// getAddress throws at module load on a malformed or mis-checksummed env
// value, so a bad NEXT_PUBLIC_USDC_ADDRESS fails immediately with a clear
// message instead of surfacing mid-flow inside the approve transaction.
export const USDC_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_USDC_ADDRESS || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
);

export const usdcAbi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
