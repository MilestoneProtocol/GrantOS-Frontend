'use client'

import WagmiReconnectAfterMount from '@/components/WagmiReconnectAfterMount'
import NotificationProvider from '@/components/notifications/NotificationProvider'
import SettingsModal from '@/components/SettingsModal'
import ThemeProvider from '@/components/settings/ThemeProvider'
import WalletExtensionErrorHandler from '@/components/WalletExtensionErrorHandler'
import { config } from '@/lib/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <WalletExtensionErrorHandler>
          <ThemeProvider>
            <NotificationProvider>
              {mounted ? <WagmiReconnectAfterMount /> : null}
              {children}
              <SettingsModal />
            </NotificationProvider>
          </ThemeProvider>
        </WalletExtensionErrorHandler>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
