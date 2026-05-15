'use client';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  useSettingsStore,
} from '@/store/settingsStore';
import { RotateCcw } from 'lucide-react';
import Link from 'next/link';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 border-b border-slate-100 py-4 last:border-0 dark:border-slate-800">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{description}</span>
        ) : null}
      </span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="absolute inset-0 rounded-full bg-slate-200 transition peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500/40 dark:bg-slate-700" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="px-4 sm:px-5">{children}</div>
    </section>
  );
}

export default function NotificationsTab() {
  const prefs = useSettingsStore((s) => s.notificationPreferences);
  const updateBuilder = useSettingsStore((s) => s.updateBuilderPref);
  const updateCommittee = useSettingsStore((s) => s.updateCommitteePref);
  const updateDao = useSettingsStore((s) => s.updateDaoPref);
  const reset = useSettingsStore((s) => s.resetNotificationPreferences);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          In-app alerts also appear in your{' '}
          <Link href="/notifications" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            notification history
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          Reset to defaults
        </button>
      </div>

      <Section title="Builder alerts" subtitle="When you are the grant builder">
        <ToggleRow
          label="New grant awarded"
          checked={prefs.builder.grantCreated}
          onChange={(v) => updateBuilder('grantCreated', v)}
        />
        <ToggleRow
          label="Milestone approved"
          checked={prefs.builder.milestoneApproved}
          onChange={(v) => updateBuilder('milestoneApproved', v)}
        />
        <ToggleRow
          label="Milestone rejected"
          checked={prefs.builder.milestoneRejected}
          onChange={(v) => updateBuilder('milestoneRejected', v)}
        />
        <ToggleRow
          label="Warning issued"
          checked={prefs.builder.warningIssued}
          onChange={(v) => updateBuilder('warningIssued', v)}
        />
        <ToggleRow
          label="Deadline approaching (48hrs)"
          checked={prefs.builder.deadlineApproaching}
          onChange={(v) => updateBuilder('deadlineApproaching', v)}
        />
      </Section>

      <Section title="Committee alerts" subtitle="When you serve on a grant committee">
        <ToggleRow
          label="New milestone submitted"
          checked={prefs.committee.milestoneSubmitted}
          onChange={(v) => updateCommittee('milestoneSubmitted', v)}
        />
        <ToggleRow
          label="Milestone overdue"
          checked={prefs.committee.milestoneOverdue}
          onChange={(v) => updateCommittee('milestoneOverdue', v)}
        />
        <ToggleRow
          label="Co-member vote cast"
          checked={prefs.committee.voteCast}
          onChange={(v) => updateCommittee('voteCast', v)}
        />
        <ToggleRow
          label="Quorum reached"
          checked={prefs.committee.quorumReached}
          onChange={(v) => updateCommittee('quorumReached', v)}
        />
      </Section>

      <Section title="DAO admin alerts" subtitle="Treasury and protocol-wide events">
        <ToggleRow
          label="Slash executed"
          checked={prefs.dao.slashExecuted}
          onChange={(v) => updateDao('slashExecuted', v)}
        />
        <ToggleRow
          label="New grant created"
          checked={prefs.dao.grantCreated}
          onChange={(v) => updateDao('grantCreated', v)}
        />
        <ToggleRow
          label="Builder reputation critical"
          checked={prefs.dao.reputationCritical}
          onChange={(v) => updateDao('reputationCritical', v)}
        />
        <ToggleRow
          label="Treasury threshold alert"
          description={`Alert when total escrow exceeds threshold (default ${DEFAULT_NOTIFICATION_PREFERENCES.dao.treasuryThresholdUsdc.toLocaleString()} USDC)`}
          checked={prefs.dao.treasuryThreshold}
          onChange={(v) => updateDao('treasuryThreshold', v)}
        />
        {prefs.dao.treasuryThreshold ? (
          <div className="border-b border-slate-100 py-4 dark:border-slate-800">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
              Threshold (USDC)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={prefs.dao.treasuryThresholdUsdc}
              onChange={(e) =>
                updateDao('treasuryThresholdUsdc', Math.max(0, Number(e.target.value) || 0))
              }
              className="mt-1.5 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        ) : null}
      </Section>
    </div>
  );
}
