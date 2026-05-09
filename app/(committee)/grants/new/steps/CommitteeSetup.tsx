'use client';

import { useEffect, useMemo, useState } from 'react';
import { isAddress } from 'viem';
import { ArrowLeft, Minus, Plus, Wallet, X } from 'lucide-react';

type CommitteeSetupProps = {
  members: string[];
  quorum: number;
  onAddMember: (address: string) => void;
  onRemoveMember: (address: string) => void;
  onSetQuorum: (value: number) => void;
  onBack: () => void;
  onNext: () => void;
  canNext: boolean;
  errorText?: string;
};

const MAX_MEMBERS = 7;
const MIN_MEMBERS = 2;

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function dotColor(index: number) {
  const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500', 'bg-lime-500'];
  return colors[index % colors.length];
}

export default function CommitteeSetup({
  members,
  quorum,
  onAddMember,
  onRemoveMember,
  onSetQuorum,
  onBack,
  onNext,
  canNext,
  errorText,
}: CommitteeSetupProps) {
  const [input, setInput] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!localError) return;
    const timeoutId = window.setTimeout(() => setLocalError(''), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [localError]);

  const safeQuorum = Math.max(1, Math.min(quorum, Math.max(1, members.length)));

  const helper = useMemo(() => {
    const y = members.length;
    const x = Math.max(1, Math.min(safeQuorum, y || 1));
    return `${x} of ${y} members must approve each milestone.`;
  }, [members.length, safeQuorum]);

  const addMember = () => {
    const value = input.trim();
    if (!isAddress(value)) {
      setLocalError('Enter a valid wallet address.');
      return;
    }
    if (members.some((m) => m.toLowerCase() === value.toLowerCase())) {
      setLocalError('This committee address is already added.');
      return;
    }
    if (members.length >= MAX_MEMBERS) {
      setLocalError('Committee can have at most 7 members.');
      return;
    }
    onAddMember(value);
    setInput('');
    setLocalError('');
  };

  const canMinus = safeQuorum > 1;
  const canPlus = safeQuorum < Math.max(1, members.length);

  return (
    <div className="mx-auto w-full max-w-[620px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
        <p className="text-sm font-semibold text-slate-900 sm:text-base">Committee Setup</p>
        <p className="text-xs font-medium text-slate-500">Step 3 of 5</p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-6 sm:py-7">
        <div className="space-y-2">
          <p className="text-xl font-semibold tracking-tight text-slate-900 sm:text-[1.35rem]">
            Configure Grant Committee
          </p>
          <p className="text-sm leading-relaxed text-slate-500">
            Add 2–7 committee wallet addresses to manage this grant and define how many approvals each milestone payout needs.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-slate-700">
            Committee Member Addresses <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Wallet className="h-4 w-4 text-slate-400" strokeWidth={2} />
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="0x..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
              />
            </div>
            <button
              type="button"
              onClick={addMember}
              className="h-11 shrink-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              Add Member
            </button>
          </div>
          {localError ? <p className="text-sm text-red-500">{localError}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap gap-2">
            {members.map((member, idx) => (
              <div
                key={member}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm"
              >
                <span className={`h-2 w-2 rounded-full ${dotColor(idx)}`} aria-hidden />
                <span className="tabular-nums">{shortAddr(member)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveMember(member)}
                  className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Remove member"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{members.length} members added</span>
            <span>
              Min: {MIN_MEMBERS} / Max: {MAX_MEMBERS}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Approval Quorum <span className="text-rose-500">*</span>
            </label>
            <p className="text-sm leading-relaxed text-slate-500">
              Set the required number of approvals for milestone payouts.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => onSetQuorum(safeQuorum - 1)}
                disabled={!canMinus}
                className="h-11 w-11 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                aria-label="Decrease quorum"
              >
                <Minus className="mx-auto h-4 w-4" strokeWidth={2} />
              </button>
              <div className="flex h-11 w-14 items-center justify-center text-base font-semibold text-slate-900">
                {safeQuorum}
              </div>
              <button
                type="button"
                onClick={() => onSetQuorum(safeQuorum + 1)}
                disabled={!canPlus}
                className="h-11 w-11 text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                aria-label="Increase quorum"
              >
                <Plus className="mx-auto h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            <div className="flex flex-1 items-center rounded-xl bg-[#eef4ff] px-4 py-3 text-sm font-medium text-slate-700">
              {helper}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Go to previous step"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
          </button>
          {(errorText ?? '') ? <span className="text-sm text-red-500">{errorText}</span> : null}
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onNext}
            disabled={!canNext}
            className="rounded-xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
