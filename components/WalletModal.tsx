'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConnect, useAccount, type Connector } from 'wagmi';
import { X, AlertCircle, RefreshCw } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type ModalState = 'idle' | 'connecting' | 'error';

interface WalletModalProps {
  onClose: () => void;
}

/* ─── Inline SVG wallet icons ─────────────────────────────────────────────── */

function MetaMaskIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect width="40" height="40" rx="10" fill="#F6851B" />
      <path d="M31.6 8L21.2 15.6l1.9-4.5L31.6 8z" fill="#E2761B" stroke="#E2761B" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.4 8l10.3 7.7-1.8-4.6L8.4 8z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M27.8 25.8l-2.8 4.2 6 1.7 1.7-5.8-4.9-.1zM7.3 25.9l1.7 5.8 6-1.7-2.8-4.2-4.9.1z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.7 19.3l-1.7 2.5 6 .3-.2-6.4-4.1 3.6zM25.3 19.3l-4.2-3.7-.1 6.5 6-.3-1.7-2.5z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 30l3.5-1.7-3-2.3-.5 4zM21.5 28.3l3.5 1.7-.6-4-3 2.3z" fill="#E4761B" stroke="#E4761B" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoinbaseIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect width="40" height="40" rx="10" fill="#0052FF" />
      <path d="M20 8C13.37 8 8 13.37 8 20s5.37 12 12 12 12-5.37 12-12S26.63 8 20 8zm0 18.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z" fill="white" />
      <rect x="16.5" y="17.5" width="7" height="5" rx="1.5" fill="white" />
    </svg>
  );
}

function RainbowIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect width="40" height="40" rx="10" fill="url(#rainbow-grad)" />
      <defs>
        <linearGradient id="rainbow-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B6B" />
          <stop offset=".33" stopColor="#FFD93D" />
          <stop offset=".66" stopColor="#6BCB77" />
          <stop offset="1" stopColor="#4D96FF" />
        </linearGradient>
      </defs>
      <path d="M10 26c0-5.5 4.5-10 10-10s10 4.5 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M13 26c0-3.9 3.1-7 7-7s7 3.1 7 7" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".7" />
      <path d="M16 26c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".4" />
    </svg>
  );
}

function WalletConnectIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect width="40" height="40" rx="10" fill="#3B99FC" />
      <path d="M12.5 18.8c4.1-4 10.9-4 15 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.8-7.5-2.8-10.4 0l-.7.7c-.1.1-.3.1-.4 0L11.7 20c-.2-.2-.2-.5 0-.7l.8-.5zm18.5 3.5l1.5 1.5c.2.2.2.5 0 .7l-6.7 6.5c-.2.2-.5.2-.7 0L21 26.8c-.1-.1-.2-.1-.4 0l-4.1 4.2c-.2.2-.5.2-.7 0L9.1 24.5c-.2-.2-.2-.5 0-.7l1.5-1.5c.2-.2.5-.2.7 0l4.1 4.2c.1.1.2.1.4 0l4.1-4.2c.2-.2.5-.2.7 0l4.1 4.2c.1.1.2.1.4 0l4.2-4.2c.2-.2.5-.2.7 0z" fill="white" />
    </svg>
  );
}

function PhantomIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect width="40" height="40" rx="10" fill="#AB9FF2" />
      <path fillRule="evenodd" clipRule="evenodd" d="M20.3 9C14.2 9 9.3 13.7 9 19.8c-.1 1.8.2 3.5.8 5.1.7 1.8 2.3 3 4.2 3.1 1.1.1 2.1-.3 2.9-1l.5-.5c.5-.5 1-.7 1.6-.7.6 0 1.1.2 1.6.7l.5.5c.8.7 1.8 1.1 2.9 1 1.9-.1 3.5-1.3 4.2-3.1.6-1.6.9-3.3.8-5.1C28.7 13.7 24.3 9 20.3 9zm-3 11.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5 1.5.7 1.5 1.5zm5 1.5c.8 0 1.5-.7 1.5-1.5s-.7-1.5-1.5-1.5-1.5.7-1.5 1.5.7 1.5 1.5 1.5z" fill="white" />
    </svg>
  );
}

function RabbyIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect width="40" height="40" rx="10" fill="#8697FF" />
      <path d="M28 17c0-3.9-3.6-7-8-7s-8 3.1-8 7c0 1.3.4 2.6 1.1 3.6L11 29h18l-2.1-8.4C27.6 19.6 28 18.3 28 17z" fill="white" />
      <circle cx="16" cy="17" r="1.5" fill="#8697FF" />
      <circle cx="24" cy="17" r="1.5" fill="#8697FF" />
    </svg>
  );
}

/* ─── Wallet defs ─────────────────────────────────────────────────────────── */

