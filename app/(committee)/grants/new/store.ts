'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ProofType = 'zk_github' | 'eas_only';
export type PaymentMode = 'lump_sum' | 'streaming';

export type MilestoneInput = {
  id: string;
  title: string;
  description: string;
  amount: string;
  deadline: string;
  proofType: ProofType;
};

export type GrantIdentity = {
  zkVerified: boolean;
  githubHandle: string;
  accountCreationYear: number;
  contributionTier: number;
  reputationScore: bigint;
};

export type GrantCreationSource = 'dao' | null;

type GrantCreationState = {
  grantCreationSource: GrantCreationSource;
  currentStep: number;
  builderAddress: string;
  builderIdentity: GrantIdentity | null;
  grantName: string;
  category: string;
  milestones: MilestoneInput[];
  committeeMembers: string[];
  quorum: number;
  paymentMode: PaymentMode;
  approvedTxHash?: `0x${string}`;
  createdTxHash?: `0x${string}`;
  createdGrantId?: string;
  setStep: (step: number) => void;
  setBuilderAddress: (address: string) => void;
  setBuilderIdentity: (identity: GrantIdentity | null) => void;
  setGrantName: (name: string) => void;
  setCategory: (category: string) => void;
  addMilestone: () => void;
  updateMilestone: (id: string, patch: Partial<MilestoneInput>) => void;
  removeMilestone: (id: string) => void;
  moveMilestone: (id: string, direction: 'up' | 'down') => void;
  reorderMilestones: (fromIndex: number, toIndex: number) => void;
  addCommitteeMember: (address: string) => void;
  removeCommitteeMember: (address: string) => void;
  setQuorum: (quorum: number) => void;
  setPaymentMode: (mode: PaymentMode) => void;
  setApprovedTxHash: (hash?: `0x${string}`) => void;
  setCreatedTxHash: (hash?: `0x${string}`) => void;
  setCreatedGrantId: (id?: string) => void;
  setGrantCreationSource: (source: GrantCreationSource) => void;
  reset: () => void;
};

type PersistedGrantCreationState = {
  grantCreationSource: GrantCreationSource;
  currentStep: number;
  builderAddress: string;
  builderIdentity: (Omit<GrantIdentity, 'reputationScore'> & { reputationScore: string }) | null;
  grantName: string;
  category: string;
  milestones: MilestoneInput[];
  committeeMembers: string[];
  quorum: number;
  paymentMode: PaymentMode;
  approvedTxHash?: `0x${string}`;
  createdTxHash?: `0x${string}`;
  createdGrantId?: string;
};

const blankMilestone = (): MilestoneInput => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  amount: '',
  deadline: '',
  proofType: 'zk_github',
});

const initialState = {
  grantCreationSource: null as GrantCreationSource,
  currentStep: 0,
  builderAddress: '',
  builderIdentity: null,
  grantName: '',
  category: '',
  milestones: [blankMilestone()],
  committeeMembers: [],
  quorum: 1,
  paymentMode: 'lump_sum' as PaymentMode,
  approvedTxHash: undefined,
  createdTxHash: undefined,
  createdGrantId: undefined,
};

