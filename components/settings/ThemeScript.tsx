import { SETTINGS_STORAGE_KEY } from '@/store/settingsStore';

/**
 * Inline script runs before paint to apply persisted theme and prevent flash.
 */
export default function ThemeScript() {
  const script = `
(function() {
  try {
    var raw = localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)});
    if (!raw) return;
    var parsed = JSON.parse(raw);
    var theme = (parsed && parsed.state && parsed.state.theme) || 'light';
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
