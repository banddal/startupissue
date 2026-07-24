# 스타트업 인텔리전스 아카이브 — PRD

작성일 2026-07-24 · 버전 0.1 (초안)

---

## 1. 제품 정의

### 1.1 한 줄 정의

특정 섹터의 정보를 자동으로 수집·분류해 쌓고, **사용자들이 그 정보들 사이의 관계에 해석을 남겨 지식으로 축적하며, 그 해석이 곧 리포트가 되는** 웹 기반 인텔리전스 도구.

### 1.2 이것이 아닌 것

- 뉴스 애그리게이터가 아니다. 카드(정보)는 시간이 지나면 가치가 떨어진다.
- 검색 서비스가 아니다. 이미 아는 것을 찾는 도구가 아니라, 몰랐던 관계를 발견하는 도구다.
- 데이터 판매 서비스가 아니다. 원데이터는 대부분 공개 소스에서 온다.

### 1.3 핵심 가정

**자산은 카드가 아니라 엣지(연결)와 그 위의 해석이다.** 카드는 누구나 모을 수 있지만, 여러 전문가가 몇 년에 걸쳐 주석을 단 관계망은 복제 불가능하다. 따라서 제품의 모든 설계 판단은 "사용자가 해석을 남기는 마찰을 줄이는가"를 기준으로 한다.

### 1.4 사용자

- **관리자** — 섹터(앵커) 설정, 소스 관리, 가입 승인, 명부 관리
- **큐레이터** — 카드를 읽고 묶고 해석을 남기는 주 사용자. 초기 5~15명 규모
- **열람자** — 읽기 전용. 리포트 수신 대상 (Phase 2)

### 1.5 성공 기준 (초기 3개월)

| 지표 | 목표 |
|---|---|
| 주간 활성 큐레이터 | 5명 이상 |
| 인당 주간 생성 묶음 | 3건 이상 |
| 발행 리포트 | 주 1회 |
| 카드 대비 묶음 비율 | 10% 이상 (수집만 되고 해석이 없으면 실패) |
| 과거 카드(3개월 이상) 포함 묶음 비율 | 20% 이상 |

마지막 두 지표가 핵심이다. 카드 수가 아무리 늘어도 묶음이 생기지 않으면 이 제품은 실패한 것이다.

---

## 2. 개념 모델

### 2.1 4개 층

| 층 | 무엇 | 답하는 질문 | 생성 주체 |
|---|---|---|---|
| 명부 (Roster) | 섹터 내 기업 목록 | 누구인가 | 자동 수집 + 사람 승인 |
| 카드 (Card) | 개별 사건·문서 | 무슨 일이 있었나 | 자동 수집 |
| 묶음 (Bundle) | 카드들의 관계 + 해석 | 무슨 의미인가 | **사람** |
| 리포트 (Report) | 묶음의 편집 결과 | 무엇을 전달할 것인가 | 사람 |

여기에 지표(Indicator) 층이 별도로 존재한다. 카드가 아니라 **해석의 분모** 역할을 한다.

### 2.2 스타트업 정의 문제

"스타트업"은 법적·통계적 개념이 아니므로 직접 판정하지 않는다. 대신 **생태계가 내린 판정을 집계**한다.

- **인증 집계 (강한 신호)** — 정부 지원사업 선정 명단, TIPS 선정, AC/VC 포트폴리오, 데모데이 참가
- **자기선언 (이른 신호)** — 로켓펀치·넥스트유니콘·디스콰이엇 등 등록

명부의 각 기업은 확인 경로를 누적 기록하며, 경로가 많을수록 확신도가 올라간다.

### 2.3 범위 판정

포집 여부는 다음 질문으로 판정한다.

> **이 정보가 해당 섹터 초기기업의 기회 또는 위험을 바꾸는가?**

동심원 구조:

| 환 | 내용 | 수집 정책 |
|---|---|---|
| 0환 | 명부 기업에 매칭된 모든 데이터 | 무조건 |
| 1환 | 자본·제도 (VC, 정부 지원, 규제) | 무조건 |
| 2환 | 기술 기반 (논문, 특허, 오픈소스) | 앵커 키워드 일치 시 |
| 3환 | 산업·시장 (대기업, 거시) | **조건부** — 통과 근거 한 줄 필수 |

