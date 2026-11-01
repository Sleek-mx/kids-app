/**
 * POST /kids/api/explain
 *   body: { subject, question, answer? }
 *   ->   { explanation }
 *
 * Rewrites a worked exam answer in plain language for a secondary-school
 * student. Provider is whichever key is present, in this order:
 *   GROQ_API_KEY -> NVIDIA_API_KEY -> OPENROUTER_API_KEY
 * All three speak the OpenAI chat-completions format, so one code path covers them.
 */

const PROVIDERS = [
  {
    env: 'GROQ_API_KEY',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'openai/gpt-oss-120b',
  },
  {
    env: 'NVIDIA_API_KEY',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'nvidia/nemotron-3-super-120b-a12b',
  },
  {
    env: 'OPENROUTER_API_KEY',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct',
  },
];

const SYSTEM = `You are a patient Kenyan secondary-school teacher.
You explain an exam answer in short, plain English that a 15-year-old can follow.
Rules:
- At most 170 words.
- Start with the single idea the question is really testing.
- Then give the working in numbered steps, one short line each.
- Use Kenyan examples (shillings, maize, matatu, sufuria) where one helps.
- Never invent facts that are not in the question or the answer.
- No greetings, no praise, no "as an AI". Just the explanation.`;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function clip(value, max) {
  return String(value == null ? '' : value).replace(/[<>]/g, ' ').trim().slice(0, max);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Send JSON.' }, 400);
  }

  const question = clip(body.question, 4000);
  const answer = clip(body.answer, 4000);
  const subject = clip(body.subject, 60);

  if (!question) return json({ error: 'No question supplied.' }, 400);

  const provider = PROVIDERS.find((p) => env[p.env]);
  if (!provider) return json({ error: 'No AI key configured on the server.' }, 500);

  const user = [
    subject ? `Subject: ${subject}` : '',
    `Question:\n${question}`,
    answer ? `The official worked answer:\n${answer}` : 'No worked answer was recorded, so work it out yourself.',
    'Explain it so the student could answer a similar question next time.',
  ].filter(Boolean).join('\n\n');

  const payload = {
    model: provider.model,
    temperature: 0.3,
    max_tokens: 500,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40000);

  try {
    const upstream = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env[provider.env]}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return json({ error: `The helper is busy (${upstream.status}).`, detail: text.slice(0, 200) }, 502);
    }

    const data = await upstream.json();
    const explanation = data?.choices?.[0]?.message?.content?.trim();
    if (!explanation) return json({ error: 'The helper sent nothing back.' }, 502);

    return json({ explanation });
  } catch (err) {
    const aborted = err && err.name === 'AbortError';
    return json({ error: aborted ? 'The helper took too long.' : 'Could not reach the helper.' }, 504);
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequestGet() {
  return json({ error: 'Use POST.' }, 405);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type, authorization',
      'access-control-allow-methods': 'POST, GET, OPTIONS',
    },
  });
}
