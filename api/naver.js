export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { query } = req.query;
  if (!query) return res.json({ items: [] });

  try {
    const r = await fetch(
      `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query + ' 주식')}&display=30&sort=date`,
      {
        headers: {
          'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
        },
      }
    );
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message, items: [] });
  }
}