export const useGrantCreationStore = create<GrantCreationState>()(
  persist(
    (set) => ({
      ...initialState,
      setStep: (step) => set({ currentStep: step }),
      setBuilderAddress: (address) =>
        set((state) => ({
          builderAddress: address,
          builderIdentity:
            state.builderAddress.toLowerCase() === address.toLowerCase()
              ? state.builderIdentity
              : null,
        })),
      setBuilderIdentity: (identity) => set({ builderIdentity: identity }),
      setGrantName: (name) => set({ grantName: name }),
      setCategory: (category) => set({ category }),
      addMilestone: () =>
        set((state) =>
          state.milestones.length >= 10
            ? state
            : { milestones: [...state.milestones, blankMilestone()] }
        ),
      updateMilestone: (id, patch) =>
        set((state) => ({
          milestones: state.milestones.map((item) =>
            item.id === id ? { ...item, ...patch } : item
          ),
        })),
      removeMilestone: (id) =>
        set((state) => {
          if (state.milestones.length === 1) return state;
          return { milestones: state.milestones.filter((item) => item.id !== id) };
        }),
      moveMilestone: (id, direction) =>
        set((state) => {
          const index = state.milestones.findIndex((item) => item.id === id);
          if (index < 0) return state;
          const nextIndex = direction === 'up' ? index - 1 : index + 1;
          if (nextIndex < 0 || nextIndex >= state.milestones.length) return state;
          const copy = [...state.milestones];
          [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
          return { milestones: copy };
        }),
      reorderMilestones: (fromIndex, toIndex) =>
        set((state) => {
          if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= state.milestones.length ||
            toIndex >= state.milestones.length
          ) {
            return state;
          }
          const next = [...state.milestones];
          const [item] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, item);
          return { milestones: next };
        }),
      addCommitteeMember: (address) =>
        set((state) => {
          if (state.committeeMembers.length >= 7) return state;
          const already = state.committeeMembers.some(
            (m) => m.toLowerCase() === address.toLowerCase()
          );
          if (already) return state;
          return { committeeMembers: [...state.committeeMembers, address] };
        }),
      removeCommitteeMember: (address) =>
        set((state) => {
          const members = state.committeeMembers.filter((item) => item !== address);
          return { committeeMembers: members, quorum: Math.min(state.quorum, members.length || 1) };
        }),
      setQuorum: (quorum) =>
        set({
          quorum: Math.max(1, quorum),
        }),
      setPaymentMode: (mode) => set({ paymentMode: mode }),
      setApprovedTxHash: (hash) => set({ approvedTxHash: hash }),
      setCreatedTxHash: (hash) => set({ createdTxHash: hash }),
      setCreatedGrantId: (id) => set({ createdGrantId: id }),
      setGrantCreationSource: (source) => set({ grantCreationSource: source }),
      reset: () =>
        set((state) => ({
          ...initialState,
          milestones: [blankMilestone()],
          grantCreationSource: state.grantCreationSource,
        })),
    }),
    {
      name: 'grant-creation-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedGrantCreationState => ({
        grantCreationSource: state.grantCreationSource,
        currentStep: state.currentStep,
        builderAddress: state.builderAddress,
        builderIdentity: state.builderIdentity
          ? {
              ...state.builderIdentity,
              reputationScore: state.builderIdentity.reputationScore?.toString() ?? '0',
            }
          : null,
        grantName: state.grantName,
        category: state.category,
        milestones: state.milestones,
        committeeMembers: state.committeeMembers,
        quorum: state.quorum,
        paymentMode: state.paymentMode,
        approvedTxHash: state.approvedTxHash,
        createdTxHash: state.createdTxHash,
        createdGrantId: state.createdGrantId,
      }),
      merge: (persistedState, currentState) => {
        const raw = persistedState as unknown;
        let parsed: PersistedGrantCreationState | undefined;
        if (raw && typeof raw === 'object') {
          const obj = raw as { state?: PersistedGrantCreationState };
          parsed =
            obj.state && typeof obj.state === 'object' ? obj.state : (raw as PersistedGrantCreationState);
        }
        if (!parsed) return currentState;
        const uniqueCommittee = parsed.committeeMembers
          ? parsed.committeeMembers.filter(
              (item, index, self) =>
                self.findIndex((m) => m.toLowerCase() === item.toLowerCase()) === index
            )
          : [];
        return {
          ...currentState,
          ...parsed,
          committeeMembers: uniqueCommittee,
          builderIdentity: parsed.builderIdentity
            ? {
                ...parsed.builderIdentity,
                reputationScore: BigInt(parsed.builderIdentity.reputationScore),
              }
            : null,
        };
      },
    }
  )
);

export function normalizeError(error: unknown): string {
  const fallback = 'Transaction failed. Please try again.';
  const rawMessage = extractErrorMessage(error);
  if (!rawMessage) return fallback;
  const message = rawMessage.toLowerCase();

  if (message.includes('user rejected')) return 'Transaction was rejected in wallet.';
  if (message.includes('insufficient funds')) return 'Insufficient ETH for gas.';
  if (message.includes('allowance')) return 'USDC allowance is too low.';

  const revertReason = extractRevertReason(rawMessage);
  if (revertReason) return revertReason;

  return rawMessage;
}

function extractErrorMessage(error: unknown): string | null {
  if (error instanceof Error) {
    const withCause = error as Error & { cause?: unknown; shortMessage?: string };
    if (typeof withCause.shortMessage === 'string' && withCause.shortMessage.trim()) {
      return withCause.shortMessage.trim();
    }
    if (withCause.cause) {
      const nested = extractErrorMessage(withCause.cause);
      if (nested) return nested;
    }
    if (error.message.trim()) return error.message.trim();
  }
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown; shortMessage?: unknown; details?: unknown; cause?: unknown };
    if (typeof candidate.shortMessage === 'string' && candidate.shortMessage.trim()) {
      return candidate.shortMessage.trim();
    }
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message.trim();
    }
    if (typeof candidate.details === 'string' && candidate.details.trim()) {
      return candidate.details.trim();
    }
    if (candidate.cause) {
      const nested = extractErrorMessage(candidate.cause);
      if (nested) return nested;
    }
  }
  return null;
}

function extractRevertReason(message: string): string | null {
  const patterns = [
    /execution reverted(?::|\s)\s*("?)([^"\n]+)\1/i,
    /reverted with reason string\s*['"]([^'"]+)['"]/i,
    /reason:\s*("?)([^"\n]+)\1/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    const candidate = match?.[2] ?? match?.[1];
    if (candidate) {
      return cleanRevertReason(candidate);
    }
  }

  if (message.toLowerCase().includes('execution reverted')) {
    return 'Contract reverted. Double-check the grant inputs and try again.';
  }

  return null;
}

function cleanRevertReason(reason: string): string {
  return reason
    .replace(/^execution reverted[:\s-]*/i, '')
    .replace(/^reverted[:\s-]*/i, '')
    .replace(/^reason[:\s-]*/i, '')
    .replace(/\.$/, '')
    .trim();
}
