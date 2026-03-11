export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { symbol } = req.query;
  if (!symbol) return res.json([]);

  try {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    const toStr = to.toISOString().split('T')[0];
    const fromStr = from.toISOString().split('T')[0];

    const r = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${process.env.FINNHUB_API_KEY}`
    );
    const data = await r.json();
    res.json(Array.isArray(data) ? data.slice(0, 10) : []);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
