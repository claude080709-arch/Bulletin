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

  const { symbol, market } = req.query;
  if (!symbol) return res.json({});

  try {
    if (market === 'KR') {
      // 한국 주식: Yahoo Finance 사용 (005930 → 005930.KS)
      const yfSymbol = symbol.includes('.') ? symbol : `${symbol}.KS`;
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yfSymbol)}?range=1d&interval=1d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta || !meta.regularMarketPrice) return res.json({});

      const current = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose || meta.previousClose || current;
      const change = current - prev;
      const changePct = prev ? (change / prev) * 100 : 0;

      return res.json({ current, change, changePct, currency: 'KRW' });
    } else {
      // 미국 주식: Finnhub 사용
      if (!process.env.FINNHUB_API_KEY) return res.status(500).json({ error: 'FINNHUB_API_KEY not configured' });
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY}`
      );
      const d = await r.json();
      if (!d || !d.c) return res.json({});

      return res.json({
        current: d.c,
        change: d.d || 0,
        changePct: d.dp || 0,
        currency: 'USD'
      });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
