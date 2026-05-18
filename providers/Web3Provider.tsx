'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import NotificationProvider from '@/components/notifications/NotificationProvider'
import SettingsModal from '@/components/SettingsModal'
import ThemeProvider from '@/components/settings/ThemeProvider'
import WalletExtensionErrorHandler from '@/components/WalletExtensionErrorHandler'
import { config } from '@/lib/wagmi'
import { ReactNode } from 'react'

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <WalletExtensionErrorHandler>
          <ThemeProvider>
            <NotificationProvider>
              {children}
              <SettingsModal />
            </NotificationProvider>
          </ThemeProvider>
        </WalletExtensionErrorHandler>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
