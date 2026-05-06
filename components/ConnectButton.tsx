'use client'

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

type ConnectButtonProps = {
  variant?: 'default' | 'green' | 'black';
};

export default function ConnectButton({
  variant = 'default',
}: ConnectButtonProps) {
  const connectButtonClassName =
    variant === 'green'
      ? 'inline-flex min-w-[150px] items-center justify-center rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600'
      : variant === 'black'
        ? 'inline-flex min-w-[150px] items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black'
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
              Connect Wallet
            </button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openChainModal}
              className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 md:inline-flex"
            >
              {chain.name}
            </button>
            <button
              type="button"
              onClick={openAccountModal}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {account.displayName}
            </button>
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
