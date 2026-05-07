// 'use client';

// import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';
// import { IDENTITY_REGISTRY_ADDRESS, identityRegistryAbi } from '@/lib/escrow';
// import Link from 'next/link';
// import { Address, isAddress } from 'viem';
// import { useReadContract } from 'wagmi';
// import { CheckCircle2, Copy } from 'lucide-react';
// import { useGrantCreationStore } from '@/app/grants/new/store';

// type SuccessScreenProps = {
//   grantId?: string;
//   builderAddress: string;
//   createHash?: string;
// };

// export default function SuccessScreen({ grantId, builderAddress, createHash }: SuccessScreenProps) {
//   const canRead = isAddress(builderAddress) && Boolean(identityRegistryAbi);
//   const { data } = useReadContract({
//     abi: (identityRegistryAbi ?? []) as never,
//     address: IDENTITY_REGISTRY_ADDRESS,
//     functionName: 'getIdentity',
//     args: canRead ? [builderAddress as Address] : undefined,
//     query: { enabled: canRead },
//   });
  
//   const { reset } = useGrantCreationStore();

//   type IdentityRow = readonly [boolean, string, number, number, bigint];
//   const row = data as IdentityRow | undefined;
//   const reputation = row ? row[4].toString() : '94.2';
//   const zkVerified = row ? row[0] : false;
//   const hasGrantLink = Boolean(grantId);
//   const shareableUrl = hasGrantLink ? `${typeof window !== 'undefined' ? window.location.origin : ''}/grants/${grantId}` : '';

//   return (
//     <div className="mx-auto flex w-full max-w-2xl flex-col items-center rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom-2 duration-500 sm:p-12">
      
//       {/* Header */}
//       <div className="flex w-full items-center justify-between">
//         <Link href="/" className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900">
//           ← Back
//         </Link>
//         <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Creation Complete</span>
//       </div>

//       {/* Success Illustration */}
//       <div className="mb-8 mt-12 flex flex-col items-center text-center">
//         <div className="relative flex h-24 w-24 items-center justify-center">
//           <div className="absolute inset-0 max-w-full rounded-full bg-rose-500/20 blur-xl"></div>
//           <CheckCircle2 className="relative h-20 w-20 text-rose-500" strokeWidth={1.5} />
//         </div>
//         <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Grant Successfully Created!</h2>
//         <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-500">
//           Your grant has been deployed to the GrantEscrow smart contract on Arbitrum One and is now live.
//         </p>
//       </div>

//       {/* Grant ID & Link Section */}
//       <div className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-5 shadow-inner">
//         <div className="flex items-center justify-between">
//           <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Grant ID</p>
//           {grantId ? (
//             <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
//               <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
//               Confirmed
//             </div>
//           ) : (
//              <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-700">
//               <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></span>
//               Pending
//             </div>
//           )}
//         </div>
//         <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
//           {grantId ? `GRT-2026-${grantId.padStart(6, '0')}` : 'Indexing...'}
//         </div>
        
//         {hasGrantLink && (
//           <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
//             <input 
//               readOnly 
//               value={shareableUrl} 
//               className="w-full bg-transparent px-3 py-1.5 text-sm font-medium text-slate-600 outline-none"
//             />
//             <button 
//               type="button" 
//               onClick={() => navigator.clipboard.writeText(shareableUrl)} 
//               className="flex items-center justify-center rounded-lg bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
//             >
//               <Copy className="h-4 w-4" />
//             </button>
//           </div>
//         )}
//       </div>

//       {/* Builder Identity Card */}
//       <div className="mt-6 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
//         <div className="h-1.5 w-full bg-linear-to-r from-rose-500 via-teal-500 to-amber-500"></div>
//         <div className="p-5">
//           <div className="flex items-center justify-between border-b border-slate-100 pb-4">
//              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Builder Identity Verified</p>
//              <ZKVerifiedBadge verified={zkVerified || true} />
//           </div>
//           <div className="mt-5 flex items-center gap-4">
//              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-700">
//                 {builderAddress.slice(2, 4).toUpperCase()}
//              </div>
//              <div className="flex flex-col">
//                 <span className="font-bold text-slate-900">{builderAddress.slice(0, 10)}...{builderAddress.slice(-8)}</span>
//                 <span className="mt-0.5 text-sm font-medium text-slate-500">Rep Score: <span className="font-bold text-slate-700">{reputation}</span></span>
//              </div>
//           </div>
//         </div>
//       </div>
      
//       {createHash && (
//          <div className="mt-6 flex w-full justify-center">
//            <a href={`https://arbiscan.io/tx/${createHash}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline hover:text-blue-700">
//              View transaction on Arbiscan ↗
//            </a>
//          </div>
//       )}

//       {/* Action Buttons */}
//       <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
//         {hasGrantLink ? (
//           <Link
//             href={`/grants/${grantId}`}
//             className="flex flex-1 items-center justify-center rounded-xl bg-[#FF5C35] px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#E84E29] hover:shadow-lg focus:ring-4 focus:ring-rose-500/20"
//           >
//             View Grant →
//           </Link>
//         ) : (
//           <button disabled className="flex flex-1 items-center justify-center rounded-xl bg-slate-200 px-6 py-3.5 text-sm font-bold text-slate-400">
//             View Grant (Wait...)
//           </button>
//         )}
//         <button
//           onClick={reset}
//           type="button"
//           className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
//         >
//           Create Another Grant
//         </button>
//       </div>
//     </div>
//   );
// }
