import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { createStorage } from 'wagmi';
import { arbitrum } from 'wagmi/chains';

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

export const config = getDefaultConfig({
  appName: 'GrantOS v3',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default',
  chains: [arbitrum],
  ssr: true,
  storage: createStorage({
    storage: sessionStorageAdapter,
  }),
});
