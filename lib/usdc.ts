import { Address } from 'viem';
import type { Abi } from 'viem';

export const USDC_DECIMALS = 6;

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831') as Address;

// Frontend-only placeholder config.
// Inject the real ERC-20 ABI once contracts package is wired in.
export const usdcAbi: Abi | undefined = undefined;
