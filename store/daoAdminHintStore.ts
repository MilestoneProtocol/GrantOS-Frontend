'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Tracks wallet addresses that have successfully signed a `createGrant` transaction
 * during this browser session. We use this as a fallback signal for DAO-admin status
 * because the on-chain `grantor()` read in `useRoleDetection` can lag the tx by
 * several seconds (RPC indexing + the 3-stage read cascade). Without this hint a
 * fresh grantor clicking "Go to DAO Dashboard" gets bounced to onboarding before
 * the chain reads catch up.
 *
 * The hint is purely additive: it grants access to `/dao` early, but `/dao` still
 * fetches grants from chain and renders whatever the wallet is actually authorized
 * to see.
 */
type DaoAdminHintState = {
  /** Lowercased wallet addresses that have created a grant. */
  daoAdminAddresses: string[];
  markDaoAdmin: (address: string) => void;
  isDaoAdmin: (address?: string | null) => boolean;
};

export const useDaoAdminHintStore = create<DaoAdminHintState>()(
  persist(
    (set, get) => ({
      daoAdminAddresses: [],
      markDaoAdmin: (address) => {
        if (!address) return;
        const lc = address.toLowerCase();
        set((state) =>
          state.daoAdminAddresses.includes(lc)
            ? state
            : { daoAdminAddresses: [...state.daoAdminAddresses, lc] },
        );
      },
      isDaoAdmin: (address) => {
        if (!address) return false;
        return get().daoAdminAddresses.includes(address.toLowerCase());
      },
    }),
    {
      name: 'grantos:dao-admin-hint',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ daoAdminAddresses: state.daoAdminAddresses }),
    },
  ),
);
