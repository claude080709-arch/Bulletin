// 수정됨: checkAuth 제거 — API_SECRET을 클라이언트에 내려줄 수 없으므로 의미없는 보안 제거
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'GROQ_API_KEY not configured', analyses: [] });

  const { ticker, name, market } = req.body;
  let { articles } = req.body;
  if (!articles || articles.length === 0) return res.json({ analyses: [] });
  // 기사 최대 20개 (Groq llama-3.3-70b 속도 기준 10초 내 처리 가능)
  articles = articles.slice(0, 20);

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

  const truncate = (str, max) => (str && str.length > max ? str.slice(0, max) + '…' : str || '');

  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] 제목: ${clean(a.title)}\n내용: ${truncate(clean(a.description || a.summary || ''), 200)}\nURL: ${a.url || a.link || ''}`
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
      "title": "기사 제목을 반드시 한국어로 작성. 영어 제목은 한국어로 완전히 번역할 것. 절대 영어를 그대로 쓰지 말 것.",
      "url": "기사 원본 URL 그대로",
      "sentiment": "호재 또는 악재 또는 중립 중 하나만",
      "summary": "${name}에 미치는 영향 한 문장 요약 (한국어, ~할 수 있습니다 형태)",
      "impact_short": "단기 영향 1~4주 (한국어, 1문장, ~할 수 있습니다 형태)",
      "impact_long": "장기 영향 3개월 이상 (한국어, 1문장, ~할 수 있습니다 형태)"
    }
  ]
}`;

  const MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

  async function callGroq(model) {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      throw new Error(`Groq API 오류 (${r.status}): ${errData.error?.message || '알 수 없는 오류'}`);
    }
    return r;
  }

  try {
    let r;
    let lastErr;
    for (const model of MODELS) {
      try { r = await callGroq(model); break; }
      catch (e) { lastErr = e; }
    }
    if (!r) throw lastErr;
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq 응답 없음');

    // 마크다운 코드블록 제거 (```json ... ``` 형태로 올 때 대비)
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      throw new Error(`JSON 파싱 실패: ${parseErr.message} / 원본: ${cleaned.slice(0, 200)}`);
    }
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message, analyses: [] });
  }
}
