/** Browser wallet extensions often throw this when multiple injectors compete. */
export function isWalletExtensionNoise(reason: unknown): boolean {
  const msg =
    typeof reason === 'string'
      ? reason
      : reason instanceof Error
        ? reason.message
        : String(reason ?? '');

  return (
    msg.includes('chrome.runtime.sendMessage') ||
    msg.includes('Extension ID') ||
    msg.includes('inpage.js') ||
    msg.includes('Failed to connect to MetaMask') ||
    msg.includes('MetaMask extension not found') ||
    // Auto-reconnect can throw this on Chrome when the previously-stored
    // connector points at an injected provider that another wallet has
    // hijacked. We only suppress it when it bubbles up unhandled —
    // the modal still surfaces it when the user explicitly clicks Connect.
    msg.includes('Provider not found') ||
    msg.includes('ProviderNotFoundError') ||
    msg.includes('ConnectorNotConnectedError')
  );
}