**0환은 소스가 아니라 매칭 결과로 정의된다.** 같은 특허라도 명부 기업 출원이면 0환, 대기업 출원이면 3환이다.

### 2.4 깊이 분류 (3문 규칙)

"내용의 주제"가 아니라 "문서 자체가 무엇인가"로 판정한다.

1. 공식 연구 산출물인가? (논문·학위논문·연구보고서·학회 발표) → `research`
2. 시의성이 생명인가? (보도·투자 발표·공고·행사) → `news`
3. 나머지 분석·지식 자료 (기술 블로그·산업 리포트·특허·백서) → `tech`

특례: 언론이 논문을 소개한 기사는 `news`이며, 원 논문은 별도 카드로 생성해 연결한다.

**깊이·범위 축은 UI에 전면 노출하지 않는다.** 파이프라인 내부 분류로 사용하고, 화면에는 주제 탭(기술·산업 / 정책·법률 / 스타트업·투자)으로 제공한다.

---

## 3. 데이터 파이프라인

### 3.1 처리 단계

```
L0 원천 수집    일 수백 건    비노출, 검증용 원장 보관
   ↓ 명부 대조 · 앵커 필터 · 판정 질문 · 소스등급 중복 병합
L1 후보 풀      일 수십 건    비노출
   ↓ AI 카드화 (3문 깊이 분류 · 요약 · 분류 근거)
L2 카드 피드    일 10~20건   화면 노출
   ↓ 사람의 묶기 (AI 초안 보조)
L3 묶음         주 수 건      화면 노출
   ↓ 편집 · 순서 조정
L4 리포트       주 1회        발행
```

원칙: **저장은 피라미드(아래가 두껍다), 열람은 역피라미드(위만 보인다).** 모든 카드는 "근거 보기"로 L0 원데이터까지 역추적 가능해야 한다.

### 3.2 소스 등급

| 등급 | 성격 | 예 |
|---|---|---|
| 1급 | 사실·공시 데이터 | DART, VCS, 정부 공고 API, 선정 명단 |
| 2급 | 1차 발표·연구 | 논문, 특허, 기업 블로그, 연구기관 리포트 |
| 3급 | 보도·해석 | 언론 기사 |

동일 사건이 복수 등급으로 수집되면 **높은 등급을 원본으로 삼고 낮은 등급은 부속 출처로 병합**한다.

### 3.3 착수 소스 (Phase 1 — 4개만)

| 소스 | 용도 | 접근 | 주기 |
|---|---|---|---|
| K-Startup 공고 API (`data.go.kr/data/15125364`) | 1환 뉴스 + 명부(선정 명단) | 무료 키 | 일 1회 |
| arXiv API | 2환 연구 | 무료, 키 불필요 | 일 1회 |
| KIPRIS Plus 특허 API | 2환 기술 + 0환 매칭 | 무료 (월 1,000회 제한) | 주 1회 |
| 스타트업 전문지 RSS 2~3개 | 0·3환 뉴스 | RSS | 일 2회 |

### 3.4 확장 소스 (Phase 2 이후)

- **1환**: 기업마당 API, 열린재정, 국가법령정보 API, IRIS·SMTECH 과제
- **2환**: OpenAlex, Papers with Code, Hugging Face, GitHub API, Lens.org
- **0환 실체**: DART OpenAPI, VCS/DIVA 벤처투자 공시
- **명부**: AC/VC 포트폴리오 페이지, 컴업 참가 명단, 로켓펀치 등
- **글로벌**: TechCrunch, Sifted, SEC EDGAR Form D

크롤링이 필요한 소스는 각각 robots.txt 및 이용약관을 개별 검토한 뒤 착수한다.

### 3.5 지표 소스

| 지표군 | 소스 | 갱신 |
|---|---|---|
| 생태계 (기업 수·투자 총액·논문·특허) | 자체 집계 + VCS 발표치 | 분기/월 |
| 시장 (KOSPI·NASDAQ·환율·금리) | 한국은행 ECOS API 등 — **구축 시 확인 필요** | 일 |
| 거시 (GDP·물가·인구·기업생멸) | KOSIS 오픈API (`kosis.kr/openapi`) | 발표 시 |

지표는 발행 시점 값을 **스냅샷으로 고정**해 리포트에 저장한다. 이후 지표가 개정되어도 리포트 내 수치는 변하지 않는다.

