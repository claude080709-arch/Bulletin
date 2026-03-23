// 수정됨: checkAuth 제거
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { symbol, type } = req.query;
  if (!symbol) return res.json(type === 'quote' ? {} : []);
  if (!process.env.FINNHUB_API_KEY) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' });

  try {
    if (type === 'quote') {
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY}`
      );
      // 수정됨: r.ok 체크 추가
      if (!r.ok) return res.status(r.status).json({ error: `Finnhub API 오류 (${r.status})` });
      const data = await r.json();
      res.json(data);
    } else {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 14);
      const toStr = to.toISOString().split('T')[0];
      const fromStr = from.toISOString().split('T')[0];

      const r = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&token=${process.env.FINNHUB_API_KEY}`
      );
      // 수정됨: r.ok 체크 추가
      if (!r.ok) return res.status(r.status).json({ error: `Finnhub API 오류 (${r.status})` });
      const data = await r.json();
      res.json(Array.isArray(data) ? data : []);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
