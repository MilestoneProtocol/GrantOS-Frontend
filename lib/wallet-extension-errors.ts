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
    msg.includes('MetaMask extension not found')
  );
}
