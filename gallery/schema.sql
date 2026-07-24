-- ============================================================
-- 우리 동네 인구 구조 워크샵 작품 갤러리 — Supabase 스키마
-- snui(병아리반) 프로젝트와 같은 Supabase 프로젝트를 쓰되,
-- 테이블을 분리(ingu_apps / ingu_feedback)해서 데이터가 섞이지 않는다.
-- Supabase 대시보드 → SQL Editor 에 전체 붙여넣고 Run 하면 끝.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- 개인 작품 (ingu_apps) ----------
create table if not exists public.ingu_apps (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  nickname     text not null check (char_length(nickname) between 1 and 20),
  url          text not null check (url ~ '^https://'),
  description  text not null check (char_length(description) between 1 and 100),
  likes        integer not null default 0 check (likes >= 0)
);

-- ---------- 한 줄 피드백 (ingu_feedback) ----------
create table if not exists public.ingu_feedback (
  id           uuid primary key default gen_random_uuid(),
  app_id       uuid not null references public.ingu_apps (id) on delete cascade,
  created_at   timestamptz not null default now(),
  nickname     text not null check (char_length(nickname) between 1 and 16),
  content      text not null check (char_length(content) between 1 and 80)
);

create index if not exists ingu_feedback_app_id_idx on public.ingu_feedback (app_id);

-- ============================================================
-- RLS (Row Level Security)
-- 원칙: 누구나 읽고(select) 새로 쓸(insert) 수 있지만,
--       수정(update)·삭제(delete)는 전면 차단.
--       좋아요 증가만 아래 RPC 함수를 통해서만 허용.
-- ============================================================

alter table public.ingu_apps enable row level security;
alter table public.ingu_feedback enable row level security;

create policy "ingu_apps_public_select" on public.ingu_apps
  for select using (true);

create policy "ingu_apps_public_insert" on public.ingu_apps
  for insert with check (true);

create policy "ingu_feedback_public_select" on public.ingu_feedback
  for select using (true);

create policy "ingu_feedback_public_insert" on public.ingu_feedback
  for insert with check (true);

-- ============================================================
-- 좋아요 증가 RPC (원자적 UPDATE + SECURITY DEFINER)
-- ============================================================

create or replace function public.increment_ingu_likes(p_app_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_likes integer;
begin
  update public.ingu_apps
     set likes = likes + 1
   where id = p_app_id
  returning likes into new_likes;

  if new_likes is null then
    raise exception 'app not found: %', p_app_id;
  end if;

  return new_likes;
end;
$$;

revoke all on function public.increment_ingu_likes(uuid) from public;
grant execute on function public.increment_ingu_likes(uuid) to anon, authenticated;

-- ============================================================
-- 좋아요 위조 방지 트리거
-- insert 시 likes 값을 무엇으로 보내든 항상 0으로 덮어씀. 증가는 RPC로만.
-- ============================================================

create or replace function public.force_ingu_likes_zero()
returns trigger language plpgsql as $$
begin
  new.likes := 0;
  return new;
end;
$$;

drop trigger if exists trg_force_ingu_likes_zero on public.ingu_apps;
create trigger trg_force_ingu_likes_zero
  before insert on public.ingu_apps
  for each row execute function public.force_ingu_likes_zero();
