// lib/stellar/freighter.ts
//
// Thin wrapper over @stellar/freighter-api — the Stellar counterpart to the
// wagmi/RainbowKit connectors in components/ConnectButton.tsx. Freighter is the
// reference browser wallet for Stellar/Soroban.

import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from '@stellar/freighter-api';
import { STELLAR_NETWORK_PASSPHRASE } from './client';

export async function isFreighterInstalled(): Promise<boolean> {
  const res = await isConnected();
  return !!res.isConnected;
}

/** Prompt the user to connect Freighter and return their G… public key. */
export async function connectFreighter(): Promise<string> {
  if (!(await isFreighterInstalled())) {
    throw new Error('Freighter wallet not detected. Install it from https://freighter.app');
  }
  const allowed = await isAllowed();
  if (!allowed.isAllowed) {
    await setAllowed();
  }
  const access = await requestAccess();
  if (access.error) throw new Error(String(access.error));
  return access.address;
}

export async function getFreighterAddress(): Promise<string | null> {
  const res = await getAddress();
  if (res.error || !res.address) return null;
  return res.address;
}

/** Warn (don't block) if Freighter is pointed at a different network than ours. */
export async function getFreighterNetworkPassphrase(): Promise<string | null> {
  const res = await getNetwork();
  return res.networkPassphrase ?? null;
}

/**
 * Sign an assembled Soroban transaction XDR with Freighter.
 * Returns the signed transaction envelope XDR for submission.
 */
export async function signWithFreighter(xdr: string, address: string): Promise<string> {
  const result = await signTransaction(xdr, {
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    address,
  });
  if (result.error) throw new Error(String(result.error));
  return result.signedTxXdr;
}
