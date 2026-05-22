'use client';

import ConnectButton from '@/components/ConnectButton';
import { useRedirectIfAlreadyVerified } from '@/hooks/useRedirectIfAlreadyVerified';
import { api } from '@/lib/api';
import { Check, Circle } from 'lucide-react';
import { useState } from 'react';
import { useAccount } from 'wagmi';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default function VerifyIdentity() {
  const { isConnected, chain, address } = useAccount();
  useRedirectIfAlreadyVerified();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    {
      title: 'Wallet Connection',
      status: isConnected ? 'completed' : 'active',
      description: isConnected
        ? `Connected to ${chain?.name || 'Arbitrum'}`
        : 'Awaiting Connection',
    },
    {
      title: 'GitHub OAuth',
      status: isConnected ? 'active' : 'pending',
      description: isConnected ? 'In Progress' : 'Requires Wallet',
    },
    { title: 'ZK Proof Generation', status: 'pending' },
    { title: 'Onchain Submission', status: 'pending' },
  ];

  async function handleConnectGitHub() {
    if (!isConnected || !address) return;
    setLoading(true);
    setError(null);
    try {
      const { requestId } = await api.post<{ success: boolean; requestId: string }>(
        '/identity/init',
        { walletAddress: address },
      );
      const { oauthUrl } = await api.get<{ oauthUrl: string; requestId: string }>(
        `/identity/oauth-url/${requestId}`,
      );
      window.location.href = oauthUrl;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('409') || msg.includes('already completed')) {
        window.location.href = '/verify/success';
        return;
      }
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-100 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
              <span className="text-sm font-bold text-white">G</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 sm:text-lg">
              GrantOS v3
            </h1>
            <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 sm:inline-flex">
              Arbitrum Sepolia
            </div>
          </div>
          {isConnected ? (
            <ConnectButton variant="header" />
          ) : (
            <ConnectButton variant="black" />
          )}
        </div>
      </header>

      <div className="flex flex-1 items-center px-4 pb-6 pt-0 sm:px-6 sm:pb-8">
        <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-6xl flex-col rounded-3xl border-x border-b border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] lg:min-h-[680px]">
          <main className="flex flex-1 flex-col lg:flex-row">
            <aside className="w-full border-b border-slate-100 bg-slate-50/60 p-6 lg:w-[280px] lg:border-b-0 lg:border-r lg:p-8">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">
                Verification Flow
              </h2>
              <div className="mt-6 flex flex-col">
                {steps.map((step, idx) => (
                  <div key={idx} className="relative pb-7 last:pb-0">
                    {idx !== steps.length - 1 && (
                      <div
                        className={`absolute left-[11px] top-6 h-full w-px ${
                          step.status === 'completed' ? 'bg-blue-500' : 'bg-slate-200'
                        }`}
                      />
                    )}
                    <div className="relative z-10 flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {step.status === 'completed' ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500 bg-white">
                            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
                          </div>
                        ) : step.status === 'active' ? (
                          <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white">
                            <div className="animate-spin-slow absolute inset-[3px] rounded-full border border-blue-500 border-r-transparent border-b-transparent" />
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          </div>
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-semibold text-slate-400">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="pt-0.5">
                        <p
                          className={`text-sm font-bold ${
                            step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {step.title}
                        </p>
                        {step.description ? (
                          <p
                            className={`mt-0.5 text-xs ${
                              step.status === 'active' ? 'text-blue-500' : 'text-slate-500'
                            }`}
                          >
                            {step.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-10">
              <div className="w-full max-w-[460px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.08)]">
                <div className="flex items-start gap-4 border-b border-slate-100 px-5 py-6 sm:px-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <GithubIcon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div className="space-y-2 text-left">
                    <h2 className="text-[22px] font-bold leading-tight text-slate-900">
                      Link GitHub Identity
                    </h2>
                    <p className="text-sm leading-7 text-slate-500">
                      GrantOS uses Noir ZK Coprocessor to cryptographically
                      bind your GitHub contributions to your Arbitrum wallet. We
                      will request read-only access to your public profile.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center px-5 py-10 text-center sm:px-6 sm:py-14">
                  <button
                    onClick={handleConnectGitHub}
                    disabled={!isConnected || loading}
                    className={`inline-flex min-h-11 w-full max-w-[240px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                      isConnected && !loading
                        ? 'bg-[#24292e] text-white shadow-md hover:bg-[#1b1f23]'
                        : 'cursor-not-allowed bg-slate-200 text-slate-400'
                    }`}
                  >
                    <GithubIcon className="h-4 w-4" />
                    {loading ? 'Redirecting...' : 'Connect GitHub Account'}
                  </button>

                  {error && (
                    <p className="mt-3 text-xs text-red-500">{error}</p>
                  )}

                  <p className="mt-4 max-w-[290px] text-[11px] leading-5 text-slate-400">
                    By connecting, you agree to generate a Zero-Knowledge proof
                    of your contribution tier. No raw data is stored onchain.
                  </p>
                </div>
              </div>
            </section>
          </main>

          <footer className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 text-[11px] font-medium tracking-tight text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />
              GrantIdentityRegistry.sol connected
            </div>
            <div className="flex items-center gap-1.5">
              Powered by <span className="font-bold text-slate-700">Noir ZK Coprocessor</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
