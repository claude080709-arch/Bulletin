-- Bulletin 앱 Supabase 테이블 설정
-- Supabase 대시보드 → SQL Editor에 붙여넣고 실행하세요

-- 1. 포트폴리오 테이블 (종목 저장)
create table if not exists portfolios (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  ticker      text not null,
  name        text not null,
  market      text not null,
  created_at  timestamptz default now()
);

-- 중복 종목 방지 (같은 유저가 같은 종목 2번 저장 불가)
create unique index if not exists portfolios_user_ticker
  on portfolios(user_id, ticker);

-- 본인 데이터만 접근 가능하도록 보안 설정
alter table portfolios enable row level security;

create policy "본인 포트폴리오만 조회" on portfolios
  for select using (auth.uid() = user_id);

create policy "본인 포트폴리오만 추가" on portfolios
  for insert with check (auth.uid() = user_id);

create policy "본인 포트폴리오만 삭제" on portfolios
  for delete using (auth.uid() = user_id);


-- 2. 뉴스 히스토리 테이블 (분석 기록 저장)
create table if not exists news_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade,
  ticker       text not null,
  title        text,
  summary      text,
  sentiment    text,
  impact_short text,
  impact_long  text,
  url          text,
  created_at   timestamptz default now()
);

-- 본인 데이터만 접근 가능하도록 보안 설정
alter table news_history enable row level security;

create policy "본인 히스토리만 조회" on news_history
  for select using (auth.uid() = user_id);

create policy "본인 히스토리만 추가" on news_history
  for insert with check (auth.uid() = user_id);
