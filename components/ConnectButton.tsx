'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { Check, Copy, LogOut, Network, Wallet } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useDisconnect, useAccount } from 'wagmi';

/* Lazy-load the heavy modal so it doesn't bloat the initial bundle */
const WalletModal = dynamic(() => import('./WalletModal'), { ssr: false });

type ConnectButtonProps = {
  variant?: 'default' | 'green' | 'black' | 'avatar' | 'header';
};

function connectButtonClassNameForVariant(
  variant: ConnectButtonProps['variant']
): string {
  return variant === 'green'
    ? 'inline-flex min-w-[150px] items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600'
    : variant === 'black'
      ? 'inline-flex min-w-[150px] items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black'
      : variant === 'avatar'
        ? 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
        : variant === 'header'
          ? 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
          : 'inline-flex min-w-[150px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50';
}

/** Same footprint as the real control so layout does not jump; avoids SSR/client HTML drift. */
function WalletControlPlaceholder({ variant }: { variant: ConnectButtonProps['variant'] }) {
  const cls = connectButtonClassNameForVariant(variant);
  return (
    <div
      className={`${cls} pointer-events-none cursor-default select-none opacity-0`}
      aria-hidden
    >
      {variant === 'avatar' ? (
        <Wallet className="h-4 w-4" strokeWidth={2} />
      ) : (
        'Connect Wallet'
      )}
    </div>
  );
}

function ConnectedAccountMenu({
  variant,
  displayName,
  openChainModal,
}: {
  variant: NonNullable<ConnectButtonProps['variant']>;
  displayName: string;
  openChainModal: () => void;
}) {
  const { disconnect } = useDisconnect();
  const { address, chain } = useAccount();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const avatarLabel =
    displayName
      ?.replace(/^0x/i, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || '••';

  const explorerBase = chain?.blockExplorers?.default?.url;
  const explorerUrl =
    explorerBase && address ? `${explorerBase}/address/${address}` : null;

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const copyAddress = useCallback(async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [address]);

  const onDisconnect = useCallback(() => {
    setOpen(false);
    disconnect();
  }, [disconnect]);

  const triggerClass =
    variant === 'header'
      ? 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
      : variant === 'avatar'
        ? 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold tracking-[0.14em] text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
        : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50';

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      {variant !== 'header' ? (
        <button
          type="button"
          onClick={openChainModal}
          className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 md:inline-flex"
        >
        {chain?.name ?? 'Network'}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Wallet menu"
      >
        {variant === 'header' ? (
          <>
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#33211d] to-[#f0b46b] text-[10px] font-semibold text-white"
              aria-hidden
            >
              {avatarLabel}
            </span>
            <span className="max-w-[120px] truncate tabular-nums">{displayName}</span>
          </>
        ) : variant === 'avatar' ? (
          avatarLabel
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
            {displayName}
          </>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-80 w-[min(100vw-2rem,260px)] rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.25)]"
        >
          <p className="truncate px-2.5 py-1.5 font-mono text-xs text-slate-600">{address}</p>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={copyAddress}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
          >
            {copied ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
            ) : (
              <Copy className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
            )}
            {copied ? 'Copied' : 'Copy address'}
          </button>
          {explorerUrl ? (
            <a
              role="menuitem"
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <Network className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
              View on explorer
            </a>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openChainModal();
            }}
            className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50 ${
              variant === 'header' ? '' : 'md:hidden'
            }`}
          >
            <Network className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
            Switch network
          </button>
          <div className="my-1 h-px bg-slate-100" />
          <button
            type="button"
            role="menuitem"
            onClick={onDisconnect}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function ConnectButton({ variant = 'default' }: ConnectButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const connectButtonClassName = connectButtonClassNameForVariant(variant);

  return (
    <>
      <RainbowConnectButton.Custom>
        {({ mounted, account, chain, openChainModal }) => {
          if (!mounted) {
            return <WalletControlPlaceholder variant={variant} />;
          }

          if (!account || !chain) {
            return (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className={connectButtonClassName}
              >
                {variant === 'avatar' ? (
                  <Wallet className="h-4 w-4" strokeWidth={2} />
                ) : (
                  'Connect Wallet'
                )}
              </button>
            );
          }

          return (
            <ConnectedAccountMenu
              variant={variant}
              displayName={account.displayName}
              openChainModal={openChainModal}
            />
          );
        }}
      </RainbowConnectButton.Custom>

      {modalOpen && <WalletModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