---

## 4. 기능 명세

### 4.1 계정과 접근 제어

**가입 흐름 (신청 후 관리자 승인)**

1. 이메일·이름·소속·가입 사유를 입력해 신청
2. 상태 `pending`으로 저장, 관리자에게 알림
3. 관리자가 승인/거절 → `active` / `rejected`
4. 승인 시 이메일 발송, 로그인 가능

**역할**

| 역할 | 권한 |
|---|---|
| `admin` | 전체 + 가입 승인, 앵커·소스·명부 관리 |
| `curator` | 카드 열람, 묶음 생성·수정(본인), 리포트 작성, 타인 묶음에 답글 |
| `viewer` | 카드·묶음·리포트 열람만 |

**프로필 필드** — 이름, 소속, 전문 분야 태그, 한 줄 소개, 아바타. 묶음에 표시되므로 "누가 한 해석인가"의 근거가 된다.

### 4.2 공유 모델 — 전면 공개

모든 사용자는 **동일한 카드 피드**를 본다. 차이는 그 위에 쌓인 해석이다.

- 모든 묶음은 작성자가 표시된 채 전원에게 공개된다.
- 개인 메모(카드 1장 묶음)도 공개된다. 비공개 옵션은 두지 않는다.
- 타인의 묶음에 **답글**을 달 수 있다. 답글은 원 묶음을 수정하지 않고 층으로 쌓인다.
- 타인의 묶음을 **참조**해 새 묶음을 만들 수 있다 (인용 관계 기록).

**활동 가시성 (`활동` 탭)**

- 최근 생성된 묶음 타임라인 (누가·언제·무엇을)
- 사용자별 프로필 페이지: 이 사람이 만든 묶음, 자주 다루는 태그, 참여한 리포트
- 카드 단위 표시: "이 카드는 3명이 묶었습니다" — 같은 카드에 대한 서로 다른 해석을 비교할 수 있게 한다

> 설계 의도: 같은 정보를 보고 해석이 갈리는 지점이 이 도구에서 가장 가치 있는 순간이다. 합의를 강제하지 않고 병렬 해석을 그대로 보존한다.

### 4.3 상황판

**기본 노출** — 생태계 지표 4종만 (섹터 내 기업 수, 벤처투자 총액, 신규 논문, 신규 특허). 각 카드에 현재값과 전기 대비 변화량 표시.

**접힘 영역** — 시장 지표, 거시 지표는 접힌 상태. 클릭 시 전개.

**그래프 패널**

- 지표 카드 클릭 → 하단에 추이 그래프 전개
- 최대 3개 지표 겹쳐보기 (단위가 다르므로 정규화해 상대 추이 비교)
- 변곡점(방향 전환 지점) 자동 표시
- 그래프 호버 → 해당 구간의 지표 값 + 연결된 카드 목록 툴팁
- 구간 클릭 → 고정, 아래 탭에서 해당 시점 카드 강조 및 탭별 건수 배지
- 구간에 직접 코멘트 가능 (→ 지표 구간을 근거로 하는 묶음 생성)

**표시 지표 편집** — 사용자별로 상황판에 띄울 지표 선택 저장.

### 4.4 카드 피드

**주제 탭** — 기술·산업 / 정책·법률 / 스타트업·투자. 탭 추가 가능 (관리자).

**카드 구성**

- 제목, 요약(2~3문장, 원문 복사 금지 — 자체 요약), 날짜, 주제, 출처 링크
- 명부 매칭 시 기업명 배지
- 3환 카드는 통과 근거 한 줄 노출
- 관련 지표 색점 표시
- "이 카드를 묶은 사람 N명" 표시
- `근거` 버튼 → L1·L0 원데이터 추적 화면

**선택과 묶기** — 카드 클릭으로 다중 선택 → 하단 고정 바에 선택 건수와 예상 형태 표시 → `묶기` 버튼.

### 4.5 묶기 (핵심 기능)

**형태는 선택 개수가 결정한다.** 사용자는 종류를 고르지 않는다.

| 선택 | 형태 | 의미 |
|---|---|---|
| 1장 | 메모 | 한 카드에 대한 관찰 |
| 2장 | 관계 | 인과·선후·반증 |
| 3장 이상 | 흐름 | 하나의 이야기 |

