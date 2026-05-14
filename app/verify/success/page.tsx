'use client';

// app/verify/success/page.tsx

import ConnectButton from '@/components/ConnectButton';
import { api } from '@/lib/api';
import { IDENTITY_REGISTRY_ABI, IDENTITY_REGISTRY_ADDRESS } from '@/lib/contracts';
import { Check, CheckCircle2, Fingerprint, Shield } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useConfig, useSwitchChain } from 'wagmi';
import { getConnectorClient } from 'wagmi/actions';
import { writeContract } from 'viem/actions';
import { arbitrumSepolia } from 'wagmi/chains';
import { useAccountModal, useConnectModal } from '@rainbow-me/rainbowkit';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

type AttestationData = {
  requestId:          string;
  status:             string;
  oracleSignature?:   string | null;
  messageHash?:       string | null;
  githubLogin?:       string | null;
  githubId?:          number | null;
  githubCreatedYear?: number | null;
  accountAgeSeconds?: number | null;
  publicRepos?:       number | null;
  followers?:         number | null;
  contributionTier?:  string | null;
  walletAddressHi?:   string | null;
  walletAddressLo?:   string | null;
  // Private ZK witnesses
  commitCount?:       number | null;
  totalStars?:        number | null;
  contributionEvents90d?: number | null;
};

type StepStatus = 'complete' | 'active' | 'pending' | 'error';

function formatAddress(address?: string) {
  if (!address) return 'Connect Wallet';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function ZkBadge({ githubLogin, tier, createdYear }: { githubLogin: string; tier: bigint; createdYear: bigint }) {
  const tierLabel = ['', 'Bronze', 'Silver', 'Gold', 'Platinum'][Number(tier)] ?? `Tier ${tier}`;
  const displayLogin = githubLogin && githubLogin !== 'unknown' ? `@${githubLogin}` : 'GitHub Verified';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-bold text-emerald-900">ZK Verified ✓</p>
          <p className="text-xs text-emerald-700">Identity is permanently recorded on-chain.</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <GithubIcon className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{displayLogin}</p>
            <p className="text-xs text-slate-500">Member since {createdYear.toString()}</p>
          </div>
          <span className="ml-auto rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
            {tierLabel}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          GitHub handle, account creation year, and contribution tier are publicly readable on-chain.
          This badge persists for all future grants — no re-verification needed.
        </p>
      </div>
    </div>
  );
}

