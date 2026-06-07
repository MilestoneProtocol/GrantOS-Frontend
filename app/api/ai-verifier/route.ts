import type {
  AiVerifierSuccessBody,
  AiVerifierVerdict,
} from '@/lib/ai-verifier';
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

function fallbackBody(reason?: string): AiVerifierSuccessBody {
  return {
    verdict: 'UNCERTAIN',
    explanation:
      reason ??
      'Automated review is temporarily unavailable. Please rely on your ZK proof and written summary for the committee—this is advisory only.',
    id: undefined,
  };
}

function normalizeVerdict(raw: unknown): AiVerifierVerdict {
  const s = typeof raw === 'string' ? raw.trim().toUpperCase().replace(/\s+/g, '_') : '';
  if (s.includes('FULFILLED') && !s.includes('INSUFFICIENT')) return 'LIKELY_FULFILLED';
  if (s.includes('INSUFFICIENT')) return 'LIKELY_INSUFFICIENT';
  if (s === 'UNCERTAIN' || s.includes('UNCERTAIN')) return 'UNCERTAIN';
  return 'UNCERTAIN';
}

function stripCodeFence(text: string): string {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  }
  return t.trim();
}

async function fetchPrContent(prUrl: string): Promise<string | null> {
  const ghToken = process.env.GITHUB_TOKEN?.trim();
  if (!ghToken) return null;

  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;

  const [, owner, repo, prNumber] = match;
  
  try {
    const [prRes, filesRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' },
      }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`, {
        headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github.v3+json' },
      }),
    ]);

    if (!prRes.ok || !filesRes.ok) return null;

    const pr = await prRes.json() as { title?: string; body?: string };
    const files = await filesRes.json() as Array<{ filename?: string; patch?: string; additions?: number; deletions?: number }>;

    const summary = [
      `PR Title: ${pr.title || 'N/A'}`,
      `Description: ${pr.body || 'N/A'}`,
      `Files changed (${files.length}):`,
      ...files.slice(0, 10).map(f => `- ${f.filename} (+${f.additions || 0}/-${f.deletions || 0})`),
      files.length > 10 ? `... and ${files.length - 10} more files` : '',
    ].filter(Boolean).join('\n');

    return summary;
  } catch {
    return null;
  }
}

/** Preferred provider: Claude via the official Anthropic SDK. */
async function tryClaude(params: {
  milestoneDescription: string;
  prUrl: string;
  zkVerified: boolean;
}): Promise<AiVerifierSuccessBody | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const prContent = await fetchPrContent(params.prUrl);

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 400,
      system:
        'You are reviewing a grant milestone submission. Reply ONLY with compact JSON: {"verdict":"LIKELY_FULFILLED"|"UNCERTAIN"|"LIKELY_INSUFFICIENT","explanation":"one short paragraph, advisory tone, no markdown"}',
      messages: [
        {
          role: 'user',
          content: [
            `Milestone requirements:\n${params.milestoneDescription || '(none)'}`,
            `Pull request: ${params.prUrl || '(none)'}`,
            prContent
              ? `\nPR Content:\n${prContent}`
              : '\nNote: PR file contents are unavailable; judge from the description and PR reference only, and lean UNCERTAIN if you cannot confirm the work was delivered.',
            `\nZK identity checks vs registry (signal): ${params.zkVerified ? 'verified / aligned' : 'not verified or unknown'}`,
          ].join('\n\n'),
        },
      ],
    });

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    if (!rawText) return null;

    const parsedUnknown = JSON.parse(stripCodeFence(rawText)) as Record<string, unknown>;
    const verdict = normalizeVerdict(parsedUnknown.verdict);
    const explanation =
      typeof parsedUnknown.explanation === 'string' && parsedUnknown.explanation.trim().length > 0
        ? parsedUnknown.explanation.trim()
        : fallbackBody().explanation;

    return { verdict, explanation, id: `aiv-${Math.random().toString(36).slice(2, 8)}` };
  } catch {
    return null;
  }
}

async function tryOpenAi(params: {
  milestoneDescription: string;
  prUrl: string;
  zkVerified: boolean;
}): Promise<AiVerifierSuccessBody | null> {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  
  if (!openaiKey && !groqKey && !geminiKey) return null;

  let endpoint = 'https://api.openai.com/v1/chat/completions';
  let model = 'gpt-4o';
  let activeKey = openaiKey;

  if (geminiKey) {
    endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
    model = 'gemini-2.5-flash';
    activeKey = geminiKey;
  } else if (groqKey) {
    endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    model = 'llama3-70b-8192';
    activeKey = groqKey;
  }

  const prContent = await fetchPrContent(params.prUrl);
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        messages: [
          {
            role: 'system',
            content:
              'You are reviewing a grant milestone submission. Reply ONLY with compact JSON: {"verdict":"LIKELY_FULFILLED"|"UNCERTAIN"|"LIKELY_INSUFFICIENT","explanation":"one short paragraph, advisory tone, no markdown"}',
          },
          {
            role: 'user',
            content: [
              `Milestone requirements:\n${params.milestoneDescription || '(none)'}`,
              `Pull request: ${params.prUrl || '(none)'}`,
              prContent ? `\nPR Content:\n${prContent}` : 'The ZK identity checks requirement is explicitly fulfilled. However, without direct access to the content of the provided pull request, we cannot verify if \'everything\' has been adequately described as per the milestone requirements. Please ensure the PR comprehensively details all necessary aspects.',
              `\nZK identity checks vs registry (signal): ${params.zkVerified ? 'verified / aligned' : 'not verified or unknown'}`,
            ].join('\n\n'),
          },
        ],
      }),
    });

    if (!res.ok) { const text = await res.text(); return { verdict: "UNCERTAIN", explanation: "API error: " + res.status + " " + text, id: "err" }; }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawText = data.choices?.[0]?.message?.content?.trim();
    if (!rawText) return null;

    const parsedUnknown = JSON.parse(stripCodeFence(rawText)) as Record<string, unknown>;
    const verdict = normalizeVerdict(parsedUnknown.verdict);
    const explanation =
      typeof parsedUnknown.explanation === 'string' && parsedUnknown.explanation.trim().length > 0
        ? parsedUnknown.explanation.trim()
        : fallbackBody().explanation;

    return {
      verdict,
      explanation,
      id: `aiv-${Math.random().toString(36).slice(2, 8)}`,
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = ((await req.json()) as Record<string, unknown>) ?? {};
    } catch {
      return NextResponse.json(fallbackBody('Invalid JSON body — using advisory fallback.'));
    }

    const milestoneDescription =
      typeof body.milestoneDescription === 'string' ? body.milestoneDescription : '';
    const prUrl = typeof body.prUrl === 'string' ? body.prUrl : '';

    let zkVerified = typeof body.zkVerified === 'boolean' ? body.zkVerified : false;
    const legacy = body.zkProofResult as { identityMatches?: boolean } | undefined;
    if (legacy && typeof legacy.identityMatches === 'boolean') {
      zkVerified = legacy.identityMatches;
    }

    const claude = await tryClaude({ milestoneDescription, prUrl, zkVerified });
    if (claude) {
      return NextResponse.json(claude);
    }

    const openai = await tryOpenAi({ milestoneDescription, prUrl, zkVerified });
    if (openai) {
      return NextResponse.json(openai);
    }

    // No model available — return an explicit "advisory unavailable" verdict.
    // We never fabricate a LIKELY_FULFILLED / LIKELY_INSUFFICIENT result.
    return NextResponse.json(
      fallbackBody(
        'Automated AI review is not configured (no model API key). This milestone relies on its ZK proof and committee review; the AI verdict is advisory and was not produced.',
      ),
    );
  } catch {
    return NextResponse.json(fallbackBody());
  }
}
