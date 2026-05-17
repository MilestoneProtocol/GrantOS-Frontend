import { connectorsForWallets, getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  phantomWallet,
  rabbyWallet,
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

const wallets = [
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet,
      rainbowWallet,
      coinbaseWallet,
      walletConnectWallet,
      rabbyWallet,
      phantomWallet,
    ],
  },
];

export const config = getDefaultConfig({
  appName: 'GrantOS v3',
  projectId,
  chains: [arbitrumSepolia, arbitrum],
  ssr: true,
  wallets,
  storage: createStorage({
    storage: sessionStorageAdapter,
  }),
});
