-- 안전하게 초기화
drop table if exists public.rec_result cascade;

-- (선택) gen_random_uuid()용 확장
-- create extension if not exists pgcrypto;

-- 테이블 생성
create table public.rec_result (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  crop_names text[] not null,
  expected_revenue text not null,
  indicators jsonb not null,
  combination_detail jsonb not null,
  created_at timestamptz default now()
);

-- 인덱스
create index idx_rec_result_user_id on public.rec_result(user_id);
create index idx_rec_result_created_at on public.rec_result(created_at desc);

-- RLS + 정책
alter table public.rec_result enable row level security;

create policy "Users can view their own recommendation results"
on public.rec_result for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own recommendation results"
on public.rec_result for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own recommendation results"
on public.rec_result for delete to authenticated
using (auth.uid() = user_id);

-- (옵션) 코멘트
comment on table  public.rec_result is '작물 추천 결과 저장 테이블';
comment on column public.rec_result.crop_names         is '추천된 3개 작물명 배열';
comment on column public.rec_result.expected_revenue   is '예상 매출액 (문자열, 천 단위 구분)';
comment on column public.rec_result.indicators         is '조합 지표 (수익성, 노동편의성, 품종희소성)';
comment on column public.rec_result.combination_detail is '추천 조합의 상세 정보';