/**
 * Connector matchers are LOWERCASED tokens we compare against each connector's
 * id / name / type / rdns (also lowercased). We list every shape a wallet
 * could surface as:
 *   - manual declaration in `lib/wagmi.ts` (e.g. `metaMaskSDK`, `coinbaseWalletSDK`)
 *   - EIP-6963 announcement (rdns: `io.metamask`, `io.rabby`, `me.rainbow`, …)
 *   - legacy injected id (e.g. `metamask`, `rainbow`)
 *
 * The `installUrl` is used when the user taps a wallet that's not present
 * (e.g. mobile browser with no extension and no app installed). We hand them
 * a deep link to the wallet's app/extension store instead of throwing
 * "Provider not found".
 */
const WALLET_DEFS = [
  {
    id: 'io.metamask',
    label: 'MetaMask',
    description: 'Browser extension & mobile',
    icon: MetaMaskIcon,
    connectorMatchers: [
      'io.metamask',
      'io.metamask.mobile',
      'metamask',
      'metamasksdk',
    ],
    installUrl: 'https://metamask.io/download/',
  },
  {
    id: 'com.coinbase.wallet',
    label: 'Coinbase Wallet',
    description: 'Smart Wallet & extension',
    icon: CoinbaseIcon,
    connectorMatchers: [
      'com.coinbase.wallet',
      'coinbase',
      'coinbase wallet',
      'coinbasewallet',
      'coinbasewalletsdk',
    ],
    installUrl: 'https://www.coinbase.com/wallet/downloads',
  },
  {
    id: 'me.rainbow',
    label: 'Rainbow',
    description: 'Mobile & extension',
    icon: RainbowIcon,
    connectorMatchers: ['me.rainbow', 'rainbow', 'rainbow wallet'],
    installUrl: 'https://rainbow.me/download',
  },
  {
    id: 'walletConnect',
    label: 'WalletConnect',
    description: 'Scan with any wallet',
    icon: WalletConnectIcon,
    connectorMatchers: ['walletconnect', 'wallet connect'],
    installUrl: undefined,
  },
  {
    id: 'app.phantom',
    label: 'Phantom',
    description: 'Multi-chain wallet',
    icon: PhantomIcon,
    connectorMatchers: ['app.phantom', 'phantom'],
    installUrl: 'https://phantom.app/download',
  },
  {
    id: 'io.rabby',
    label: 'Rabby Wallet',
    description: 'Browser extension',
    icon: RabbyIcon,
    connectorMatchers: ['io.rabby', 'rabby', 'rabby wallet'],
    installUrl: 'https://rabby.io/',
  },
] as const;

