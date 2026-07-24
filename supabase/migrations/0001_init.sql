-- =============================================================
-- 0001_init.sql — Phase 1 초기 스키마
-- 결정 문서: docs/decisions/001-schema-and-rls.md
-- =============================================================

-- -------------------------------------------------------------
-- 1. 사용자
-- -------------------------------------------------------------

create table if not exists profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null,
  name        text,
  avatar_url  text,
  role        text not null default 'member'   check (role   in ('admin','member')),
  status      text not null default 'pending'  check (status in ('pending','active','rejected','suspended')),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);

comment on table profiles is '사용자. auth.users와 1:1. 신규 가입자는 pending으로 생성된다.';

-- 신규 가입 시 profiles 행 자동 생성
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- RLS 정책에서 profiles를 재귀 참조하지 않기 위한 헬퍼
create or replace function is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active'
  );
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active' and role = 'admin'
  );
$$;

-- -------------------------------------------------------------
-- 2. 섹터 (Phase 1에서는 기본 행 1개만 사용)
-- -------------------------------------------------------------

create table if not exists sectors (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  include_keywords  text[] not null default '{}',
  exclude_keywords  text[] not null default '{}',
  created_at        timestamptz not null default now()
);

insert into sectors (id, name)
values ('00000000-0000-0000-0000-000000000001', '전체')
on conflict (id) do nothing;

-- -------------------------------------------------------------
-- 3. 명부
-- -------------------------------------------------------------

create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  sector_id   uuid references sectors(id) default '00000000-0000-0000-0000-000000000001',
  name        text not null,
  name_norm   text not null,              -- 매칭용 정규화 이름
  aliases     text[] not null default '{}',
  biz_no      text,
  founded_on  date,
  status      text not null default 'candidate' check (status in ('candidate','confirmed','archived')),
  confidence  int  not null default 0,     -- 확인 경로 수
  tags        text[] not null default '{}',
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists companies_name_norm_key on companies(name_norm);
create index if not exists companies_status_idx on companies(status);

comment on column companies.name_norm is '㈜·(주)·주식회사·공백 제거 후 소문자화. 매칭 키.';

create table if not exists company_verifications (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  source       text not null,              -- gov_selection | tips | ac_portfolio | manual | self_declared
  evidence_url text,
  note         text,
  verified_at  timestamptz not null default now()
);

create index if not exists company_verifications_company_idx on company_verifications(company_id);

-- -------------------------------------------------------------
-- 4. 원천 데이터 (L0)
-- -------------------------------------------------------------

create table if not exists raw_items (
  id           uuid primary key default gen_random_uuid(),
  source_key   text not null,              -- 'rss:platum', 'api:kstartup' 등
  source_grade int  not null default 3 check (source_grade between 1 and 3),
  external_id  text not null,              -- 소스 고유 ID 또는 URL/제목 해시
  url          text,
  title        text,
  raw_content  text,
  raw_payload  jsonb,
  published_at timestamptz,
  fetched_at   timestamptz not null default now()
);

-- 수집 멱등성의 기반
create unique index if not exists raw_items_source_external_key
  on raw_items(source_key, external_id);
create index if not exists raw_items_published_idx on raw_items(published_at desc);

-- -------------------------------------------------------------
-- 5. 카드 (L2)
-- -------------------------------------------------------------

create table if not exists cards (
  id              uuid primary key default gen_random_uuid(),
  sector_id       uuid references sectors(id) default '00000000-0000-0000-0000-000000000001',
  title           text not null,
  summary         text,
  url             text,
  source_key      text not null,
  source_grade    int  not null default 3 check (source_grade between 1 and 3),
  published_on    date not null,
  topic           text not null default 'startup_invest'
                    check (topic in ('tech_industry','policy_law','startup_invest')),
  depth           text check (depth in ('news','tech','research')),
  depth_reason    text,
  ring            int  not null default 3 check (ring between 0 and 3),
  ring_reason     text,
  company_id      uuid references companies(id),
  match_confidence numeric,
  tags            text[] not null default '{}',
  score           int  not null default 0,
  score_breakdown jsonb,
  hidden          boolean not null default false,
  primary_raw_id  uuid references raw_items(id),
  created_at      timestamptz not null default now()
);

create index if not exists cards_published_idx on cards(published_on desc);
create index if not exists cards_score_idx on cards(score desc, published_on desc);
create index if not exists cards_company_idx on cards(company_id);
create index if not exists cards_topic_idx on cards(topic);
create index if not exists cards_hidden_idx on cards(hidden) where hidden = false;

-- 전문 검색 (과거 카드 회수용)
create index if not exists cards_fts_idx on cards
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'')));

create table if not exists card_sources (
  card_id uuid not null references cards(id) on delete cascade,
  raw_id  uuid not null references raw_items(id) on delete cascade,
  primary key (card_id, raw_id)
);

-- -------------------------------------------------------------
-- 6. 묶음 (L3)
-- -------------------------------------------------------------

