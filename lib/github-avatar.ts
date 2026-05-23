/** Strip leading `@` and whitespace from an on-chain or attestation GitHub login. */
export function normalizeGithubHandle(handle: string): string {
  return handle.trim().replace(/^@/, '');
}

/** Avatar URL for any GitHub login (redirects to avatars.githubusercontent.com). */
export function githubAvatarUrl(handle: string, size = 160): string {
  const login = normalizeGithubHandle(handle);
  if (!login) return '';
  return `https://github.com/${encodeURIComponent(login)}.png?size=${size}`;
}

/** Deterministic fallback when GitHub image is missing or blocked. */
export function dicebearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

export function builderAvatarUrl(
  address: string,
  githubHandle?: string | null,
  size = 160,
): string {
  const login = normalizeGithubHandle(githubHandle ?? '');
  if (login) return githubAvatarUrl(login, size);
  return dicebearAvatarUrl(address);
}
