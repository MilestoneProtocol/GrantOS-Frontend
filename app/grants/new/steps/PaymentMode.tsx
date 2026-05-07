'use client';

import { PaymentMode } from '@/app/grants/new/store';
import { AlertCircle, Banknote, Waves } from 'lucide-react';

type PaymentModeStepProps = {
  value: PaymentMode;
  onChange: (value: PaymentMode) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function PaymentModeStep({ value, onChange, onBack, onNext }: PaymentModeStepProps) {
  const isStreaming = value === 'streaming';

  return (
    <div className="flex flex-col gap-0">
      {/* Body */}
      <div className="px-5 py-6 sm:px-8 sm:py-8 space-y-6">
        {/* Heading */}
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            Select Payment Mode
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose how funds will be distributed to the grantee upon milestone approvals.
          </p>
        </div>

        {/* Option Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Lump-Sum Card */}
          <button
            type="button"
            onClick={() => onChange('lump_sum')}
            className={`relative flex flex-col items-start rounded-2xl border p-5 text-left transition-all ${
              !isStreaming
                ? 'border-slate-300 bg-white shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {/* Radio indicator */}
            <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 border-slate-300 bg-white">
              {!isStreaming && (
                <span className="h-2.5 w-2.5 rounded-full bg-slate-700" />
              )}
            </span>

            {/* Icon */}
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
              <Banknote className="h-5 w-5 text-slate-600" strokeWidth={1.8} />
            </div>

            <h3 className="text-base font-semibold text-slate-900">Lump-Sum Release</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-indigo-500">
              Full tranche releases immediately upon milestone approval by the committee.
            </p>
          </button>

          {/* Superfluid Streaming Card */}
          <button
            type="button"
            onClick={() => onChange('streaming')}
            className={`relative flex flex-col items-start rounded-2xl border p-5 text-left transition-all ${
              isStreaming
                ? 'border-emerald-400 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-400'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {/* Radio indicator */}
            <span
              className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white ${
                isStreaming ? 'border-emerald-500' : 'border-slate-300'
              }`}
            >
              {isStreaming && (
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              )}
            </span>

            {/* Icon */}
            <div
              className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
                isStreaming ? 'bg-emerald-100' : 'bg-slate-100'
              }`}
            >
              <Waves
                className={`h-5 w-5 ${isStreaming ? 'text-emerald-600' : 'text-slate-600'}`}
                strokeWidth={1.8}
              />
            </div>

            {/* Title + badge */}
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">Superfluid Streaming</h3>
              <span className="inline-flex items-center rounded-md bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Recommended
              </span>
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              USDC streams per second from approval until next deadline, cancellable on slash.
            </p>
          </button>
        </div>

        {/* Tradeoff note */}
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
          <p className="text-sm leading-relaxed text-slate-600">
            <span className="font-medium">Tradeoff Note:</span> Streaming protects DAO treasury by
            allowing immediate cancellation if grantee underperforms, while Lump-Sum provides
            grantees with immediate liquidity for upfront costs.
          </p>
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
        >
          Back
        </button>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-[#1f1f1f] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"
        >
          Continue to Review
          <span className="text-base leading-none" aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
