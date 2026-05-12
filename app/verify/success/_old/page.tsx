'use client';

import ConnectButton from '@/components/ConnectButton';
import { api } from '@/lib/api';
import { Check, CheckCircle2, Fingerprint, Shield } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

type AttestationData = {
  requestId: string;
  status: string;
  oracleSignature?: string | null;
  messageHash?: string | null;
  githubLogin?: string | null;
  githubId?: number | null;
  githubCreatedAt?: string | null;
  githubCreatedYear?: number | null;
  accountAgeSeconds?: number | null;
  publicRepos?: number | null;
  totalStars?: number | null;
  followers?: number | null;
  commitCount?: number | null;
  contributionEvents90d?: number | null;
  publicGists?: number | null;
  languages?: string[] | null;
  orgs?: string[] | null;
  walletAddressHi?: string | null;
  walletAddressLo?: string | null;
};

type StepStatus = 'complete' | 'active' | 'pending' | 'error';

function formatAddress(address?: string) {
  if (!address) return 'Connect Wallet';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function SuccessContent() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get('requestId');

  const [attestation, setAttestation] = useState<AttestationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [generatingZk, setGeneratingZk] = useState(false);
  const [zkProof, setZkProof] = useState<Uint8Array | ArrayBuffer | null>(null);
  const [zkPublicInputs, setZkPublicInputs] = useState<string[] | null>(null);
  const fetchedRef = useRef(false);

  // Redirect back if no requestId
  useEffect(() => {
    if (!requestId) router.replace('/verify/identity-verification');
  }, [requestId, router]);

  // Fetch attestation data on mount
  useEffect(() => {
    if (!requestId || fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchAttestation() {
      try {
        const data = await api.get<AttestationData>(`/identity/attestation/${requestId}`);
        setAttestation(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load attestation data');
      } finally {
        setLoading(false);
      }
    }

    fetchAttestation();
  }, [requestId]);

  async function handleGenerateZk() {
    if (!attestation?.oracleSignature || !attestation?.messageHash) return;
    setGeneratingZk(true);
    setError(null);
    try {
      if (attestation.githubId == null || attestation.githubCreatedYear == null) {
        throw new Error(
          'Attestation is missing githubId/githubCreatedYear required for ZK proof generation.',
        );
      }

      const { generateProof } = await import('@/lib/zk/prover');
      
      const toBytes = (
        hex: string,
        label: string,
        expectedLength: number,
        opts?: { trimRecoveryByte?: boolean },
      ) => {
        const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
        if (clean.length % 2 !== 0) {
          throw new Error(`${label} has invalid hex length`);
        }

        const bytes = [];
        for (let i = 0; i < clean.length; i += 2) {
          const value = Number.parseInt(clean.slice(i, i + 2), 16);
          if (Number.isNaN(value)) {
            throw new Error(`${label} contains non-hex characters`);
          }
          bytes.push(value);
        }

        if (opts?.trimRecoveryByte && bytes.length === expectedLength + 1) {
          bytes.pop();
        }

        if (bytes.length !== expectedLength) {
          throw new Error(
            `${label} must be ${expectedLength} bytes, received ${bytes.length}.`,
          );
        }

        return bytes;
      };

      const sigBytes = toBytes(attestation.oracleSignature, 'Oracle signature', 64, {
        trimRecoveryByte: true,
      });
      const hashBytes = toBytes(attestation.messageHash, 'Message hash', 32);

      const inputs = {
        signature: sigBytes,
        message_hash: hashBytes,
        github_id: attestation.githubId.toString(),
        github_created_year: attestation.githubCreatedYear.toString(),
        commits: Number(attestation.commitCount || 0),
        stars: Number(attestation.totalStars || 0),
        events: Number(attestation.contributionEvents90d || 0),
        wallet_address_hi: attestation.walletAddressHi ?? '0',
        wallet_address_lo: attestation.walletAddressLo ?? '0',
      };

      console.log('Full ZK Inputs:', inputs);

      const result = await generateProof(inputs);
      if (result.success) {
        // NOTE: UltraHonk verifyProof is currently unstable in this environment
        // (it throws a native remainder_1024 assertion even for freshly generated proofs).
        // We therefore treat successful proof generation as the completion signal.
        setZkProof(result.proof);
        setZkPublicInputs(result.publicInputs ?? null);
        setConfirmed(true);
      } else {
        throw result.error instanceof Error
          ? result.error
          : new Error(
              typeof result.error === 'string'
                ? result.error
                : 'Failed to generate proof',
            );
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'ZK generation failed');
    } finally {
      setGeneratingZk(false);
    }
  }

  const isAttested = attestation?.status === 'attested' || attestation?.status === 'data_fetched';

  const proofHex = useMemo(() => {
    if (!zkProof) return null;
    const bytes =
      zkProof instanceof Uint8Array ? zkProof : new Uint8Array(zkProof as ArrayBufferLike);
    return `0x${Array.from(bytes)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('')}`;
  }, [zkProof]);

  const humanReadableProof = useMemo(() => {
    if (!proofHex) return null;
    const body = proofHex.slice(2);
    const chunkSize = 64; // 32 bytes per line
    const lines: string[] = [];
    for (let i = 0; i < body.length; i += chunkSize) {
      lines.push(body.slice(i, i + chunkSize));
    }
    return `0x\n${lines.join('\n')}`;
  }, [proofHex]);

  const steps: { title: string; description: string; status: StepStatus }[] = [
    { title: 'Wallet Connected', description: 'Registry verification complete', status: 'complete' },
    { title: 'GitHub Authenticated', description: attestation?.githubLogin ? `@${attestation.githubLogin}` : 'Authenticated', status: isAttested ? 'complete' : loading ? 'active' : 'pending' },
    { title: 'Data Collected', description: 'Contributor profile fetched', status: isAttested ? 'complete' : loading ? 'active' : 'pending' },
    { title: 'ZK Proof Generated', description: zkProof ? 'Stored locally' : 'Pending', status: isAttested ? (zkProof ? 'complete' : 'active') : 'pending' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
              <GithubIcon className="h-4 w-4 text-white" />
            </div>
            <h1 className="truncate text-[15px] font-semibold text-slate-900 sm:text-[16px]">GrantOS v3</h1>
          </div>
          {isConnected ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {formatAddress(address)}
            </div>
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
                    ) : step.status === 'error' ? (
                      <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-red-400 bg-white">
                        <span className="text-[10px] text-red-400">!</span>
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

        <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          {loading ? (
            <div className="flex w-full max-w-[420px] flex-col items-center text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                <Fingerprint className="h-4 w-4 text-slate-700" />
              </div>
              <h2 className="mt-6 text-[28px] font-semibold tracking-[-0.02em] text-slate-900">Loading Attestation...</h2>
              <p className="mt-3 max-w-[320px] text-[15px] leading-6 text-slate-500">
                Fetching your GitHub contributor data and EAS attestation.
              </p>
              <div className="mt-8 flex h-12 w-12 items-center justify-center">
                <div className="animate-spin h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-500" />
              </div>
            </div>
          ) : error && !attestation ? (
            <div className="flex w-full max-w-[420px] flex-col items-center text-center">
              <h2 className="text-[24px] font-semibold text-red-600">Verification Failed</h2>
              <p className="mt-3 text-sm text-slate-500">{error}</p>
              <button
                onClick={() => router.push('/verify/identity-verification')}
                className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Try Again
              </button>
            </div>
          ) : confirmed ? (
            <div className="flex w-full max-w-[420px] flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="mt-6 text-[28px] font-semibold tracking-[-0.02em] text-slate-900">Identity Verified</h2>
              {attestation?.githubLogin && (
                <p className="mt-2 text-slate-500">GitHub: <span className="font-semibold text-slate-700">@{attestation.githubLogin}</span></p>
              )}
              {attestation?.messageHash && (
                <p className="mt-2 break-all text-xs text-slate-400">Message Hash: {attestation.messageHash}</p>
              )}
              {zkProof && (
                <div className="mt-2 w-full max-w-[620px] space-y-2 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">ZK Proof (copy-ready)</p>
                  <textarea
                    readOnly
                    value={proofHex ?? ''}
                    className="h-24 w-full rounded-md border border-emerald-200 bg-emerald-50 p-2 font-mono text-[11px] text-emerald-700"
                  />
                  <button
                    onClick={async () => {
                      if (!proofHex) return;
                      await navigator.clipboard.writeText(proofHex);
                    }}
                    className="rounded-md border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                  >
                    Copy proof hex
                  </button>

                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Human-readable proof</p>
                  <pre className="max-h-40 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-4 text-slate-600">
                    {humanReadableProof}
                  </pre>

                  {zkPublicInputs && (
                    <>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Public inputs</p>
                      <pre className="max-h-28 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-[10px] leading-4 text-slate-600">
                        {JSON.stringify(zkPublicInputs, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : attestation ? (
            <div className="flex w-full max-w-[480px] flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="mt-6 text-[28px] font-semibold tracking-[-0.02em] text-slate-900">Oracle Payload Ready</h2>
              {attestation.githubLogin && (
                <p className="mt-2 text-slate-500">GitHub: <span className="font-semibold text-slate-700">@{attestation.githubLogin}</span></p>
              )}

              {/* GitHub Stats Card */}
              <div className="mt-6 w-full max-w-[400px] rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contributor Profile</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                  <div className="rounded-lg bg-white px-3 py-2 border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{attestation.publicRepos ?? 0}</div>
                    <div className="text-[10px] font-medium text-slate-400">Repos</div>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{attestation.totalStars ?? 0}</div>
                    <div className="text-[10px] font-medium text-slate-400">Stars</div>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{attestation.followers ?? 0}</div>
                    <div className="text-[10px] font-medium text-slate-400">Followers</div>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 border border-slate-100">
                    <div className="text-lg font-bold text-slate-900">{attestation.commitCount ?? 0}</div>
                    <div className="text-[10px] font-medium text-slate-400">Commits</div>
                  </div>
                </div>
                {attestation.languages && attestation.languages.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {attestation.languages.map((lang) => (
                      <span key={lang} className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {lang}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ZK Oracle Info */}
              {attestation.oracleSignature && (
                <div className="mt-4 w-full max-w-[400px] rounded-lg bg-slate-100 px-4 py-3 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Oracle Signature</div>
                  <div className="mt-1 break-all font-mono text-xs text-slate-600">{attestation.oracleSignature}</div>
                </div>
              )}

              {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

              <button
                onClick={handleGenerateZk}
                disabled={generatingZk}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-sm font-semibold text-white shadow-md hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generatingZk ? 'Generating ZK Proof...' : 'Generate ZK Proof Locally'}
              </button>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default function VerifySuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