**작성 패널 구성**

1. 선택된 카드 목록 (날짜순, 개별 제거 가능)
2. **과거 카드 불러오기** — 접힌 상태에서 클릭 시 전개
   - 전체 기간 검색창
   - **AI 제안**: 선택 카드들의 태그·엔티티·임베딩 유사도를 기준으로 3개월 이상 지난 관련 카드를 제안
   - 각 카드에 경과 시간 표시 ("1.2년 전")
3. 제목 (리포트 소제목이 됨)
4. 본문 한 문단 (리포트 본문이 됨)
   - 비어 있을 때 `AI 초안` 버튼 노출. 카드들의 시간 순서와 성격을 읽어 초안 생성
   - 초안을 수정하면 작성자가 사용자로 기록됨
5. 확신도 — 확신 / 추정 / 질문
6. `리포트에 넣기` 토글

> "질문"으로 남긴 묶음은 이후 답이 나오면 확신으로 승격할 수 있다. 승격 이력은 보존한다.

### 4.6 묶음 탭

- 전체 묶음 목록 (필터: 작성자, 확신도, 리포트 포함 여부, 기간, 태그)
- 각 묶음: 제목, 본문, 작성자, 확신도, 근거 카드 펼치기, 답글
- `의견 요청` — 특정 사용자를 지정해 답글 요청 알림 발송
- 타인 묶음 참조하여 새 묶음 생성

### 4.7 리포트

**조립 방식** — 별도 글쓰기 단계 없음. `리포트 포함`으로 표시된 묶음이 자동으로 섹션이 된다.

**구성**

1. 헤더 — 제목, 기간, 발행자
2. **지표 스냅샷 블록** — 생태계 지표 4종의 해당 시점 값과 변화량. 시장·거시 지표는 선택 포함
3. 도입 문단 — 직접 작성
4. 본문 섹션 = 묶음들
   - 소제목(묶음 제목), 본문(묶음 코멘트), 작성자
   - 답글이 있으면 인용 형태로 포함
   - **묶음별 관련 지표 한 줄 또는 미니 그래프** — 근거 카드의 시점 구간에 해당하는 지표를 자동 첨부, 사용자가 변경 가능
   - 근거 카드 수와 확신도 표기
5. 마무리 문단 — 직접 작성

**편집** — 섹션 순서 변경, 섹션 제외, 도입·마무리 작성.

**발행** — 발행 시 지표값과 카드 상태를 스냅샷으로 고정. 발행본은 이후 수정 불가(새 버전 생성). 공유 링크 또는 PDF 내보내기.

### 4.8 명부 관리

- 기업 목록 (확정 / 후보)
- 각 기업: 이름, 별칭(매칭용), 사업자번호(선택), 설립일, 확인 경로 이력, 태그
- **기업 상세** — 매칭된 카드의 시간순 타임라인
- **신규 후보 큐** — 매칭되지 않았으나 판정 질문을 반복 통과한 엔티티를 후보로 제시, 관리자 승인 시 편입

### 4.9 AI 기능 범위

| 기능 | 역할 | 사람의 개입 |
|---|---|---|
| 깊이 분류 | 3문 규칙 적용, 근거 한 줄 생성 | 깊이 이동으로 수정 |
| 요약 | 원문 기반 자체 요약 | 편집 가능 |
| 엔티티 매칭 | 명부와 대조 | 확신도 낮으면 큐로 |
| 과거 카드 제안 | 임베딩 유사도 기반 회수 | 채택 여부 선택 |
| 묶음 초안 | 카드 묶음에서 해석 초안 생성 | **반드시 사람이 수정** |

**원칙: AI는 제안하고 사람이 확정한다.** AI가 생성한 묶음은 자동 저장되지 않는다.

---

## 5. 데이터 모델 (Supabase / PostgreSQL)

### 5.1 테이블

