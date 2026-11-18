import { limited } from '../../../lib/limit.js';

export async function POST(req) {
  if (!process.env.OPENAI_API_KEY) return new Response('no tts', { status: 501 });
  if (limited(req, 40)) return new Response('rate', { status: 429 });
  const { text } = await req.json();
  if (!text || text.length > 600) return new Response('bad input', { status: 400 });
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: process.env.TTS_MODEL || 'gpt-4o-mini-tts', voice: process.env.TTS_VOICE || 'nova', input: text, response_format: 'mp3' }),
  });
  if (!r.ok) return new Response('tts failed', { status: 502 });
  return new Response(r.body, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
                          }
