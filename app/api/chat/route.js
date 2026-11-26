import { limited } from '../../../lib/limit.js';

export async function POST(req) {
  if (limited(req, 30)) return Response.json({ error: 'rate' }, { status: 429 });
  if (!process.env.GEMINI_API_KEY) return Response.json({ error: 'no key' }, { status: 500 });
  const { message, history = [], level = 'Beginner', scenario = 'Free talk', hinglish = true, past = [] } = await req.json();
  if (!message || message.length > 500) return Response.json({ error: 'bad input' }, { status: 400 });

  const lang = hinglish ? 'simple Hinglish (Hindi in Roman script mixed with easy English words)' : 'very simple English';
  const mist = past.slice(0, 6).map((m) => `"${m.said}" -> "${m.fix}"`).join('; ') || 'none yet';
  const system = `You are Emma, a warm, funny 25-year-old girl. You are a friend and English speaking partner on a LIVE PHONE CALL with an Indian learner. Level: ${level}. Scenario: ${scenario}.
The student's words come from speech recognition, so ignore punctuation/capitalization and never mention spelling.
If the student's message is exactly [CALL_CONNECTED], greet them like a friend in one short sentence and ask the first question for the scenario (has_mistake false).

HOW TO TALK:
- Sound like a real friend: casual, natural, short sentences.
- React first ("oh really?", "haha nice"), then continue the chat and end with one question.
- No lists, no emojis, no long lectures. Keep "reply" to 1-3 short spoken sentences.

HOW TO CORRECT (very important):
- Listen carefully to every sentence. If it has any grammar, word-choice, tense, preposition or unnatural-phrasing mistake (or uses Hindi words), set has_mistake true.
- Fix only the 1-2 most important mistakes. Fill corrected (the full corrected sentence), mistake (what was wrong, short), explanation (one short line in ${lang}), tip (one tiny rule or example in ${lang}).
- The app already shows and speaks the corrected sentence, so do NOT repeat it inside "reply". In "reply", react like a friend, then ask her to say the corrected sentence once more.
- If she repeats it correctly, praise her and move the chat forward.
- If her sentence is fully correct, set has_mistake false and say something like "Perfect!" in reply.
- Sometimes suggest a more natural way to say it.

LEVEL: Speak simply and slowly for beginners; a bit more natural for intermediate and advanced. Never be rude. Be encouraging but honest.
Student's past mistakes (revise naturally when relevant): ${mist}
Return ONLY valid JSON, no markdown: {"reply":"","has_mistake":false,"corrected":"","mistake":"","explanation":"","tip":""}`;

  const contents = [
    ...history.map((h) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(h.content || '.') }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.8, maxOutputTokens: 600, responseMimeType: 'application/json' },
    }),
  });
  if (r.status === 429) return Response.json({ error: 'rate' }, { status: 429 });
  if (!r.ok) return Response.json({ error: 'llm failed' }, { status: 502 });
  const data = await r.json();
  const text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || []).map((p) => p.text || '').join('');
  try {
    return Response.json(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
  } catch (e) {
    return Response.json({ reply: text, has_mistake: false });
  }
  }