function SuccessContent() {
  const { address, isConnected } = useAccount();
  const wagmiConfig = useConfig();
  const { switchChainAsync } = useSwitchChain();
  const { openConnectModal }  = useConnectModal();
  const { openAccountModal }  = useAccountModal();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const requestId    = searchParams.get('requestId');

  const [attestation,    setAttestation]    = useState<AttestationData | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [generatingZk,   setGeneratingZk]   = useState(false);
  const [zkProof,        setZkProof]        = useState<Uint8Array | null>(() => {
    if (!requestId || typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem(`zkproof:${requestId}`);
      return saved ? new Uint8Array(JSON.parse(saved)) : null;
    } catch { return null; }
  });
  const [zkPublicInputs, setZkPublicInputs] = useState<string[] | null>(() => {
    if (!requestId || typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem(`zkpubinputs:${requestId}`);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const fetchedRef = useRef(false);

  // Check if already verified on-chain
  const { data: alreadyVerified, isLoading: verifiedLoading } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi:     IDENTITY_REGISTRY_ABI,
    functionName: 'isVerified',
    args:    address ? [address] : undefined,
    query:   { enabled: !!address },
  });

  const { data: onChainIdentity } = useReadContract({
    address: IDENTITY_REGISTRY_ADDRESS,
    abi:     IDENTITY_REGISTRY_ABI,
    functionName: 'getIdentity',
    args:    address ? [address] : undefined,
    query:   { enabled: !!address },
  });

  // On-chain submission
  const [txHash,       setTxHash]       = useState<`0x${string}` | undefined>(undefined);
  const [txPending,    setTxPending]    = useState(false);
  const [txError,      setTxError]      = useState<Error | null>(null);
  const { isLoading: txConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const confirmedRef = useRef(false);
  
  const boundAddress = useMemo(() => {
    if (!attestation?.walletAddressHi || !attestation?.walletAddressLo) return null;
    try {
      const hi = BigInt(attestation.walletAddressHi);
      const lo = BigInt(attestation.walletAddressLo);
      const addressShiftBits = BigInt(128);
      return '0x' + ((hi << addressShiftBits) | lo).toString(16).padStart(40, '0').toLowerCase();
    } catch (e) {
      console.error('Failed to reconstruct bound address', e);
      return null;
    }
  }, [attestation?.walletAddressHi, attestation?.walletAddressLo]);

  const isWalletMismatch = useMemo(() => {
    if (!address || !boundAddress) return false;
    return address.toLowerCase() !== boundAddress.toLowerCase();
  }, [address, boundAddress]);

  useEffect(() => {
    // Only redirect if: no requestId, wallet connected, contract confirmed NOT verified
    if (requestId) return;                    // has requestId — stay
    if (!address) return;                     // wallet not loaded yet — wait
    if (verifiedLoading) return;              // contract read in flight — wait
    if (alreadyVerified) return;              // verified on-chain — stay
    if (alreadyVerified === undefined) return; // contract read failed/unavailable — stay
    router.replace('/verify/identity-verification');
  }, [requestId, alreadyVerified, verifiedLoading, address, router]);

  // Eagerly warm up the ZK prover WASM so it's ready when the user clicks "Generate Proof"
  useEffect(() => {
    import('@/lib/zk/prover').then(({ warmupProver }) => warmupProver());
  }, []);

  useEffect(() => {
    if (!requestId || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    let attempts = 0;
    const MAX = 150; // Poll for up to 5 minutes

    async function poll() {
      while (attempts < MAX) {
        try {
          const data = await api.get<AttestationData>(`/identity/attestation/${requestId}`);
          setAttestation(data);
          
          // Only stop polling if we have a final state (attested, verified, or failed)
          if (data.status === 'attested' || data.status === 'verified') {
            setLoading(false);
            return;
          }
          
          if (data.status === 'failed') {
            setError(data.status === 'failed' ? 'Verification failed on backend.' : null);
            setLoading(false);
            return;
          }

          // If we are in an intermediate state (oauth_complete, data_fetched), keep polling
          attempts++;
          if (attempts % 5 === 0) {
            console.log(`Polling attestation... attempt ${attempts}/${MAX}`);
          }
          await new Promise(r => setTimeout(r, 2000));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error('Attestation fetch attempt', attempts, msg);
          // 404 means not ready yet — keep polling
          if (msg.includes('404') || msg.includes('not yet complete')) {
            attempts++;
            await new Promise(r => setTimeout(r, 2000));
          } else {
            setError(msg);
            setLoading(false);
            return;
          }
        }
      }
      setError('Attestation timed out. Please try again.');
      setLoading(false);
    }

    poll();
  }, [requestId]);

  // Auto-generate ZK proof once attestation is ready and no proof exists yet
  const autoProofRef = useRef(false);
  useEffect(() => {
    if (zkProof || !attestation?.oracleSignature || autoProofRef.current || alreadyVerified) return;
    autoProofRef.current = true;
    handleGenerateZk();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attestation?.oracleSignature, zkProof, alreadyVerified]);

  useEffect(() => {
    if (!txConfirmed || !txHash || !requestId || confirmedRef.current) return;
    confirmedRef.current = true;
    sessionStorage.removeItem(`zkproof:${requestId}`);
    sessionStorage.removeItem(`zkpubinputs:${requestId}`);
    api.post(`/identity/confirmed/${requestId}`, { txHash }).catch(() => {
      // Non-critical — the on-chain state is the source of truth
    });
  }, [txConfirmed, txHash, requestId]);

  async function handleGenerateZk() {
    if (!attestation?.oracleSignature || !attestation?.messageHash) {
      setError('Oracle signature not ready. Please wait a moment and try again.');
      return;
    }
    if (!attestation.walletAddressHi || !attestation.walletAddressLo) {
      setError('Attestation is missing wallet address limbs. Please restart verification.');
      return;
    }
    if (attestation.githubId == null || attestation.githubCreatedYear == null) {
      setError('Attestation is missing github_id / github_created_year.');
      return;
    }

    setGeneratingZk(true);
    setError(null);
    try {
      const { generateProof } = await import('@/lib/zk/prover');

      const toBytes = (hex: string, label: string, expectedLength: number): number[] => {
        const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
        if (clean.length % 2 !== 0) throw new Error(`${label} has odd hex length`);
        const bytes = [];
        for (let i = 0; i < clean.length; i += 2) {
          const v = parseInt(clean.slice(i, i + 2), 16);
          if (isNaN(v)) throw new Error(`${label} contains non-hex characters`);
          bytes.push(v);
        }
        if (bytes.length === expectedLength + 1) bytes.pop();
        if (bytes.length !== expectedLength)
          throw new Error(`${label} must be ${expectedLength} bytes, got ${bytes.length}`);
        return bytes;
      };

      const result = await generateProof({
        signature:           toBytes(attestation.oracleSignature, 'Oracle signature', 64),
        message_hash:        toBytes(attestation.messageHash,     'Message hash',     32),
        github_id:           attestation.githubId.toString(),
        github_created_year: attestation.githubCreatedYear.toString(),
        commits: attestation.commitCount ?? 0,
        stars:   attestation.totalStars ?? 0,
        events:  attestation.contributionEvents90d ?? 0,
        wallet_address_hi: attestation.walletAddressHi,
        wallet_address_lo: attestation.walletAddressLo,
      });

      if (result.success) {
        setZkProof(result.proof);
        setZkPublicInputs(result.publicInputs);
        if (requestId) {
          sessionStorage.setItem(`zkproof:${requestId}`, JSON.stringify(Array.from(result.proof)));
          sessionStorage.setItem(`zkpubinputs:${requestId}`, JSON.stringify(result.publicInputs));
        }
      } else {
        throw result.error instanceof Error ? result.error : new Error('Proof generation failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ZK generation failed');
    } finally {
      setGeneratingZk(false);
    }
  }

  function handleSubmitOnChain() {
    if (!zkProof || !zkPublicInputs) return;
    const githubLogin = attestation?.githubLogin;

    if (!githubLogin) {
      setError('GitHub handle missing from attestation. Please restart verification.');
      return;
    }

    if (!IDENTITY_REGISTRY_ADDRESS || IDENTITY_REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setError(
        'Identity Registry contract is not deployed. ' +
        'Set NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS in .env.local and restart the dev server.'
      );
      return;
    }

    // If no wallet connected, open connect modal
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }

    // The proof is cryptographically bound to the wallet used during initVerification.
    // Warn if a different wallet is connected — the tx will revert on-chain.
    if (boundAddress && address) {
      if (address.toLowerCase() !== boundAddress.toLowerCase()) {
        setError(
          `This proof is bound to ${boundAddress.slice(0, 10)}…${boundAddress.slice(-6)}. ` +
          `You are currently connected with ${address.slice(0, 10)}…${address.slice(-6)}. ` +
          `Please switch to the original wallet or start a new verification.`
        );
        // We open account modal to let them disconnect/switch
        openAccountModal?.();
        return;
      }
    }

    const proofHex = ('0x' + Array.from(zkProof).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
    const pubInputsBytes32 = zkPublicInputs.map(v => {
      const hex = BigInt(v).toString(16).padStart(64, '0');
      return `0x${hex}` as `0x${string}`;
    });

    setTxPending(true);
    setTxError(null);
    switchChainAsync({ chainId: arbitrumSepolia.id })
      .then(() => getConnectorClient(wagmiConfig, { chainId: arbitrumSepolia.id }))
      .then(client =>
      writeContract(client, {
        address:      IDENTITY_REGISTRY_ADDRESS,
        abi:          IDENTITY_REGISTRY_ABI,
        functionName: 'verifyIdentity',
        args:         [proofHex, pubInputsBytes32, githubLogin],
        account:      client.account,
        chain:        arbitrumSepolia,
      })
    ).then(hash => {
      setTxHash(hash);
    }).catch(e => {
      const raw = e instanceof Error ? e : new Error(String(e));
      const msg = raw.message || '';
      // Detect user-rejected transactions and show a friendly message
      if (
        msg.includes('User rejected') ||
        msg.includes('user rejected') ||
        msg.includes('User denied') ||
        msg.includes('rejected the request') ||
        msg.includes('ACTION_REJECTED')
      ) {
        setTxError(new Error('Transaction cancelled. Click "Submit proof on-chain" to try again.'));
      } else {
        // For other errors, extract just the meaningful part
        const short = msg.split('Request Arguments')[0]?.trim() || msg.slice(0, 200);
        setTxError(new Error(short));
      }
    }).finally(() => {
      setTxPending(false);
    });
  }

  const proofHex = useMemo(() => {
    if (!zkProof) return null;
    return '0x' + Array.from(zkProof).map(b => b.toString(16).padStart(2, '0')).join('');
  }, [zkProof]);

  const status = attestation?.status;
  const isOAuthDone = ['oauth_complete', 'data_fetched', 'attested', 'verified'].includes(status || '');
  const isDataDone  = ['data_fetched', 'attested', 'verified'].includes(status || '');
  const isOracleDone = ['attested', 'verified'].includes(status || '');

  const steps: { title: string; description: string; status: StepStatus }[] = [
    { 
      title: 'Wallet connected',     
      description: 'Registry verification complete',                                    
      status: 'complete' 
    },
    { 
      title: 'GitHub authenticated', 
      description: attestation?.githubLogin ? `@${attestation.githubLogin}` : 'Authenticated', 
      status: isOracleDone ? 'complete' : (status === 'oauth_complete' ? 'active' : isOAuthDone ? 'complete' : loading ? 'active' : 'pending') 
    },
    { 
      title: 'Data collected',       
      description: 'Contributor profile fetched',                                       
      status: isOracleDone ? 'complete' : (status === 'data_fetched' ? 'active' : isDataDone ? 'complete' : loading ? 'active' : 'pending') 
    },
    { 
      title: 'ZK proof generated',   
      description: zkProof ? 'Wallet-bound proof ready' : isOracleDone ? 'Ready to generate' : 'Pending',                   
      status: zkProof ? 'complete' : isOracleDone ? 'active' : 'pending' 
    },
    { 
      title: 'On-chain submission',  
      description: txConfirmed || alreadyVerified ? 'ZK Verified badge issued' : 'Sign one transaction', 
      status: txConfirmed || alreadyVerified ? 'complete' : zkProof ? 'active' : 'pending' 
    },
  ];

  const isFullyVerified = txConfirmed || alreadyVerified;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex w-full items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
              <span className="text-sm font-bold text-white">G</span>
            </div>
            <h1 className="text-base font-bold text-slate-900">GrantOS v3</h1>
            <span className="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 sm:inline-flex">
              Sepolia
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isFullyVerified && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> ZK Verified
              </span>
            )}
            <ConnectButton variant="header" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 items-start px-4 pb-6 pt-6 sm:px-6 sm:pt-8">
        <div className="mx-auto mt-0 flex min-h-[calc(100vh-96px)] w-full max-w-6xl flex-col rounded-3xl border-x border-b border-slate-200 bg-white shadow-sm lg:min-h-[680px]">
          <main className="flex flex-1 flex-col lg:flex-row">
            {/* Sidebar */}
            <aside className="w-full border-b border-slate-100 bg-slate-50/60 p-6 lg:w-[280px] lg:border-b-0 lg:border-r lg:p-8">
              <h2 className="text-sm font-bold tracking-tight text-slate-900">Verification flow</h2>
              <div className="mt-6 flex flex-col">
                {steps.map((step, idx) => (
                  <div key={idx} className="relative pb-7 last:pb-0">
                    {idx !== steps.length - 1 && (
                      <div className={`absolute left-[11px] top-6 h-full w-px ${step.status === 'complete' ? 'bg-blue-500' : 'bg-slate-200'}`} />
                    )}
                    <div className="relative z-10 flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {step.status === 'complete' ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500 bg-white">
                            <Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
                          </div>
                        ) : step.status === 'active' ? (
                          <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white">
                            <div className="animate-spin absolute inset-[3px] rounded-full border border-blue-500 border-r-transparent border-b-transparent" />
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          </div>
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-xs font-semibold text-slate-400">
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-sm font-bold ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-900'}`}>
                          {step.title}
                        </p>
                        {step.description && (
                          <p className={`mt-0.5 text-xs ${step.status === 'active' ? 'text-blue-500' : 'text-slate-500'}`}>
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {attestation?.contributionTier && (
                <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tier</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{attestation.contributionTier}</p>
                  <p className="mt-0.5 text-xs text-slate-400">Computed inside ZK — not revealed on-chain</p>
                </div>
              )}
            </aside>

            {/* Main content */}
            <section className="flex flex-1 flex-col gap-4 p-4 sm:p-6 lg:p-8">
              {error && (
                <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-3 shrink-0 text-red-400 hover:text-red-600 transition-colors">✕</button>
                </div>
              )}
              {txError && (
                <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                  <span>{txError.message}</span>
                  <button onClick={() => setTxError(null)} className="ml-3 shrink-0 text-amber-400 hover:text-amber-600 transition-colors">✕</button>
                </div>
              )}

              {loading || verifiedLoading ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-sm text-slate-500">Loading…</div>
                </div>

              ) : !isConnected ? (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-slate-500 mb-4">Connect your wallet to view your verified identity.</p>
                    <ConnectButton variant="black" />
                  </div>
                </div>

              ) : isFullyVerified && onChainIdentity ? (
                // Already verified — show persistent badge
                <ZkBadge
                  githubLogin={onChainIdentity.githubHandle || attestation?.githubLogin || 'unknown'}
                  tier={onChainIdentity.tier}
                  createdYear={onChainIdentity.createdYear}
                />

              ) : isFullyVerified ? (
                // Tx confirmed but identity not yet readable (propagation delay)
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-900">
                    ZK Verified ✓ — identity recorded on-chain.
                  </p>
                </div>

              ) : zkProof ? (
                // Proof ready — show submit button
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-blue-900">ZK proof generated</p>
                      <p className="text-xs text-blue-700">
                        Bound to wallet <span className="font-bold">{formatAddress(boundAddress || undefined)}</span>.
                        <button onClick={openAccountModal} className="ml-1 font-bold underline hover:text-blue-800 transition-colors">Switch wallet?</button>
                      </p>
                    </div>
                  </div>

                  {isWalletMismatch && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-900">Wallet mismatch detected</p>
                          <p className="text-xs text-amber-700 mt-1">
                            The ZK proof is cryptographically bound to the wallet that started the verification process.
                            To submit on-chain, please switch back to <span className="font-bold">{formatAddress(boundAddress || undefined)}</span>.
                          </p>
                          <div className="mt-3 flex gap-3">
                            <button
                              onClick={openAccountModal}
                              className="text-xs font-bold text-amber-900 underline hover:no-underline"
                            >
                              Switch account
                            </button>
                            <button
                              onClick={() => router.push('/verify/identity-verification')}
                              className="text-xs font-bold text-amber-900 underline hover:no-underline"
                            >
                              Start over with current wallet
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {zkPublicInputs && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold text-slate-500 mb-2">Public outputs</p>
                      <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 text-xs text-slate-700">
                        <span className="font-medium">Tier:</span>         <span className="font-mono truncate">{zkPublicInputs[0]}</span>
                        <span className="font-medium">GitHub ID:</span>    <span className="font-mono truncate">{zkPublicInputs[1]}</span>
                        <span className="font-medium">Created year:</span> <span className="font-mono truncate">{zkPublicInputs[2]}</span>
                        <span className="font-medium">Wallet (hi):</span>  <span className="font-mono truncate">{zkPublicInputs[3]}</span>
                        <span className="font-medium">Wallet (lo):</span>  <span className="font-mono truncate">{zkPublicInputs[4]}</span>
                      </div>
                    </div>
                  )}

                  {proofHex && (
                    <div className="rounded-xl border border-slate-200 bg-slate-900 p-4">
                      <p className="text-xs font-bold text-slate-400 mb-2">Proof bytes (hex)</p>
                      <div className="overflow-y-auto break-all font-mono text-[10px] text-emerald-400 leading-5 max-h-32">
                        {proofHex}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleSubmitOnChain}
                    disabled={txPending || txConfirming}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                      txPending || txConfirming
                        ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                        : 'bg-slate-900 text-white hover:bg-black'
                    }`}
                  >
                    {txPending    ? 'Waiting for wallet…' :
                     txConfirming ? 'Confirming transaction…' :
                     !isConnected ? 'Connect wallet to submit →' :
                                    'Submit proof on-chain →'}
                  </button>
                  <button
                    onClick={() => {
                      setZkProof(null);
                      setZkPublicInputs(null);
                      if (requestId) {
                        sessionStorage.removeItem(`zkproof:${requestId}`);
                        sessionStorage.removeItem(`zkpubinputs:${requestId}`);
                      }
                    }}
                    className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Regenerate proof
                  </button>
                </div>

              ) : (
                // Step 1: generate ZK proof
                <div className="flex flex-1 items-center justify-center">
                  <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                        <Fingerprint className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900">Generate ZK proof</h2>
                        <p className="text-xs text-slate-500">Runs in your browser — raw data never leaves the oracle.</p>
                      </div>
                    </div>

                    {attestation?.githubLogin && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <GithubIcon className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">@{attestation.githubLogin}</span>
                        <span className="ml-auto text-xs text-slate-400">{attestation.publicRepos} repos</span>
                      </div>
                    )}

                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <Shield className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        Proof is wallet-bound to <span className="font-mono font-bold">{formatAddress(address)}</span>.
                        It cannot be replayed by another wallet.
                      </span>
                    </div>

                    <button
                      onClick={handleGenerateZk}
                      disabled={generatingZk || !isOracleDone}
                      className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                        isOracleDone && !generatingZk
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      {generatingZk ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                          </svg>
                          Generating proof…
                        </span>
                      ) : !isOracleDone ? (
                        'Waiting for oracle…'
                      ) : (
                        'Generate ZK proof'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500 text-sm">Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
