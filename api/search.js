export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { q } = req.query;
  if (!q || q.length < 1) return res.json({ result: [] });

  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${process.env.FINNHUB_API_KEY}`
    );
    const data = await r.json();
    const filtered = (data.result || [])
      .filter(s => ['Common Stock', 'ETP'].includes(s.type))
      .slice(0, 8);
    res.json({ result: filtered });
  } catch (e) {
    res.status(500).json({ error: e.message, result: [] });
  }
}
