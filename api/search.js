function checkAuth(req, res) {
  const secret = process.env.API_SECRET;
  if (secret && req.headers['x-api-key'] !== secret) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!checkAuth(req, res)) return;

  const { q } = req.query;
  if (!q || q.length < 1) return res.json({ result: [] });
  if (!process.env.FINNHUB_API_KEY) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured', result: [] });

  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${process.env.FINNHUB_API_KEY}`
    );
    const data = await r.json();
    const filtered = (data.result || [])
      .filter(s => ['Common Stock', 'ETP', 'ETF', 'Fund'].includes(s.type) || !s.type)
      .slice(0, 8);
    res.json({ result: filtered });
  } catch (e) {
    res.status(500).json({ error: e.message, result: [] });
  }
}
