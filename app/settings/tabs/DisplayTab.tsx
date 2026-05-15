'use client';

import ThemeSelector from '@/components/ThemeSelector';
import SegmentedControl from '@/components/settings/SegmentedControl';
import { useSettingsStore } from '@/store/settingsStore';

function PreferenceRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-5 last:border-0 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-[55%]">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function DisplayTab() {
  const usdcDisplay = useSettingsStore((s) => s.usdcDisplay);
  const timestampFormat = useSettingsStore((s) => s.timestampFormat);
  const setUsdcDisplay = useSettingsStore((s) => s.setUsdcDisplay);
  const setTimestampFormat = useSettingsStore((s) => s.setTimestampFormat);

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Theme</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Select your preferred interface theme.
        </p>
        <div className="mt-4">
          <ThemeSelector />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Preferences</h3>
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/50 px-4 dark:border-slate-700 dark:bg-slate-900/40 sm:px-5">
          <PreferenceRow
            title="USDC Display"
            description="Choose how token values are formatted"
          >
            <SegmentedControl
              ariaLabel="USDC display format"
              value={usdcDisplay}
              onChange={setUsdcDisplay}
              options={[
                { value: 'rounded', label: 'Rounded' },
                { value: 'full', label: 'Full Precision' },
              ]}
            />
          </PreferenceRow>
          <PreferenceRow
            title="Timestamp Format"
            description="Choose how dates and times are shown"
          >
            <SegmentedControl
              ariaLabel="Timestamp format"
              value={timestampFormat}
              onChange={setTimestampFormat}
              options={[
                { value: 'relative', label: 'Relative' },
                { value: 'absolute', label: 'Absolute' },
              ]}
            />
          </PreferenceRow>
        </div>
      </section>
    </div>
  );
}