create table if not exists bundles (
  id          uuid primary key default gen_random_uuid(),
  sector_id   uuid references sectors(id) default '00000000-0000-0000-0000-000000000001',
  author_id   uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text,
  confidence  text not null default 'estimate' check (confidence in ('certain','estimate','question')),
  ai_drafted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists bundles_author_idx on bundles(author_id);
create index if not exists bundles_created_idx on bundles(created_at desc);

create table if not exists bundle_cards (
  bundle_id uuid not null references bundles(id) on delete cascade,
  card_id   uuid not null references cards(id) on delete cascade,
  position  int not null default 0,
  primary key (bundle_id, card_id)
);

-- -------------------------------------------------------------
-- 7. 파이프라인 이력
-- -------------------------------------------------------------

create table if not exists ingestion_runs (
  id            uuid primary key default gen_random_uuid(),
  source_key    text not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running' check (status in ('running','success','failed','partial')),
  fetched_count int not null default 0,
  created_count int not null default 0,
  error_message text,
  watermark     text,                       -- 마지막 성공 커서
  created_at    timestamptz not null default now()
);

create index if not exists ingestion_runs_source_idx on ingestion_runs(source_key, started_at desc);

create table if not exists ai_runs (
  id             uuid primary key default gen_random_uuid(),
  card_id        uuid references cards(id) on delete set null,
  task           text not null,             -- summarize | classify_depth
  model          text not null,
  prompt_version text not null,
  input_tokens   int,
  output_tokens  int,
  cost_usd       numeric,
  status         text not null default 'success' check (status in ('success','failed')),
  error_message  text,
  created_at     timestamptz not null default now()
);

create index if not exists ai_runs_created_idx on ai_runs(created_at desc);

-- -------------------------------------------------------------
-- 8. RLS
-- -------------------------------------------------------------

alter table profiles              enable row level security;
alter table sectors               enable row level security;
alter table companies             enable row level security;
alter table company_verifications enable row level security;
alter table raw_items             enable row level security;
alter table cards                 enable row level security;
alter table card_sources          enable row level security;
alter table bundles               enable row level security;
alter table bundle_cards          enable row level security;
alter table ingestion_runs        enable row level security;
alter table ai_runs               enable row level security;

-- profiles: 본인은 항상 조회 가능(대기 화면용), active는 전원 조회, admin만 상태 변경
drop policy if exists profiles_select_self on profiles;
create policy profiles_select_self on profiles
  for select using (id = auth.uid());

drop policy if exists profiles_select_active on profiles;
create policy profiles_select_active on profiles
  for select using (is_active());

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles
  for update using (is_admin());

-- sectors: active 조회
drop policy if exists sectors_select on sectors;
create policy sectors_select on sectors for select using (is_active());

-- companies: active 조회, admin 쓰기
drop policy if exists companies_select on companies;
create policy companies_select on companies for select using (is_active());

drop policy if exists companies_write on companies;
create policy companies_write on companies for all
  using (is_admin()) with check (is_admin());

drop policy if exists company_verifications_select on company_verifications;
create policy company_verifications_select on company_verifications
  for select using (is_active());

drop policy if exists company_verifications_write on company_verifications;
create policy company_verifications_write on company_verifications for all
  using (is_admin()) with check (is_admin());

-- raw_items: admin만
drop policy if exists raw_items_select_admin on raw_items;
create policy raw_items_select_admin on raw_items for select using (is_admin());

-- cards: active 조회, admin 수정(숨기기 등)
drop policy if exists cards_select on cards;
create policy cards_select on cards for select using (is_active());

drop policy if exists cards_update on cards;
create policy cards_update on cards for update
  using (is_active()) with check (is_active());

drop policy if exists card_sources_select on card_sources;
create policy card_sources_select on card_sources for select using (is_active());

-- bundles: active 전원 조회(전면 공개), 본인만 쓰기
drop policy if exists bundles_select on bundles;
create policy bundles_select on bundles for select using (is_active());

drop policy if exists bundles_insert on bundles;
create policy bundles_insert on bundles for insert
  with check (is_active() and author_id = auth.uid());

drop policy if exists bundles_update_own on bundles;
create policy bundles_update_own on bundles for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists bundles_delete_own on bundles;
create policy bundles_delete_own on bundles for delete
  using (author_id = auth.uid() or is_admin());

-- bundle_cards: 소유 묶음 기준
drop policy if exists bundle_cards_select on bundle_cards;
create policy bundle_cards_select on bundle_cards for select using (is_active());

drop policy if exists bundle_cards_write on bundle_cards;
create policy bundle_cards_write on bundle_cards for all
  using (exists (select 1 from bundles b where b.id = bundle_id and b.author_id = auth.uid()))
  with check (exists (select 1 from bundles b where b.id = bundle_id and b.author_id = auth.uid()));

-- 파이프라인 이력: admin만
drop policy if exists ingestion_runs_select on ingestion_runs;
create policy ingestion_runs_select on ingestion_runs for select using (is_admin());

drop policy if exists ai_runs_select on ai_runs;
create policy ai_runs_select on ai_runs for select using (is_admin());

-- -------------------------------------------------------------
-- 9. 편의 함수 — 기업명 정규화
-- -------------------------------------------------------------

create or replace function normalize_company_name(raw text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      regexp_replace(coalesce(raw, ''), '(주식회사|㈜|\(주\)|\(유\)|유한회사)', '', 'g'),
      '\s+', '', 'g'
    )
  );
$$;

-- companies.name_norm 자동 채움
create or replace function companies_set_name_norm()
returns trigger
language plpgsql
as $$
begin
  new.name_norm := normalize_company_name(new.name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists companies_before_write on companies;
create trigger companies_before_write
  before insert or update on companies
  for each row execute function companies_set_name_norm();
