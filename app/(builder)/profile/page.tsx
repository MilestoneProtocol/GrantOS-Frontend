'use client';

import BuilderAppShell from '@/components/builder/BuilderAppShell';
import PrivateBuilderProfileContent from '@/components/builder/profile/PrivateBuilderProfileContent';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';

export default function PrivateBuilderProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { address, status, isConnected } = useAccount();

  const walletResolved = status !== 'connecting' && status !== 'reconnecting';

  useEffect(() => {
    if (!walletResolved) return;
    if (!isConnected) {
      router.replace(
        `/?toast=connect_wallet&m=${encodeURIComponent('Connect your wallet to continue.')}&from=${encodeURIComponent(pathname ?? '/profile')}`,
      );
    }
  }, [isConnected, pathname, router, walletResolved]);

  if (!walletResolved || !isConnected) {
    return (
      <BuilderAppShell navActive="profile">
        <main className="flex min-h-[50vh] w-full items-center justify-center px-5 py-16 text-sm text-slate-500 md:px-8 lg:px-10">
          {walletResolved && !isConnected ? null : 'Connecting wallet…'}
        </main>
      </BuilderAppShell>
    );
  }

  if (!address) {
    return null;
  }

  return (
    <BuilderAppShell navActive="profile">
      <main className="w-full px-4 py-5 sm:px-6 md:px-8 lg:px-10">
        <PrivateBuilderProfileContent address={address} />
      </main>
    </BuilderAppShell>
  );
}
