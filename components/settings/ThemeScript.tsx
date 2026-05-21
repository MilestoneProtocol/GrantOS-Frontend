/**
 * Inline script runs before paint to force light theme and prevent flash.
 */
export default function ThemeScript() {
  const script = `
(function() {
  try {
    var root = document.documentElement;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  } catch (e) {}
})();
`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
