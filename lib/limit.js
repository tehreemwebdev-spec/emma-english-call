const hits = new Map();
export function limited(req, max = 40) {
  const ip = (req.headers.get('x-forwarded-for') || 'local').split(',')[0];
  const now = Date.now();
  const a = (hits.get(ip) || []).filter((t) => now - t < 60000);
  a.push(now);
  hits.set(ip, a);
  return a.length > max;
}
