'use client';

import ConnectButton from '@/components/ConnectButton';
import { api } from '@/lib/api';
import { Check, Circle, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const steps = [
  { title: 'Wallet Check', description: 'Registry verification complete', status: 'complete' as const },
  { title: 'Connect GitHub', description: 'Authenticate via OAuth', status: 'active' as const },
  { title: 'Generate Proof', description: 'vlayer Web Prover MPC-TLS', status: 'pending' as const },
  { title: 'Submit Onchain', description: 'Register identity to Arbitrum', status: 'pending' as const },
];

export default function IdentityVerificationPage() {
  const { isConnected, address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleConnectGitHub() {
    console.log('handleConnectGitHub called', { isConnected, address });
    if (!isConnected || !address) {
      setError('Please connect your wallet first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log('Initiating verification...');
      const { requestId } = await api.post<{ success: boolean; requestId: string }>(
        '/identity/init',
        { walletAddress: address },
      );
      console.log('Verification initiated, requestId:', requestId);

      console.log('Fetching OAuth URL...');
      const { oauthUrl } = await api.get<{ oauthUrl: string; requestId: string }>(
        `/identity/oauth-url/${requestId}`,
      );
      console.log('OAuth URL received, redirecting to:', oauthUrl);
      
      // Use a small delay to ensure state updates if needed, though window.location is immediate
      setTimeout(() => {
        window.location.href = oauthUrl;
      }, 100);
    } catch (e: any) {
      console.error('GitHub connection failed:', e);
      const errorData = e.data || {};
      const msg = errorData.message || e.message || String(e);
      
      if (e.status === 409 || msg.includes('already completed')) {
        const requestId = errorData.requestId;
        console.log('Already verified, redirecting to success page. requestId:', requestId);
        window.location.href = `/verify/success${requestId ? `?requestId=${requestId}` : ''}`;
        return;
      }
      
      setError(`Failed to connect GitHub: ${msg}`);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
              <GithubIcon className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-[15px] font-semibold text-slate-900">GrantOS v3</h1>
          </div>
          {isConnected ? <ConnectButton variant="header" /> : <ConnectButton variant="green" />}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-65px)] flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-slate-50 lg:w-[236px] lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="text-[15px] font-semibold text-slate-900">Identity Binding</div>
            </div>
            <div className="mt-8 space-y-0">
              {steps.map((step, index) => (
                <div key={step.title} className="relative flex gap-3 pb-7 last:pb-0">
                  {index !== steps.length - 1 && (
                    <div className={`absolute left-[8px] top-6 h-full w-px ${step.status === 'pending' ? 'bg-slate-200' : 'bg-emerald-500'}`} />
                  )}
                  <div className="relative z-10 mt-0.5 shrink-0">
                    {step.status === 'complete' ? (
                      <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-emerald-500 bg-white">
                        <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
                      </div>
                    ) : step.status === 'active' ? (
                      <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 border-emerald-500 bg-white">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </div>
                    ) : (
                      <div className="h-[18px] w-[18px] rounded-full border border-slate-300 bg-white" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className={`text-[14px] font-semibold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>
                      {step.title}
                    </p>
                    <p className={`text-xs ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="flex w-full max-w-[420px] flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
              <GithubIcon className="h-5 w-5 text-slate-700" />
            </div>
            <h2 className="mt-6 text-[26px] font-semibold tracking-tight text-slate-900">
              Link GitHub Identity
            </h2>
            <p className="mt-3 max-w-[320px] text-[15px] leading-6 text-slate-500">
              GrantOS cryptographically binds your GitHub contributions to your wallet.
              We request read-only access to your public profile.
            </p>

            <button
              onClick={handleConnectGitHub}
              disabled={!mounted || !isConnected || loading}
              className={`mt-8 inline-flex min-h-11 w-full max-w-[240px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                mounted && isConnected && !loading
                  ? 'bg-[#24292e] text-white shadow-md hover:bg-[#1b1f23]'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400'
              }`}
            >
              <GithubIcon className="h-4 w-4" />
              {loading ? 'Redirecting to GitHub...' : 'Connect GitHub Account'}
            </button>

            {mounted && !isConnected && (
              <p className="mt-3 text-xs text-slate-400">Connect your wallet first</p>
            )}
            {error && (
              <p className="mt-3 text-xs text-red-500">{error}</p>
            )}

            <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-400">
              <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
              No raw data stored onchain
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
