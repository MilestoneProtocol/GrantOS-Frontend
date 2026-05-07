'use client';

import ConnectButton from '@/components/ConnectButton';
import {
  Check,
  CheckCircle2,
  Circle,
  Fingerprint,
  Shield,
} from 'lucide-react';
import { useAccount } from 'wagmi';

type StepStatus = 'complete' | 'active' | 'pending';

type Step = {
  title: string;
  description: string;
  status: StepStatus;
};

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const steps: Step[] = [
  {
    title: 'Wallet Check',
    description: 'Registry verification complete',
    status: 'complete',
  },
  {
    title: 'Connect GitHub',
    description: 'Authenticated as @builder',
    status: 'complete',
  },
  {
    title: 'Generate Proof',
    description: 'vlayer Web Prover MPC-TLS',
    status: 'active',
  },
  {
    title: 'Submit Onchain',
    description: 'Register identity to Arbitrum',
    status: 'pending',
  },
];

function SidebarStep({
  step,
  isLast,
}: {
  step: Step;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-3 pb-7 last:pb-0">
      {!isLast ? (
        <div
          className={`absolute left-[8px] top-6 h-full w-px ${
            step.status === 'pending' ? 'bg-slate-200' : 'bg-emerald-500'
          }`}
        />
      ) : null}

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
        <p
          className={`text-[14px] font-semibold ${
            step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'
          }`}
        >
          {step.title}
        </p>
        <p
          className={`text-xs ${
            step.status === 'pending' ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {step.description}
        </p>
      </div>
    </div>
  );
}

export default function VerifyProofPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <GithubIcon className="h-4 w-4 text-white" />
            </div>
            <h1 className="truncate text-[15px] font-semibold text-slate-900 sm:text-[16px]">
              GrantOS v3
            </h1>
          </div>

          {isConnected ? (
            <ConnectButton variant="header" />
          ) : (
            <ConnectButton variant="green" />
          )}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-65px)] flex-col lg:flex-row">
        <aside className="w-full border-b border-slate-200 bg-slate-50 lg:min-h-[calc(100vh-65px)] lg:w-[236px] lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="text-[15px] font-semibold text-slate-900">
                Identity Binding
              </div>
            </div>

            <div className="mt-8 space-y-0">
              {steps.map((step, index) => (
                <SidebarStep
                  key={step.title}
                  step={step}
                  isLast={index === steps.length - 1}
                />
              ))}
            </div>

          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="flex w-full max-w-[420px] flex-col items-center text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
              <Fingerprint className="h-4 w-4 text-slate-700" />
            </div>

            <h2 className="mt-6 text-[28px] font-semibold tracking-[-0.02em] text-slate-900">
              Generating ZK Proof
            </h2>
            <p className="mt-3 max-w-[320px] text-[15px] leading-6 text-slate-500">
              Cryptographically proving your GitHub contributions without
              revealing private data.
            </p>

            <div className="relative mt-8 flex h-[192px] w-[192px] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
              <div className="relative flex h-[96px] w-[96px] items-center justify-center">
                <div className="animate-spin-slow absolute inset-0 rounded-full border border-emerald-200 border-r-emerald-400 border-t-emerald-300" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-md">
                  <GithubIcon className="h-6 w-6 text-slate-900" />
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-6 text-[8px] uppercase tracking-[0.28em] text-slate-300">
                Running MPC-TLS...
              </div>
            </div>

            <div className="mt-8 w-full max-w-[270px] space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Circle className="h-3.5 w-3.5 fill-white text-emerald-500" />
                <span>Querying github.com/user...</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>OAuth token validated</span>
              </div>
            </div>

            <div className="mt-6 w-full max-w-[336px] rounded-lg bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-400">
              Generating Proof (15s...)
            </div>

            <div className="mt-6 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              <span className="animate-progress-slide h-1.5 w-6 rounded-full bg-emerald-500" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
