import { NextResponse } from 'next/server';

/**
 * POST /api/github-pr
 *
 * Verifies a pull request against the live GitHub API and returns its real
 * metadata (title, author, merge status, branch, merge timestamp).
 *
 * Uses GITHUB_TOKEN when available (higher rate limits + private-repo access),
 * and falls back to the unauthenticated public API otherwise. No data is
 * fabricated — a PR that does not exist returns `found: false`.
 */

export type GithubPrResult = {
  found: boolean;
  title?: string;
  authorLogin?: string;
  merged?: boolean;
  state?: string;
  branch?: string;
  baseBranch?: string;
  mergedAt?: string | null;
  htmlUrl?: string;
  mergeCommitSha?: string | null;
  error?: string;
};

/** Accepts `owner/name`, a full GitHub URL, or `owner/name.git`. */
function parseRepo(repo: string): { owner: string; name: string } | null {
  const clean = repo
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], name: parts[1] };
}

export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = ((await req.json()) as Record<string, unknown>) ?? {};
  } catch {
    return NextResponse.json(
      { found: false, error: 'Invalid JSON body.' } satisfies GithubPrResult,
      { status: 400 },
    );
  }

  const repoRaw = typeof body.repo === 'string' ? body.repo : '';
  const prRaw = body.pr ?? body.prNumber;
  const prNumber =
    typeof prRaw === 'string' ? Number.parseInt(prRaw, 10) : Number(prRaw);

  const parsed = parseRepo(repoRaw);
  if (!parsed || !Number.isInteger(prNumber) || prNumber <= 0) {
    return NextResponse.json(
      {
        found: false,
        error: 'Provide a valid "owner/repo" and a positive PR number.',
      } satisfies GithubPrResult,
      { status: 400 },
    );
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GrantOS-PR-Verifier',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.name)}/pulls/${prNumber}`;

  try {
    const res = await fetch(url, { headers });

    if (res.status === 404) {
      return NextResponse.json({
        found: false,
        error:
          'Pull request not found. Check the repository and PR number — the repository must be public (or a GITHUB_TOKEN with access must be configured).',
      } satisfies GithubPrResult);
    }
    if (res.status === 403 || res.status === 429) {
      return NextResponse.json(
        {
          found: false,
          error:
            'GitHub API rate limit reached. Add a GITHUB_TOKEN or try again shortly.',
        } satisfies GithubPrResult,
        { status: 429 },
      );
    }
    if (!res.ok) {
      return NextResponse.json(
        {
          found: false,
          error: `GitHub API returned ${res.status}.`,
        } satisfies GithubPrResult,
        { status: 502 },
      );
    }

    const pr = (await res.json()) as {
      title?: string;
      state?: string;
      merged?: boolean;
      merged_at?: string | null;
      html_url?: string;
      merge_commit_sha?: string | null;
      user?: { login?: string };
      head?: { ref?: string };
      base?: { ref?: string };
    };

    return NextResponse.json({
      found: true,
      title: pr.title ?? '',
      authorLogin: pr.user?.login ?? '',
      merged: Boolean(pr.merged_at) || pr.merged === true,
      state: pr.state ?? 'unknown',
      branch: pr.head?.ref ?? '',
      baseBranch: pr.base?.ref ?? '',
      mergedAt: pr.merged_at ?? null,
      htmlUrl: pr.html_url ?? '',
      mergeCommitSha: pr.merge_commit_sha ?? null,
    } satisfies GithubPrResult);
  } catch (e: unknown) {
    return NextResponse.json(
      {
        found: false,
        error: e instanceof Error ? e.message : 'Failed to reach GitHub.',
      } satisfies GithubPrResult,
      { status: 502 },
    );
  }
}
