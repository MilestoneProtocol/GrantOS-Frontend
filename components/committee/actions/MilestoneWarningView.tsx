'use client';

import type { OverdueMilestone } from '@/demo/committee-demo';
import { useDemoSlashFlow, type SlashFlowState } from '@/lib/slash-flow';
import { useCallback, useEffect, useRef, useState } from 'react';
import EnforcementActionPanel from './EnforcementActionPanel';
import IssueWarningPanel from './IssueWarningPanel';
import MilestoneActivityTimeline from './MilestoneActivityTimeline';
import MilestoneWarningHeader from './MilestoneWarningHeader';
import SlashConfirmationDialog from './SlashConfirmationDialog';
import SlashReadyPanel from './SlashReadyPanel';
import SlashedBadge from './SlashedBadge';

type MilestoneWarningViewProps = {
  milestone: OverdueMilestone;
  onCancel: () => void;
  onConfirmed?: (payload: {
    milestoneId: string;
    txHash: string;
    attestationUid: string;
    message: string;
    warningTimestampIso: string;
  }) => void;
  /**
   * Fired once the slash transaction has confirmed onchain. The host page
   * is expected to mutate the milestone into `state.kind === 'slashed'`
   * (and prepend a `Milestone Slashed Onchain` activity event); the view
   * will then collapse into the permanent `SlashedBadge`.
   */
  onSlashConfirmed?: (payload: {
    milestoneId: string;
    txHash: string;
    slashedAtIso: string;
    amountReturnedUsdc: number;
  }) => void;
};

/**
 * Focused single-milestone surface that takes over `/committee` while the
 * committee member is acting on an overdue milestone. The panel beneath the
 * header card depends on the milestone's lifecycle substate:
 *
 *   `deadline_missed`  → `IssueWarningPanel` (editable warning composer).
 *   `warning_issued`   → `EnforcementActionPanel` (passive 24h countdown)
 *                        until `Date.now() >= slashUnlocksAtIso`, at which
 *                        point the panel swaps to `SlashReadyPanel` — no
 *                        page refresh, no manual mutation.
 *   `slash_available`  → `SlashReadyPanel` (active red Execute Slash Now).
 *   `slashed`          → `SlashedBadge` (permanent black collapsed state).
 *
 * The activity timeline always sits at the bottom so the audit trail
 * (deadline missed → warning issued → slashed) stays visible regardless of
 * which action panel is shown.
 */
export default function MilestoneWarningView({
  milestone,
  onCancel,
  onConfirmed,
  onSlashConfirmed,
}: MilestoneWarningViewProps) {
  return (
    <div className="flex flex-col gap-5">
      <MilestoneWarningHeader milestone={milestone} />
      <ActionPanel
        milestone={milestone}
        onCancel={onCancel}
        onConfirmed={onConfirmed}
        onSlashConfirmed={onSlashConfirmed}
      />
      <MilestoneActivityTimeline events={milestone.activity} />
    </div>
  );
}

/* ----------------------------- Panel router ----------------------------- */

function ActionPanel({
  milestone,
  onCancel,
  onConfirmed,
  onSlashConfirmed,
}: MilestoneWarningViewProps) {
  switch (milestone.state.kind) {
    case 'deadline_missed':
      return (
        <IssueWarningPanel
          milestone={milestone}
          onCancel={onCancel}
          onConfirmed={onConfirmed}
        />
      );
    case 'warning_issued':
      return (
        <WarningIssuedRouter
          milestone={milestone}
          state={milestone.state}
          onSlashConfirmed={onSlashConfirmed}
        />
      );
    case 'slash_available':
      return (
        <SlashLifecycle
          milestone={milestone}
          warningState={milestone.state}
          onSlashConfirmed={onSlashConfirmed}
        />
      );
    case 'slashed':
      return <SlashedBadge state={milestone.state} />;
  }
}

/**
 * While `warning_issued`, this component subscribes to wall-clock time
 * (1Hz) and swaps the passive `EnforcementActionPanel` for the active
 * `SlashReadyPanel` the instant `Date.now() >= slashUnlocksAtIso`.
 */
