/**
 * Runs before React hydrates so wallet-extension noise does not surface as a fatal overlay.
 */
export default function ExtensionGuardScript() {
  const script = `
(function () {
  function isNoise(reason) {
    var msg = '';
    if (typeof reason === 'string') msg = reason;
    else if (reason && reason.message) msg = reason.message;
    else if (reason != null) msg = String(reason);
    return (
      msg.indexOf('chrome.runtime.sendMessage') !== -1 ||
      msg.indexOf('Extension ID') !== -1 ||
      msg.indexOf('inpage.js') !== -1
    );
  }
  window.addEventListener(
    'unhandledrejection',
    function (e) {
      if (isNoise(e.reason)) e.preventDefault();
    },
    true
  );
  window.addEventListener(
    'error',
    function (e) {
      if (isNoise(e.error || e.message)) e.preventDefault();
    },
    true
  );
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
