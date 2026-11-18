import { limited } from '../../../lib/limit.js';

export async function POST(req) {
  if (limited(req, 30)) return Response.json({ error: 'rate' }, { status: 429 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'no key' }, { status: 500 });
  const { message, history = [], level = 'Beginner', scenario = 'Free talk', hinglish = true, past = [] } = await req.json();
  if (!message || message.length > 500) return Response.json({ error: 'bad input' }, { status: 400 });

  const lang = hinglish ? 'simple Hinglish (Hindi in Roman script mixed with easy English words)' : 'very simple English';
  const mist = past.slice(0, 6).map((m) => `"${m.said}" -> "${m.fix}"`).join('; ') || 'none yet';
  const system = `You are Emma, a warm, patient, encouraging English tutor on a LIVE PHONE CALL with an Indian learner. Level: ${level}. Scenario: ${scenario}.
The student's words come from speech recognition, so ignore punctuation/capitalization and never mention spelling.
If the student's message is exactly [CALL_CONNECTED], greet them in one short sentence and ask the first question for the scenario (has_mistake false).
Keep "reply" very short (1-2 spoken sentences), natural, matched to the level, ending with a question.
If the student's latest sentence has any grammar, word-choice, tense, preposition or unnatural-phrasing mistake (or uses Hindi words), set has_mistake true and fill corrected (full corrected sentence), mistake (what was wrong, short), explanation (why, in ${lang}), tip (one tiny rule or example in ${lang}). Never be harsh. If correct, has_mistake false and praise briefly inside reply.
Student's past mistakes (revise naturally when relevant): ${mist}
Return ONLY valid JSON, no markdown: {"reply":"","has_mistake":false,"corrected":"","mistake":"","explanation":"","tip":""}`;

  const messages = [...history.map((h) => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: String(h.content || '.') })), { role: 'user', content: message }];
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 400, system, messages }),
  });
  if (!r.ok) return Response.json({ error: 'llm failed' }, { status: 502 });
  const data = await r.json();
  const text = (data.content && data.content[0] && data.content[0].text) || '';
  try {
    return Response.json(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
  } catch (e) {
    return Response.json({ reply: text, has_mistake: false });
  }
                                                                                                                  }
