// import Link from 'next/link';
// import { ArrowLeft, CheckCircle2, Lock, ShieldCheck, Wallet, Settings, ShieldAlert, Award, FileText } from 'lucide-react';
// import ZKVerifiedBadge from '@/components/ZKVerifiedBadge';

// type GrantDetailPageProps = {
//   params: Promise<{ id: string }>;
// };

// export default async function GrantDetailPage({ params }: GrantDetailPageProps) {
//   const { id } = await params;

//   return (
//     <div className="min-h-screen bg-[#FBFCFD] p-6 font-sans lg:p-12">
//       <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
//         {/* Header */}
//         <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//           <div className="flex items-center gap-4">
//             <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-105">
//               <ArrowLeft className="h-5 w-5 text-slate-700" />
//             </Link>
//             <div className="h-6 w-px bg-slate-200"></div>
//             <h1 className="text-xl font-bold tracking-tight text-slate-900">GrantOS v3</h1>
//           </div>
//           <div className="flex items-center gap-3">
//             <span className="font-mono text-sm font-bold uppercase text-slate-500">Grant #{id.padStart(4, '0')}</span>
//             <div className="flex items-center gap-1.5 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal-700">
//               <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500"></span>
//               Active
//             </div>
//           </div>
//         </div>

//         <div className="flex flex-col items-start gap-8 lg:flex-row">
          
//           {/* Main Content (Left Column) */}
//           <div className="w-full space-y-6 lg:w-2/3">
            
//             {/* Title & Meta */}
//             <div className="space-y-3">
//               <h2 className="text-4xl font-black tracking-tight text-[#1B1B1B]">DeFi Aggregator Protocol</h2>
//               <p className="text-sm font-medium text-slate-500">
//                 Created on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
//               </p>
//             </div>

//             {/* Builder Details */}
//             <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//               <div className="flex items-center gap-4">
//                 <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
//                   <Wallet className="h-6 w-6 text-slate-400" />
//                 </div>
//                 <div>
//                   <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Primary Recipient</p>
//                   <p className="mt-0.5 font-mono text-sm font-bold text-slate-700">0x71C...976F</p>
//                 </div>
//               </div>
//               <ZKVerifiedBadge verified={true} />
//             </div>

//             {/* Milestone Progress */}
//             <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
//               <h3 className="mb-6 text-lg font-bold text-slate-900">Milestone Pipeline</h3>
              
//               <div className="relative space-y-8 before:absolute before:inset-0 before:-translate-x-px before:ml-5 before:h-full before:w-0.5 before:bg-slate-200 md:before:mx-auto md:before:translate-x-0">
                
//                 {/* Completed */}
//                 <div className="group is-active relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse">
//                   <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-teal-500 shadow md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
//                     <CheckCircle2 className="h-5 w-5 text-white" />
//                   </div>
//                   <div className="relative w-[calc(100%-4rem)] rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm md:w-[calc(50%-2.5rem)]">
//                     <div className="absolute right-4 top-4 text-xs font-bold text-slate-400">12,500 USDC</div>
//                     <div className="mb-2 flex items-center gap-2">
//                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal-700">Completed Oct 28</span>
//                     </div>
//                     <h4 className="font-bold text-slate-900">Architecture Specification</h4>
//                     <p className="mt-2 text-sm text-slate-500">Delivery of detailed smart contract diagrams and security models.</p>
//                   </div>
//                 </div>

//                 {/* Current */}
//                 <div className="group is-active relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse">
//                   <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#F97316] shadow-md md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
//                     <span className="h-3 w-3 rounded-full bg-white"></span>
//                   </div>
//                   <div className="relative w-[calc(100%-4rem)] rounded-2xl border-2 border-[#F97316] bg-white p-5 shadow-md md:w-[calc(50%-2.5rem)]">
//                     <div className="absolute right-4 top-4 text-sm font-black text-[#F97316]">20,000 USDC</div>
//                     <div className="mb-2 flex items-center gap-2">
//                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-orange-700">In Progress</span>
//                     </div>
//                     <h4 className="text-lg font-bold text-slate-900">Smart Contract Alpha V1</h4>
//                     <p className="mb-4 mt-2 text-sm text-slate-600">Initial deployment of core lending logic on Arbitrum Sepolia.</p>
//                     <button disabled className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-400">
//                        Submit Proof (Coming soon)
//                     </button>
//                   </div>
//                 </div>