function WarningIssuedRouter({
  milestone,
  state,
  onSlashConfirmed,
}: {
  milestone: OverdueMilestone;
  state: Extract<
    OverdueMilestone['state'],
    { kind: 'warning_issued' }
  >;
  onSlashConfirmed?: MilestoneWarningViewProps['onSlashConfirmed'];
}) {
  const elapsed = useSlashUnlockElapsed(state.slashUnlocksAtIso);

  if (!elapsed) {
    return <EnforcementActionPanel state={state} />;
  }

  return (
    <SlashLifecycle
      milestone={milestone}
      warningState={state}
      onSlashConfirmed={onSlashConfirmed}
    />
  );
}

/**
 * Hosts the `SlashReadyPanel` + the `SlashConfirmationDialog` and threads
 * the slash FSM between them. Lives here (not in `SlashReadyPanel`) because
 * the modal must overlay the entire page, not just the panel.
 */
function SlashLifecycle({
  milestone,
  warningState,
  onSlashConfirmed,
}: {
  milestone: OverdueMilestone;
  warningState:
    | Extract<OverdueMilestone['state'], { kind: 'warning_issued' }>
    | Extract<OverdueMilestone['state'], { kind: 'slash_available' }>;
  onSlashConfirmed?: MilestoneWarningViewProps['onSlashConfirmed'];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const flow = useDemoSlashFlow();

  const handleExecute = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
    flow.reset();
  }, [flow]);

  const handleConfirm = useCallback(() => {
    flow.start({
      grantId: parseInt(milestone.grantId),
      milestoneIndex: milestone.milestoneIndex,
      escrowAddress: '0x0000000000000000000000000000000000000000',
      amountUsdc: milestone.escrowBalanceUsdc.toString(),
    });
  }, [flow, milestone]);

  useSlashConfirmedEffect(flow.state, (state) => {
    onSlashConfirmed?.({
      milestoneId: milestone.id,
      txHash: state.txHash,
      slashedAtIso: state.slashedAtIso,
      amountReturnedUsdc: milestone.escrowBalanceUsdc,
    });
    // Brief grace period so the user registers the "Slash Confirmed
    // Onchain" green pill in the modal footer before the page swaps in the
    // permanent SlashedBadge. The host page will unmount this entire
    // subtree as part of the state transition, so we don't need to reset
    // the dialog state ourselves — but we do close it eagerly to avoid the
    // confirmed pill flashing on top of the new SlashedBadge.
    window.setTimeout(() => setDialogOpen(false), 750);
  });

  return (
    <>
      <SlashReadyPanel state={warningState} onExecute={handleExecute} />
      <SlashConfirmationDialog
        open={dialogOpen}
        flowState={flow.state}
        amountLabel={`${formatUsd(milestone.escrowBalanceUsdc)} USDC`}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </>
  );
}

/* ------------------------------- Hooks ------------------------------- */

/**
 * Returns `true` once `Date.now()` has crossed `slashUnlocksAtIso`. Polls at
 * 1Hz while the cool-off is still active and stops the timer the moment it
 * flips. This is the trigger that swaps the passive `EnforcementActionPanel`
 * for the active `SlashReadyPanel` without a page refresh (PRD requirement).
 */
function useSlashUnlockElapsed(slashUnlocksAtIso: string): boolean {
  const compute = useCallback(() => {
    const target = new Date(slashUnlocksAtIso).getTime();
    if (Number.isNaN(target)) return false;
    return Date.now() >= target;
  }, [slashUnlocksAtIso]);

  const [elapsed, setElapsed] = useState<boolean>(compute);

  useEffect(() => {
    setElapsed(compute());
    if (compute()) return;
    const interval = window.setInterval(() => {
      if (compute()) {
        setElapsed(true);
        window.clearInterval(interval);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [compute]);

  return elapsed;
}

/** Fire `cb` exactly once on the transition into `confirmed`. */
function useSlashConfirmedEffect(
  state: SlashFlowState,
  cb: (state: Extract<SlashFlowState, { kind: 'confirmed' }>) => void,
) {
  const firedForRef = useRef<string | null>(null);
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    if (state.kind !== 'confirmed') {
      if (state.kind === 'idle') firedForRef.current = null;
      return;
    }
    const key = `${state.txHash}:${state.slashedAtIso}`;
    if (firedForRef.current === key) return;
    firedForRef.current = key;
    cbRef.current(state);
  }, [state]);
}

/* ------------------------------ Helpers ------------------------------ */

function formatUsd(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
