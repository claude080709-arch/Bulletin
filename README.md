# Bulletin

한국/미국 주식을 한 곳에서 모니터링하고, 네이버 뉴스 기반 AI 감성 분석까지 제공하는 포트폴리오 뉴스 브리핑 앱.

🔗 **라이브 링크:** [배포 URL 입력]

---

## 1. 왜 만들었나

주식 종목을 여러 개 보유하면 각 종목 뉴스를 사이트마다 따로 확인해야 한다. 한국주식은 네이버, 미국주식은 영문 사이트, 감성 판단은 직접. 이 과정을 한 화면에서 끝내고 싶었다.

---

## 2. 주요 기능

| 기능 | 설명 |
|------|------|
| 포트폴리오 저장 | 관심 종목 등록, 로그인 기반 개인화 저장 (Supabase) |
| 실시간 시세 | 한국주식(Yahoo Finance), 미국주식(Finnhub) 현재가 + 등락률 |
| 네이버 뉴스 수집 | 종목명 기반 최신 뉴스 30건 자동 수집 |
| AI 감성 분석 | Groq LLM이 뉴스별 호재/악재/중립 판단 + 단기/장기 영향 요약 |
| 분석 히스토리 | 과거 분석 결과 저장 및 재열람 |

---

## 3. 기술 스택 및 선택 이유

### Frontend
- **HTML + CSS + JS (단일 파일)** — 프레임워크 없이 빠른 배포, 의존성 없음

### Backend (Vercel Serverless Functions)
- **`api/price.js`** — 시세 조회
- **`api/naver.js`** — 네이버 뉴스 검색
- **`api/search.js`** — 종목 검색 (Finnhub)
- **`api/groq.js`** — AI 감성 분석

### 데이터 소스 분기 이유
| 시장 | API | 이유 |
|------|-----|------|
| 한국주식 | Yahoo Finance (`005930.KS`) | Finnhub이 한국 시장 지원 불안정. Yahoo Finance는 `.KS` 접미사로 KRX 데이터 제공 |
| 미국주식 | Finnhub | 실시간 quote API 무료 제공, 종목 검색 기능 포함 |

### Supabase RLS 보안 설계 이유
포트폴리오와 히스토리는 사용자별 개인 데이터. RLS(Row Level Security) 정책으로 `auth.uid() = user_id` 조건을 DB 레벨에서 강제 → 서버 코드 버그가 있어도 타인 데이터 접근 불가.

### Groq 선택 이유
- 무료 tier에서 llama-3.3-70b 사용 가능
- 응답 속도가 OpenAI 대비 빠름 (뉴스 20건 10초 내 처리)
- `response_format: json_object` 지원으로 파싱 안정성 확보

---

## 4. 아키텍처

```
Browser (index.html)
    │
    ├── Supabase JS SDK ──────────────── Supabase DB (portfolios, news_history)
    │                                        └── RLS: user_id 기반 격리
    │
    └── Vercel Serverless Functions
            ├── /api/price    ── Yahoo Finance (KR) / Finnhub (US)
            ├── /api/naver    ── Naver News Open API
            ├── /api/search   ── Finnhub Symbol Search
            └── /api/groq     ── Groq API (llama-3.3-70b → llama-3.1-8b fallback)
```

---

## 5. 어려웠던 점

**① 한국/미국 시세 API 통합**
단일 API로 양쪽 처리 불가. Yahoo Finance는 `.KS` 심볼로 KRX 접근, Finnhub은 미국 종목 담당으로 분리해 해결.

**② 네이버 뉴스 HTML 엔티티 오염**
뉴스 title/description에 `&lt;`, `&amp;` 등 HTML 엔티티가 그대로 포함돼 Groq 프롬프트 오염 발생. `clean()` 함수로 전처리 후 전송.

**③ Groq 컨텍스트 길이 초과**
기사 전문을 그대로 넣으면 토큰 초과. `truncate(200자)` + 최대 20건 제한으로 10초 내 처리 가능하도록 조정.

**④ Groq 모델 rate limit**
llama-3.3-70b 단독 사용 시 rate limit 발생. llama-3.1-8b-instant로 자동 fallback하는 모델 순환 로직 추가.

---

## 6. 로컬 실행 가이드

### 필요한 환경변수

`.env` 파일을 프로젝트 루트에 생성:

```env
GROQ_API_KEY=gsk_...
FINNHUB_API_KEY=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
API_SECRET=임의의_비밀키 (선택)
```

### API 키 발급 위치
| 키 | 발급 위치 |
|----|----------|
| GROQ_API_KEY | console.groq.com → API Keys |
| FINNHUB_API_KEY | finnhub.io → Dashboard |
| NAVER_CLIENT_ID/SECRET | developers.naver.com → 애플리케이션 등록 |
| Supabase | supabase.com → 프로젝트 Settings → API |

### Supabase DB 초기화
Supabase 대시보드 → SQL Editor → `setup.sql` 내용 전체 붙여넣고 실행.

### 실행
```bash
npm i -g vercel
vercel dev
```
→ `localhost:3000` 접속

---

## 7. 라이브 링크

🔗 [배포 URL 입력]