//                 {/* Locked */}
//                 <div className="group is-active relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse">
//                   <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-200 shadow-sm md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
//                     <Lock className="h-4 w-4 text-slate-400" />
//                   </div>
//                   <div className="relative w-[calc(100%-4rem)] rounded-2xl border border-slate-100 bg-slate-50 p-5 opacity-70 md:w-[calc(50%-2.5rem)]">
//                     <div className="absolute right-4 top-4 text-xs font-bold text-slate-400">17,500 USDC</div>
//                      <div className="mb-2 flex items-center gap-2">
//                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Locked</span>
//                     </div>
//                     <h4 className="font-bold text-slate-500">Mainnet Audit & Launch</h4>
//                     <p className="mt-2 text-sm text-slate-400">Third-party audit completion and final deployment.</p>
//                   </div>
//                 </div>

//               </div>
//             </div>

//           </div>

//           {/* Sidebar (Right Column) */}
//           <div className="w-full space-y-6 lg:w-1/3">
             
//              {/* Total Allocation Card */}
//              <div className="rounded-3xl bg-[#1B1B1B] p-6 text-white shadow-xl">
//                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total Grant Allocation</p>
//                <p className="mt-2 text-4xl font-black tracking-tight">50,000 <span className="text-xl text-[#FF5C35]">USDC</span></p>
               
//                <div className="mb-2 mt-6 flex items-center justify-between text-xs font-bold">
//                  <span className="text-teal-400">12,500 Disbursed</span>
//                  <span className="text-slate-500">25%</span>
//                </div>
//                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
//                  <div className="h-full w-1/4 rounded-full bg-teal-500"></div>
//                </div>
//              </div>

//              {/* Configuration Card */}
//              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Configuration</h3>
//                <ul className="space-y-4">
//                  <li className="flex items-start gap-4">
//                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
//                      <Settings className="h-4 w-4 text-indigo-500" />
//                    </div>
//                    <div>
//                      <p className="text-sm font-bold text-slate-900">Payment Mode</p>
//                      <p className="text-xs font-medium text-slate-500">Milestone-based</p>
//                    </div>
//                  </li>
//                  <li className="flex items-start gap-4">
//                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
//                      <ShieldCheck className="h-4 w-4 text-amber-500" />
//                    </div>
//                    <div>
//                      <p className="text-sm font-bold text-slate-900">Committee Constraints</p>
//                      <p className="text-xs font-medium text-slate-500">5 Members (3/5 Approvals Required)</p>
//                    </div>
//                  </li>
//                  <li className="flex items-start gap-4">
//                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
//                      <FileText className="h-4 w-4 text-blue-500" />
//                    </div>
//                    <div>
//                      <p className="text-sm font-bold text-slate-900">Smart Contract</p>
//                      <a href="#" className="text-xs font-medium text-blue-600 hover:underline">0x81B2...A149 ↗</a>
//                    </div>
//                  </li>
//                </ul>
//              </div>

//              {/* Actions Card */}
//              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//                <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Committee Actions</h3>
//                <div className="space-y-3">
//                  <button className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 text-left transition-colors hover:border-slate-200 hover:bg-slate-100">
//                    <div className="flex items-center gap-3">
//                      <Award className="h-5 w-5 text-slate-400" />
//                      <span className="text-sm font-bold text-slate-700">Approve Payment</span>
//                    </div>
//                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">Coming soon</span>
//                  </button>
//                  <button className="flex w-full items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-4 text-left transition-colors hover:border-rose-200 hover:bg-rose-50">
//                    <div className="flex items-center gap-3">
//                      <ShieldAlert className="h-5 w-5 text-rose-400" />
//                      <span className="text-sm font-bold text-rose-700">Slash Grant</span>
//                    </div>
//                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400">Coming soon</span>
//                  </button>
//                </div>
//              </div>

//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }
