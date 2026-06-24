'use client';

// lib/wallet/WalletProvider.tsx
//
// Chain-agnostic wallet context. Auto-selects the active chain from the wallet
// the user connected: an EVM wallet (wagmi connectors) -> 'evm'; Freighter ->
// 'stellar'. Every action in lib/chain/* reads `chainKind` from here and routes
// to the matching EVM or Soroban code path.
//
// Must be mounted INSIDE the wagmi provider (providers/Web3Provider) so it can
// read EVM connection state via useAccount().

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import {
  connectFreighter,
  getFreighterAddress,
  getFreighterNetworkPassphrase,
} from '@/lib/stellar/freighter';
import { CHAIN_TARGET, STELLAR_NETWORK_PASSPHRASE } from '@/lib/stellar/client';

export type ChainKind = 'evm' | 'stellar';

interface WalletContextValue {
  /** Active chain, or null when nothing is connected. */
  chainKind: ChainKind | null;
  /** Active address (EVM 0x… or Stellar G…), or null. */
  address: string | null;
  isConnected: boolean;
  /** True when Freighter is connected but pointed at a different network than
   *  STELLAR_NETWORK_PASSPHRASE (e.g. user has Freighter set to Public/Mainnet
   *  instead of Testnet). The app can't switch this for the user — Freighter
   *  has no programmatic network-switch API — so this just drives a warning. */
  stellarNetworkMismatch: boolean;
  /** Connect Freighter (Stellar). EVM connect stays via the existing WalletModal. */
  connectStellar: () => Promise<void>;
  /** Mark EVM as the preferred chain (call when an EVM wallet connects). */
  selectEvm: () => void;
  disconnect: () => void;
}

const PREF_KEY = 'grantos_chain_pref';

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const [stellarAddress, setStellarAddress] = useState<string | null>(null);
  const [pref, setPref] = useState<ChainKind | null>(null);
  const [stellarNetworkMismatch, setStellarNetworkMismatch] = useState(false);

  const checkStellarNetwork = useCallback(async () => {
    const passphrase = await getFreighterNetworkPassphrase();
    setStellarNetworkMismatch(Boolean(passphrase) && passphrase !== STELLAR_NETWORK_PASSPHRASE);
  }, []);

  // Restore preference + any live Freighter session on mount.
  useEffect(() => {
    const saved = (typeof window !== 'undefined'
      ? (localStorage.getItem(PREF_KEY) as ChainKind | null)
      : null);
    if (saved) setPref(saved);
    getFreighterAddress().then((a) => {
      if (a) {
        setStellarAddress(a);
        void checkStellarNetwork();
      }
    });
  }, [checkStellarNetwork]);

  // When an EVM wallet connects via the existing modal, prefer EVM.
  useEffect(() => {
    if (evmConnected && pref !== 'evm') {
      setPref('evm');
      if (typeof window !== 'undefined') localStorage.setItem(PREF_KEY, 'evm');
    }
  }, [evmConnected, pref]);

  const connectStellar = useCallback(async () => {
    const addr = await connectFreighter();
    setStellarAddress(addr);
    setPref('stellar');
    if (typeof window !== 'undefined') localStorage.setItem(PREF_KEY, 'stellar');
    await checkStellarNetwork();
  }, [checkStellarNetwork]);

  const selectEvm = useCallback(() => {
    setPref('evm');
    if (typeof window !== 'undefined') localStorage.setItem(PREF_KEY, 'evm');
  }, []);

  const disconnect = useCallback(() => {
    if (pref === 'evm' && evmConnected) wagmiDisconnect();
    setStellarAddress(null);
    setPref(null);
    if (typeof window !== 'undefined') localStorage.removeItem(PREF_KEY);
  }, [pref, evmConnected, wagmiDisconnect]);

  const value = useMemo<WalletContextValue>(() => {
    // Resolve the active chain: honour the explicit preference if that side is
    // connected; otherwise fall back to whichever is connected; else the
    // configured default before any wallet is chosen.
    let chainKind: ChainKind | null = null;
    if (pref === 'stellar' && stellarAddress) chainKind = 'stellar';
    else if (pref === 'evm' && evmConnected) chainKind = 'evm';
    else if (evmConnected) chainKind = 'evm';
    else if (stellarAddress) chainKind = 'stellar';

    const address =
      chainKind === 'evm' ? (evmAddress ?? null)
      : chainKind === 'stellar' ? stellarAddress
      : null;

    return {
      chainKind,
      address,
      isConnected: chainKind !== null && address !== null,
      stellarNetworkMismatch: chainKind === 'stellar' && stellarNetworkMismatch,
      connectStellar,
      selectEvm,
      disconnect,
    };
  }, [pref, stellarAddress, evmConnected, evmAddress, stellarNetworkMismatch, connectStellar, selectEvm, disconnect]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    // Tolerate use outside the provider (e.g. during SSR) with a safe default
    // derived from the configured target.
    return {
      chainKind: CHAIN_TARGET === 'stellar' ? null : null,
      address: null,
      isConnected: false,
      stellarNetworkMismatch: false,
      connectStellar: async () => {},
      selectEvm: () => {},
      disconnect: () => {},
    };
  }
  return ctx;
}
