import { createConfig, createStorage, http } from 'wagmi';
import {
  coinbaseWallet,
  injected,
  metaMask,
  walletConnect,
} from 'wagmi/connectors';
import { arbitrumSepolia } from 'wagmi/chains';

/**
 * SSR-safe `Storage`-like adapter. The wagmi `createStorage()` helper expects
 * synchronous get/set/remove; we just shim `localStorage` and no-op on the
 * server.
 */
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

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

const APP_NAME = 'GrantOS';
const APP_DESCRIPTION = 'Onchain grant enforcement protocol';

/**
 * Lazily resolves the dapp URL so we use the real `window.location.origin`
 * at the moment the connector actually needs it. Using a fixed placeholder
 * (e.g. `https://grantos.local`) breaks WalletConnect mobile deep-link
 * redirect because the WC relay validates the metadata URL against the
 * project's allowed origins on the dashboard.
 */
function getAppUrl() {
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://grantos.app';
}

function getAppIcon() {
  if (typeof window !== 'undefined') return `${window.location.origin}/favicon.ico`;
  return 'https://grantos.app/favicon.ico';
}

const connectors = [
  /**
   * MetaMask — uses the official `@metamask/connect-evm` SDK. On desktop it
   * auto-discovers MetaMask via EIP-6963 (so it works even when Phantom or
   * Rabby has hijacked `window.ethereum`). On mobile, where there is no
   * injected provider at all, it falls back to MetaMask's deep-link flow
   * that hops over to the MM app and back via WalletConnect transport.
   */
  metaMask({
    dapp: {
      name: APP_NAME,
      url: getAppUrl(),
    },
  }),

  /**
   * Coinbase Wallet — official SDK, handles desktop extension + Smart Wallet
   * + mobile via its own SDK. No legacy flag detection.
   */
  coinbaseWallet({
    appName: APP_NAME,
    appLogoUrl: getAppIcon(),
  }),

  /**
   * WalletConnect — required for mobile wallets that don't have a dedicated
   * SDK (Rainbow, Trust, Zerion, etc.). The QR modal is enabled so users can
   * pair from any wallet on their phone.
   */
  walletConnect({
    projectId,
    showQrModal: true,
    metadata: {
      name: APP_NAME,
      description: APP_DESCRIPTION,
      url: getAppUrl(),
      icons: [getAppIcon()],
    },
  }),

  /**
   * Phantom — Phantom announces itself via EIP-6963 *sometimes* (depends on
   * extension version) and also exposes `window.phantom.ethereum` reliably.
   * We declare it explicitly so the wallet is always visible in the modal
   * and we can prefer Phantom's own namespace over the (possibly hijacked)
   * `window.ethereum`.
   */
  injected({
    target: () => ({
      id: 'app.phantom',
      name: 'Phantom',
      provider:
        typeof window === 'undefined'
          ? undefined
          : (window as unknown as {
              phantom?: { ethereum?: unknown };
              ethereum?: {
                isPhantom?: boolean;
                providers?: Array<{ isPhantom?: boolean }>;
              };
            }).phantom?.ethereum ??
            ((window as any)?.ethereum?.isPhantom
              ? (window as any).ethereum
              : (window as any)?.ethereum?.providers?.find(
                  (p: any) => p?.isPhantom,
                )),
    }),
  }),

  /**
   * Rainbow + Rabby — *intentionally not declared here.* Both wallets
   * announce themselves via EIP-6963 (MIPD), which `createConfig` already
   * subscribes to (see `multiInjectedProviderDiscovery: true` below). If we
   * declared them as `injected({ provider: 'isRainbow' })`, the legacy flag
   * check fails on Chrome whenever another wallet hijacks `window.ethereum`,
   * AND wagmi would skip the EIP-6963 announcement because the rdns is
   * already claimed by our manual entry. Letting MIPD discover them gives
   * us the modern, reliable detection.
   */
];

export const config = createConfig({
  chains: [arbitrumSepolia],
  connectors,
  transports: {
    [arbitrumSepolia.id]: http(),
  },
  ssr: true,
  multiInjectedProviderDiscovery: true,
  storage: createStorage({
    storage: localStorageAdapter,
  }),
});
