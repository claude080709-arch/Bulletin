export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { ticker, name, articles, market } = req.body;
  if (!articles || articles.length === 0) return res.json({ analyses: [] });

  const clean = (str) =>
    str
      ? str
          .replace(/<[^>]*>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim()
      : '';

  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] 제목: ${clean(a.title)}\n내용: ${clean(a.description || a.summary || '')}\nURL: ${a.url || a.link || ''}`
    )
    .join('\n\n');

  const prompt = `당신은 주식 시장 뉴스 분석 전문가입니다. 투자 조언이 아닌 정보 제공 목적으로 분석합니다.

종목: ${name} (${ticker}, ${market === 'KR' ? '한국' : '미국'} 주식)

아래 뉴스 기사들 전부를 검토하여, 이 종목에 실제로 관련성이 있는 기사만 선별하여 분석해주세요.
관련성이 낮은 기사는 제외하고, 관련 기사가 많으면 많은 대로 모두 분석해주세요. 개수 제한 없음.

${articlesText}

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{
  "analyses": [
    {
      "title": "기사 원제목 그대로",
      "url": "기사 원본 URL 그대로",
      "sentiment": "호재 또는 악재 또는 중립 중 하나만",
      "summary": "${name}에 미치는 영향 한 문장 요약 (한국어, ~할 수 있습니다 형태)",
      "impact_short": "단기 영향 1~4주 (한국어, 1문장, ~할 수 있습니다 형태)",
      "impact_long": "장기 영향 3개월 이상 (한국어, 1문장, ~할 수 있습니다 형태)"
    }
  ]
}`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
    });

    const data = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq 응답 없음');
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message, analyses: [] });
  }
}
