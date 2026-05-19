import { createConfig, createStorage, http } from 'wagmi';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';

const localStorageAdapter = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default';

const connectors =
  typeof window === 'undefined'
    ? []
    : [
        injected({
          target: {
            id: 'io.metamask',
            name: 'MetaMask',
            provider: 'isMetaMask',
          },
        }),
        coinbaseWallet({
          appName: 'GrantOS v3',
        }),
        injected({
          target: {
            id: 'me.rainbow',
            name: 'Rainbow',
            provider: 'isRainbow',
          },
        }),
        walletConnect({
          projectId,
          showQrModal: true,
          metadata: {
            name: 'GrantOS v3',
            description: 'Onchain grant enforcement protocol',
            url: typeof window !== 'undefined' ? window.location.origin : 'https://grantos.local',
            icons: [],
          },
        }),
        injected({
          target: {
            id: 'app.phantom',
            name: 'Phantom',
            provider: (window) =>
              window?.phantom?.ethereum ??
              (window?.ethereum?.isPhantom
                ? window.ethereum
                : window?.ethereum?.providers?.find((provider) => provider.isPhantom)),
          },
        }),
        injected({
          target: {
            id: 'io.rabby',
            name: 'Rabby Wallet',
            provider: 'isRabby',
          },
        }),
      ];

export const config = createConfig({
  chains: [arbitrum, arbitrumSepolia],
  connectors,
  transports: {
    [arbitrum.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
  ssr: true,
  storage: createStorage({
    storage: localStorageAdapter,
  }),
});
