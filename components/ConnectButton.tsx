'use client'

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';

type ConnectButtonProps = {
  variant?: 'default' | 'green' | 'black' | 'avatar' | 'header';
};

export default function ConnectButton({
  variant = 'default',
}: ConnectButtonProps) {
  const connectButtonClassName =
    variant === 'green'
      ? 'inline-flex min-w-[150px] items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600'
      : variant === 'black'
        ? 'inline-flex min-w-[150px] items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black'
        : variant === 'avatar'
          ? 'inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
          : variant === 'header'
            ? 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
        : 'inline-flex min-w-[150px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50';

  return (
    <RainbowConnectButton.Custom>
      {({
        mounted,
        account,
        chain,
        openAccountModal,
        openConnectModal,
        openChainModal,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
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

        const avatarLabel =
          account.displayName
            ?.replace(/^0x/i, '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 2)
            .toUpperCase() || '••';

        if (variant === 'avatar') {
          return (
            <button
              type="button"
              onClick={openAccountModal}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-semibold tracking-[0.14em] text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Open wallet account"
            >
              {avatarLabel}
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {variant !== 'header' ? (
              <button
                type="button"
                onClick={openChainModal}
                className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 md:inline-flex"
              >
                {chain.name}
              </button>
            ) : null}
            <button
              type="button"
              onClick={openAccountModal}
              className={
                variant === 'header'
                  ? 'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
                  : 'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
              }
            >
              {variant === 'header' ? (
                <>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#33211d] to-[#f0b46b] text-[10px] font-semibold text-white"
                    aria-hidden
                  >
                    {avatarLabel}
                  </span>
                  <span className="max-w-[120px] truncate tabular-nums">{account.displayName}</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {account.displayName}
                </>
              )}
            </button>
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
