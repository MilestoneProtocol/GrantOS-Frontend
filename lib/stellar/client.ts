// lib/stellar/client.ts
//
// Stellar / Soroban client configuration for the GrantOS ZK identity flow.
// This is the Stellar counterpart to the EVM wiring in lib/wagmi.ts + lib/contracts.ts.
//
// On EVM, identity verification submits the oracle's 65-byte ECDSA signature and
// the contract checks it with `ecrecover` (OracleAttestationVerifier). On Stellar
// we instead submit the *real Noir UltraHonk proof* to a Soroban verifier, which
// checks it on-chain using Protocol 25/26 BN254 + Poseidon host functions.

import { rpc, Networks } from '@stellar/stellar-sdk';

/** Soroban RPC endpoint (testnet by default). */
export const STELLAR_RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';

/** Network passphrase — must match the deployed contracts' network. */
export const STELLAR_NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;

/** Deployed `grant_identity_registry` contract id (C…). */
export const STELLAR_REGISTRY_ID = process.env.NEXT_PUBLIC_STELLAR_REGISTRY_ID ?? '';

/** Deployed `ultrahonk_verifier` contract id (C…) — informational; the registry
 *  calls it internally, the frontend never calls it directly. */
export const STELLAR_VERIFIER_ID = process.env.NEXT_PUBLIC_STELLAR_VERIFIER_ID ?? '';

/** Deployed `grant_factory` contract id (C…). */
export const STELLAR_FACTORY_ID = process.env.NEXT_PUBLIC_STELLAR_FACTORY_ID ?? '';

/** Deployed `grant_sentinel` contract id (C…). */
export const STELLAR_SENTINEL_ID = process.env.NEXT_PUBLIC_STELLAR_SENTINEL_ID ?? '';

/** USDC Stellar Asset Contract id (C…). */
export const STELLAR_USDC_ID = process.env.NEXT_PUBLIC_STELLAR_USDC_ID ?? '';

/** Which chain the verify flow targets. `evm` keeps the original Arbitrum path. */
export const CHAIN_TARGET = (process.env.NEXT_PUBLIC_CHAIN_TARGET ?? 'evm') as 'evm' | 'stellar';

let _server: rpc.Server | null = null;

/** Lazily-constructed Soroban RPC server (read state, simulate, send tx). */
export function getSorobanServer(): rpc.Server {
  if (!_server) {
    _server = new rpc.Server(STELLAR_RPC_URL, {
      allowHttp: STELLAR_RPC_URL.startsWith('http://'),
    });
  }
  return _server;
}

export function assertStellarConfigured(): void {
  if (!STELLAR_REGISTRY_ID) {
    throw new Error(
      'Stellar registry not configured. Set NEXT_PUBLIC_STELLAR_REGISTRY_ID (and ' +
        'NEXT_PUBLIC_STELLAR_RPC_URL / NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE) in .env.local.',
    );
  }
}