```sql
-- 사용자
profiles (
  id uuid primary key references auth.users,
  email text not null,
  name text not null,
  org text,
  expertise_tags text[],
  bio text,
  avatar_url text,
  role text not null default 'curator',      -- admin | curator | viewer
  status text not null default 'pending',    -- pending | active | rejected | suspended
  applied_reason text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  created_at timestamptz default now()
)

-- 섹터 (앵커) — 다중 섹터 확장 대비
sectors (
  id uuid primary key,
  name text not null,
  include_keywords text[],
  exclude_keywords text[],
  tabs jsonb,                                 -- 주제 탭 구성
  created_at timestamptz default now()
)

-- 명부
companies (
  id uuid primary key,
  sector_id uuid references sectors(id),
  name text not null,
  aliases text[],
  biz_no text,
  founded_on date,
  status text not null default 'candidate',   -- candidate | confirmed | archived
  confidence int default 0,                   -- 확인 경로 수
  tags text[],
  created_at timestamptz default now()
)

company_verifications (                        -- 확인 경로 이력
  id uuid primary key,
  company_id uuid references companies(id) on delete cascade,
  source text not null,                        -- tips | gov_selection | ac_portfolio | self_declared
  evidence_url text,
  verified_at timestamptz default now()
)

-- 원천 데이터 (L0)
raw_items (
  id uuid primary key,
  source_key text not null,
  source_grade int not null,                   -- 1 | 2 | 3
  external_id text,
  url text,
  title text,
  raw_content text,
  published_at timestamptz,
  fetched_at timestamptz default now(),
  unique (source_key, external_id)
)

-- 카드 (L2)
cards (
  id uuid primary key,
  sector_id uuid references sectors(id),
  title text not null,
  summary text,
  published_on date not null,
  period text,                                 -- 25Q3 형태, 지표 연동용
  topic text not null,                         -- tech_industry | policy_law | startup_invest
  depth text not null,                         -- news | tech | research
  ring int not null,                           -- 0 | 1 | 2 | 3
  ring_reason text,                            -- 3환일 때 필수
  depth_reason text,
  company_id uuid references companies(id),    -- 0환 매칭 결과
  tags text[],
  embedding vector(1536),                      -- pgvector, 과거 카드 회수용
  primary_raw_id uuid references raw_items(id),
  created_at timestamptz default now()
)

card_sources (                                  -- 병합된 부속 출처
  card_id uuid references cards(id) on delete cascade,
  raw_id uuid references raw_items(id),
  primary key (card_id, raw_id)
)

-- 묶음 (L3)
bundles (
  id uuid primary key,
  sector_id uuid references sectors(id),
  author_id uuid not null references profiles(id),
  title text not null,
  body text,
  confidence text not null default 'estimate', -- certain | estimate | question
  in_report boolean default true,
  ai_drafted boolean default false,
  indicator_ids text[],                        -- 리포트에 첨부할 지표
  period_from text,
  period_to text,
  parent_bundle_id uuid references bundles(id),-- 타인 묶음 참조
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

bundle_cards (
  bundle_id uuid references bundles(id) on delete cascade,
  card_id uuid references cards(id),
  position int,
  primary key (bundle_id, card_id)
)

bundle_replies (                                -- 전문가 의견
  id uuid primary key,
  bundle_id uuid references bundles(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz default now()
)

-- 리포트 (L4)
reports (
  id uuid primary key,
  sector_id uuid references sectors(id),
  author_id uuid not null references profiles(id),
  title text not null,
  period_label text,
  intro text,
  outro text,
  indicator_snapshot jsonb,                    -- 발행 시점 지표 고정
  status text not null default 'draft',        -- draft | published
  published_at timestamptz,
  created_at timestamptz default now()
)

report_sections (
  report_id uuid references reports(id) on delete cascade,
  bundle_id uuid references bundles(id),
  position int not null,
  primary key (report_id, bundle_id)
)

-- 지표
indicators (
  id text primary key,                          -- vcAmount, kospi, gdp ...
  label text not null,
  group_key text not null,                      -- eco | market | macro
  unit text,
  source_key text,
  color text
)

indicator_values (
  indicator_id text references indicators(id),
  period text not null,
  value numeric not null,
  observed_at timestamptz default now(),
  primary key (indicator_id, period)
)

-- 활동 로그
activity_log (
  id bigserial primary key,
  actor_id uuid references profiles(id),
  action text not null,                         -- bundle_created | reply_added | report_published
  target_type text,
  target_id uuid,
  created_at timestamptz default now()
)
```

### 5.2 RLS 정책 요약

