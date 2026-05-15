'use client';

import { USDC_DECIMALS } from '@/lib/usdc';
import { useSettingsStore } from '@/store/settingsStore';
import { formatUnits } from 'viem';

export function formatAppUsdc(amount: bigint, mode: 'rounded' | 'full'): string {
  const value = Number(formatUnits(amount, USDC_DECIMALS));
  if (mode === 'full') {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: USDC_DECIMALS,
      maximumFractionDigits: USDC_DECIMALS,
    });
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatAppTimestamp(
  ts: number,
  mode: 'relative' | 'absolute',
): string {
  if (mode === 'absolute') {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function useFormatAppUsdc() {
  const mode = useSettingsStore((s) => s.usdcDisplay);
  return (amount: bigint) => formatAppUsdc(amount, mode);
}

export function useFormatAppTimestamp() {
  const mode = useSettingsStore((s) => s.timestampFormat);
  return (ts: number) => formatAppTimestamp(ts, mode);
}