function getConnectorTokens(connector: Connector): string[] {
  const rdns = 'rdns' in connector
    ? Array.isArray(connector.rdns)
      ? connector.rdns
      : connector.rdns
        ? [connector.rdns]
        : []
    : [];

  return [
    connector.id,
    connector.name,
    connector.type,
    ...rdns,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
}

function resolveWalletConnector(
  connectors: readonly Connector[],
  walletId: string,
  matchers: string[],
): Connector | undefined {
  const normalizedMatchers = matchers.map((token) => token.toLowerCase());

  // Pass 1: prefer connectors whose `rdns` matches. EIP-6963-discovered
  // wallets always set `rdns` (it's literally how wallets announce
  // themselves), so this prioritises the wallet's *real* injected provider
  // over any manually-declared injected connector that may not be able to
  // resolve its provider in a multi-wallet Chrome.
  const byRdns = connectors.find((candidate) => {
    const rdns =
      'rdns' in candidate
        ? Array.isArray(candidate.rdns)
          ? candidate.rdns
          : candidate.rdns
            ? [candidate.rdns]
            : []
        : [];
    return rdns.some((value) =>
      normalizedMatchers.includes(value.toLowerCase()),
    );
  });
  if (byRdns) return byRdns;

  // Pass 2: exact match on any of id/name/type.
  const exact = connectors.find((candidate) => {
    const candidateTokens = getConnectorTokens(candidate);
    return normalizedMatchers.some((token) => candidateTokens.includes(token));
  });
  if (exact) return exact;

  // Pass 3: substring match (handles e.g. `metamasksdk` vs `metamask`).
  const partial = connectors.find((candidate) => {
    const candidateTokens = getConnectorTokens(candidate);
    return normalizedMatchers.some((token) =>
      candidateTokens.some(
        (candidateToken) =>
          candidateToken.includes(token) || token.includes(candidateToken),
      ),
    );
  });
  if (partial) return partial;

  if (walletId === 'walletConnect') {
    return connectors.find((candidate) =>
      getConnectorTokens(candidate).some((token) =>
        token.includes('walletconnect'),
      ),
    );
  }

  return undefined;
}

/* ─── Loading dots ────────────────────────────────────────────────────────── */

function LoadingDots() {
  return (
    <div className="flex items-center gap-1" aria-label="Connecting…">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-slate-400 animate-wallet-dot"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </div>
  );
}

/* ─── Main modal ──────────────────────────────────────────────────────────── */

export default function WalletModal({ onClose }: WalletModalProps) {
  const { connectors, connect } = useConnect();
  const { isConnected } = useAccount();
  const [state, setState] = useState<ModalState>('idle');
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  /* Close on successful connection */
  useEffect(() => {
    if (isConnected) onClose();
  }, [isConnected, onClose]);

  /* Cleanup timeout on unmount */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /* Lock page scroll while modal is open — backdrop is fixed but body can still scroll without this */
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarW > 0) document.body.style.paddingRight = `${scrollbarW}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  /* Trap focus inside modal */
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusables = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleConnect = useCallback(
    (walletId: string) => {
      if (state === 'connecting') return;

      const walletDef = WALLET_DEFS.find((wallet) => wallet.id === walletId);
      const matchers = walletDef?.connectorMatchers.map((token) =>
        token.toLowerCase(),
      ) ?? [walletId.toLowerCase()];
      const connector = resolveWalletConnector(connectors, walletId, matchers);

      if (!connector) {
        // No connector matched — most often this means the user is on mobile
        // without the wallet's app/extension installed, or the wallet didn't
        // announce via EIP-6963. Offer the install page instead of dead-ending
        // on "Provider not found".
        if (walletDef?.installUrl && typeof window !== 'undefined') {
          window.open(walletDef.installUrl, '_blank', 'noopener,noreferrer');
          return;
        }
        setState('error');
        setErrorMsg(
          `${walletDef?.label ?? 'This wallet'} isn't available in this browser. Try WalletConnect to pair from your phone.`,
        );
        return;
      }

      setState('connecting');
      setConnectingId(walletId);
      setErrorMsg('');

      /* Safety timeout — prevents infinite spinner */
      timeoutRef.current = setTimeout(() => {
        setState('error');
        setErrorMsg('Connection timed out. Please unlock your wallet and try again.');
        setConnectingId(null);
      }, 15_000);

      connect(
        { connector },
        {
          onSuccess: () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            /* onClose called via useEffect watching isConnected */
          },
          onError: (err) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setState('error');
            setConnectingId(null);
            const msg =
              err?.message?.includes('User rejected')
                ? 'Connection rejected. Please approve in your wallet.'
                : err?.message?.slice(0, 120) || 'Connection failed. Please try again.';
            setErrorMsg(msg);
          },
        }
      );
    },
    [state, connectors, connect]
  );

  function handleRetry() {
    setState('idle');
    setConnectingId(null);
    setErrorMsg('');
  }

  return createPortal(
    /* Portaled to document.body so sticky headers / isolate / overflow parents cannot trap stacking. */
    <div
      className="fixed inset-0 z-10000 isolate flex items-center justify-center overflow-hidden p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Connect Wallet"
      onClick={onClose}
    >
      {/* Frosted glass backdrop — keep some separation without over-blurring the page */}
      <div
        className="pointer-events-none absolute inset-0 bg-slate-950/45 backdrop-blur supports-backdrop-filter:bg-slate-900/30 animate-wallet-backdrop"
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={[
          'relative z-10 w-full max-w-[440px] max-h-[min(90dvh,720px)] overflow-hidden rounded-3xl border border-white/50 bg-white/92 shadow-[0_32px_80px_-16px_rgba(15,23,42,0.38)] backdrop-blur-xl',
          'supports-backdrop-filter:bg-white/80',
          'animate-wallet-modal',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-2 pt-6 sm:px-7 sm:pt-7">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Connect wallet</h2>
            <p className="mt-0.5 text-xs text-slate-500">Choose your wallet to get started</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" strokeWidth={2.5} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-slate-100 sm:mx-7" />

        {/* Error banner */}
        {state === 'error' && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 sm:mx-7">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="flex-1 text-sm leading-snug text-red-700">{errorMsg}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* Wallet list — scroll inside card on short viewports */}
        <ul className="max-h-[min(52dvh,420px)] space-y-1.5 overflow-y-auto overscroll-contain px-4 py-4 sm:max-h-[min(48dvh,400px)] sm:px-5 sm:py-5">
          {WALLET_DEFS.map((w) => {
            const isThisConnecting = state === 'connecting' && connectingId === w.id;
            const disabled = state === 'connecting';

            return (
              <li key={w.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => handleConnect(w.id)}
                  className={[
                    'group relative flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left',
                    'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
                    isThisConnecting
                      ? 'border-indigo-200 bg-indigo-50/60 shadow-sm'
                      : disabled
                        ? 'cursor-not-allowed border-slate-100 bg-white opacity-50'
                        : 'cursor-pointer border-slate-100 bg-white hover:-translate-y-px hover:border-slate-300 hover:shadow-md active:scale-[0.98] active:shadow-none',
                  ].join(' ')}
                >
                  {/* Wallet icon */}
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-slate-100">
                    <w.icon />
                  </span>

                  {/* Labels */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-none">{w.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{w.description}</p>
                  </div>

                  {/* Right side — loading dots or chevron */}
                  <span className="shrink-0">
                    {isThisConnecting ? (
                      <LoadingDots />
                    ) : (
                      <svg
                        viewBox="0 0 16 16"
                        className="h-4 w-4 text-slate-300 transition group-hover:text-slate-500 group-hover:translate-x-0.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M6 3l5 5-5 5" />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="px-6 pb-6 text-center sm:px-7 sm:pb-7">
          <p className="text-[11px] text-slate-400">
            By connecting, you agree to the{' '}
            <a href="#" className="font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