| 테이블 | 읽기 | 쓰기 |
|---|---|---|
| `cards`, `companies`, `indicators` | `status='active'` 전원 | 서비스 롤(파이프라인)만 |
| `bundles` | `status='active'` 전원 (전면 공개) | 본인 생성/수정, admin 삭제 |
| `bundle_replies` | 전원 | 본인 생성/수정 |
| `reports` | 전원 (published), draft는 작성자+admin | 작성자 |
| `profiles` | 전원 (공개 필드) | 본인, status/role은 admin만 |
| `raw_items` | admin만 | 서비스 롤 |

`pending` 상태 사용자는 어떤 데이터에도 접근할 수 없다.

---

## 6. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프론트엔드 | Next.js (App Router) + TypeScript | 웹 기반, SSR로 리포트 공유 링크 대응 |
| 스타일 | Tailwind CSS | |
| 백엔드/DB | Supabase (PostgreSQL + Auth + Storage) | RLS로 권한 제어 |
| 벡터 검색 | pgvector | 과거 카드 회수, 중복 병합 |
| 수집 워커 | Supabase Edge Functions + pg_cron, 또는 별도 Node 워커 | 소스별 스케줄 |
| AI | Anthropic API (Claude) | 분류·요약·초안·연결 제안 |
| 임베딩 | 임베딩 API (구축 시 선정) | |
| 배포 | Vercel (프론트) + Supabase (백엔드) | |

---

## 7. 개발 단계

### Phase 1 — 최소 동작 (4~6주)

목표: **한 사람이 매일 쓰면서 묶음이 쌓이는 상태**

- 가입·승인·로그인, 프로필
- 소스 4개 수집 워커 + 3문 규칙 분류 + 요약
- 카드 피드 (주제 3탭)
- 명부 (수동 등록 + K-Startup 선정 명단 자동 편입)
- 카드 선택 → 묶기 (과거 카드 검색 포함)
- 묶음 목록
- 상황판 생태계 지표 4종 (그래프 없이 숫자만)

제외: 지표 그래프, AI 초안, 리포트, 답글, 활동 탭

### Phase 2 — 협업과 리포트 (4~6주)

- 전면 공개 공유 모델, 답글, 활동 탭, 사용자 프로필 페이지
- AI 초안, AI 과거 카드 제안 (임베딩)
- 리포트 조립·발행, 지표 스냅샷
- 상황판 그래프 (겹쳐보기, 변곡점, 호버 연동)
- 소스 확장 (1환·2환 API 추가)

### Phase 3 — 심화 (이후)

- 근거 추적 화면 (L0 역추적)
- 시그널 자동 탐지 ("지금 핫한 것" 탭)
- 명부 자동 후보 큐
- 다중 섹터 지원 (사업화 대비)
- 리포트 정기 발송, 열람자 역할

---

## 8. 열린 질문

구축 착수 전 확인이 필요한 항목.

1. **시장 지표 소스** — 주가지수·환율의 무료 API 확보 방안. 한국은행 ECOS 커버리지 확인 필요
2. **크롤링 소스 약관** — AC/VC 포트폴리오, 전문지 RSS, 채용 플랫폼의 robots.txt 및 이용약관 개별 검토
3. **KIPRIS 쿼터** — 월 1,000회 제한 내 운영 설계 또는 유료 전환 검토
4. **임베딩 비용** — 카드 누적 시 임베딩 생성·저장 비용 추정
5. **명부 매칭 정확도** — 회사명 표기 흔들림(㈜, 영문명, 구 사명) 처리 기준
6. **다중 섹터 시점** — 사업화 시 테넌트 분리 방식 (스키마 분리 vs `sector_id` 필터)

---

## 9. 설계 원칙 요약

구현 중 판단이 필요할 때 참조할 기준.

1. **묶는 마찰을 줄이는 쪽을 택한다.** 카드가 아무리 잘 쌓여도 묶음이 없으면 실패다.
2. **AI는 제안하고 사람이 확정한다.** AI 생성물은 자동 저장하지 않는다.
3. **분류 체계를 UI에 노출하지 않는다.** 깊이·환은 내부 개념이다.
4. **원데이터는 두껍게 쌓되 숨긴다.** 평소엔 안 보이고, 의심할 때 바닥까지 내려간다.
5. **해석은 병렬로 보존한다.** 합의를 강제하지 않는다.
6. **발행된 것은 고정한다.** 지표 개정이 과거 리포트를 바꾸지 않는다.
