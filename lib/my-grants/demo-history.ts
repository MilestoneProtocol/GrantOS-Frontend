import { getDaoDashboardSnapshot } from '@/demo/dao-dashboard';
import { isUiDemoMode } from '@/demo';
import { mapDemoGrantToRecord } from '@/lib/my-grants/utils';
import type { MyGrantRecord } from '@/lib/my-grants/types';

/**
 * Demo catalogue: all DAO snapshot grants for this builder, plus every other
 * snapshot grant re-labelled so any connected wallet gets a rich history in UI demo.
 */
export function loadDemoMyGrants(builderAddress: string): MyGrantRecord[] {
  if (!isUiDemoMode()) return [];
  const snap = getDaoDashboardSnapshot(0);
  const lower = builderAddress.toLowerCase();

  const own = snap.grants.filter((g) => g.builder.toLowerCase() === lower);
  const others = snap.grants.filter((g) => g.builder.toLowerCase() !== lower);

  const records: MyGrantRecord[] = own.map(mapDemoGrantToRecord);

  others.forEach((card, i) => {
    const mapped = mapDemoGrantToRecord({
      ...card,
      builder: builderAddress as `0x${string}`,
      displayId: `${card.displayId}-B${i + 1}`,
    });
    mapped.key = `demo-borrowed-${card.slug}-${i}`;
    records.push(mapped);
  });

  return records;
}
