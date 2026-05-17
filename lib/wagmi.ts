import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rabbyWallet,
  phantomWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createStorage } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';

const sessionStorageAdapter = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, value);
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(key);
  },
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default';

/**
 * Register explicit wallets only so the custom modal can target each wallet
 * reliably instead of hitting a generic injected connector.
 */
const wallets = [
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet,
      phantomWallet,
      rainbowWallet,
      rabbyWallet,
      coinbaseWallet,
      walletConnectWallet,
    ],
  },
];

export const config = getDefaultConfig({
  appName: 'GrantOS v3',
  projectId,
  chains: [arbitrum, arbitrumSepolia],
  ssr: true,
  wallets,
  multiInjectedProviderDiscovery: false,
  storage: createStorage({
    storage: sessionStorageAdapter,
  }),
});
