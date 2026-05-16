import type {
  AiVerifierSuccessBody,
  AiVerifierVerdict,
} from '@/lib/ai-verifier';
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
              `ZK identity checks vs registry (signal): ${params.zkVerified ? 'verified / aligned' : 'not verified or unknown'}`,
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

function deterministicMock(seed: string): AiVerifierSuccessBody {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const r = h % 3;
  const verdict: AiVerifierVerdict =
    r === 0 ? 'LIKELY_FULFILLED' : r === 1 ? 'UNCERTAIN' : 'LIKELY_INSUFFICIENT';

  const explanation =
    verdict === 'LIKELY_FULFILLED'
      ? `The PR scope appears consistent with the milestone description and ZK signals; treat this as advisory until committee review.`
      : verdict === 'UNCERTAIN'
        ? `Some requirements may need manual verification beyond automated signals; advisory only.`
        : `Signals suggest gaps versus the stated milestone scope; advisory only—committee decides.`;

  return {
    verdict,
    explanation,
    id: `aiv-${Math.random().toString(36).slice(2, 6)}`,
  };
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

    const openai = await tryOpenAi({ milestoneDescription, prUrl, zkVerified });
    if (openai) {
      return NextResponse.json(openai);
    }

    const seed = `${prUrl}:${zkVerified}:${milestoneDescription.slice(0, 120)}`;
    return NextResponse.json(deterministicMock(seed));
  } catch {
    return NextResponse.json(fallbackBody());
  }
}
