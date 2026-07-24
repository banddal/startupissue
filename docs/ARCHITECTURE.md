# Startup Issues — 전체 설계

> 이 문서는 프로젝트의 현재 설계와 그 선택 이유를 담습니다.
> 다른 AI 도구(ChatGPT 등)나 협업자에게 컨텍스트를 넘길 때 이 파일 하나만 전달하면 됩니다.

**최종 갱신**: 2026-07-24
**상태**: Round 1 재작성 진행 예정 (스택 변경 확정)

---

## 1. 프로젝트 개요

### 무엇을 만드는가

스타트업 관련 뉴스와 정부 지원사업 공고를 매일 자동으로 수집해서, 승인된 소수 인원이 함께 보고 중요한 것을 체크·분류해두는 내부용 웹 플랫폼.

### 핵심 흐름

```
워커(1일 1회) → 뉴스/공고 수집 → 카드 생성 → DB 저장
                                      ↓
                              원문 아카이빙 → R2 저장
                                      ↓
사용자 → Google 로그인 → 관리자 승인 → 오늘 화면에서 카드 확인
                                      ↓
                              체크 / 묶음(collection)으로 분류
```

### 규모 전제

- 사용자: 2~3명 (내부 인원, 초대·승인제)
- 카드: 하루 30~50건
- 공개 서비스 아님. 승인된 계정만 접근.

이 전제가 설계 전반의 판단 기준입니다. 트래픽·확장성보다 **재작업 최소화와 무료 운영**이 우선입니다.

---

## 2. 기술 스택

| 레이어 | 선택 | 무료 한도 |
|---|---|---|
| 프레임워크 | Next.js (App Router) | — |
| 데이터베이스 | **Neon** (서버리스 Postgres) | 0.5GB, 만료 없음 |
| ORM | **Drizzle** | — |
| 인증 | **NextAuth (Auth.js)** + Google OAuth | — |
| 오브젝트 스토리지 | **Cloudflare R2** | 10GB, 이그레스 무료 |
| 워커 실행 | Render (Round 5에서 확정) | — |
| 스타일 | Tailwind CSS | — |

### 이전 스택과의 차이

| | 이전 (Round 1) | 현재 |
|---|---|---|
| DB | Supabase Postgres | Neon Postgres |
| 인증 | Supabase Auth | NextAuth |
| 권한 검사 | RLS (DB 레벨) | 미들웨어 + 가드 (앱 레벨) |
| 파일 저장 | 없음 | R2 |

---

## 3. 왜 이 선택을 했는가

이 절이 이 문서의 핵심입니다. 결정의 이유를 남겨두지 않으면 나중에 같은 논의를 반복하게 됩니다.

### 3.1 왜 Supabase를 떠났는가

**용량 문제가 아닙니다.** Supabase 무료 티어는 DB 500MB인데, 카드 하나가 2KB라면 25만 건이 들어갑니다. 하루 50건 기준 13년치입니다. 이 프로젝트는 무료 한도에 닿기 어렵습니다.

**실제 이유는 무료 조직당 활성 프로젝트 2개 제한입니다.** 계정에서 이미 다른 두 프로젝트가 슬롯을 쓰고 있어서, 이 프로젝트를 만들 자리가 없습니다.

이 문제의 가장 단순한 해법은 새 조직을 만드는 것이었습니다(조직당 2개가 별도로 허용됨). 코드 변경이 전혀 없습니다. 하지만 **Supabase를 쓰지 않기로 결정**했으므로, 아래는 그 전제 위에서의 설계입니다.

### 3.2 왜 Firebase가 아니라 Neon인가

Firebase도 후보였습니다. 인증·DB·스토리지가 한 덩어리로 묶여 있어 편리합니다. 그럼에도 Neon을 선택한 이유:

**첫째, 기존 마이그레이션이 살아남습니다.** `supabase/migrations/0001_init.sql`은 순수 PostgreSQL입니다. Neon은 같은 Postgres이므로 RLS 정책 블록만 걷어내면 테이블·인덱스·제약이 그대로 돕니다. Firebase로 가면 이 파일을 통째로 버리고 Firestore 문서형으로 재설계해야 합니다.

**둘째, 관계형 구조가 이 도메인에 맞습니다.** 묶음(collection)과 카드는 다대다 관계입니다. Postgres에서는 조인 테이블 하나로 끝나지만, Firestore에서는 비정규화하거나 하위 컬렉션으로 우회해야 하고 일관성 관리가 애플리케이션 책임이 됩니다.

**셋째, Firebase Storage는 무료가 아닙니다.** Spark(무료) 요금제에서 Storage를 쓸 수 없고 Blaze(종량제)로 전환해야 합니다. 카드 등록이 필수입니다. 소규모라 실제 청구액은 0원에 가깝겠지만, 무료 운영이라는 전제가 깨집니다.

**넷째, Firestore 읽기 한도가 권한 검사와 충돌합니다.** 무료 한도는 읽기 5만 회/일입니다. Security Rules에서 `profiles.status == 'active'`를 검사하려면 매 요청마다 `get()`으로 프로필을 조회해야 하고, 이 조회도 읽기 횟수에 산입됩니다.

### 3.3 왜 스토리지가 필요한가 — 그리고 왜 R2인가

**필요한 이유는 링크 소멸(link rot)입니다.** 뉴스 기사는 유료화 전환이나 사이트 개편으로 사라지고, 정부 공고는 접수 마감 후 내려갑니다. 원문 URL만 저장하면 시간이 지날수록 죽은 링크가 쌓입니다. 아카이브 자체가 이 프로젝트의 가치이므로, 원문을 직접 보관해야 합니다.

**R2를 선택한 이유:**

- 무료 10GB (Firebase Storage 5GB, Supabase Storage 1GB)
- **이그레스 요금 0원** — 워커가 반복 접근해도 비용이 붙지 않음
- 카드 등록 불필요
- S3 호환 API — `@aws-sdk/client-s3`를 그대로 쓰고, 나중에 옮길 때 엔드포인트만 교체

**중요한 점: 스토리지는 DB 선택과 무관합니다.** "파일 저장이 필요하니 Firebase여야 한다"는 전제는 성립하지 않습니다. R2는 어떤 DB와도 독립적으로 붙습니다.

### 3.4 용량은 문제가 되지 않는다

| 자산 | 건당 크기 | 연간 (하루 50건) |
|---|---|---|
| 기사 본문 HTML | 50~150KB | — |
| 본문 gzip 압축 후 | 10~30KB | 200~500MB |
| 공고 PDF 첨부 | 1~5MB | 선별 저장 |

본문은 gzip으로 20년 이상 버팁니다. **압축을 풀어 쓰는 별도 프로세스는 필요 없습니다** — 저장 시 gzip하고 응답에 `Content-Encoding: gzip` 헤더를 붙이면 브라우저가 자동으로 해제합니다.

PDF는 이미 압축된 형식이라 gzip이 듣지 않습니다. 여기만 정책이 필요합니다:

- 본문 HTML/텍스트: 무조건 저장
- PDF: 사용자가 체크한 카드만, 또는 크기 상한(예: 10MB) 이하만
- 90일 경과한 미체크 카드의 PDF: R2 lifecycle rule로 자동 삭제

### 3.5 무엇을 잃는가 — RLS

**이것이 이번 변경의 유일한 실질적 손실입니다.** 정직하게 기록합니다.

Supabase에서는 Row Level Security가 DB 레벨의 최종 방어선이었습니다. 애플리케이션에 버그가 있어도 `pending` 상태 사용자는 카드를 읽을 수 없었습니다. Neon에는 이 층이 없으므로 권한 검사가 애플리케이션 책임이 됩니다.

**완화책 세 가지:**

1. **`src/lib/guards.ts` 단일 지점** — 모든 데이터 조회가 이 파일의 함수를 거치게 강제. 권한 로직이 한 곳에만 존재.
2. **미들웨어 라우트 차단** — `status !== 'active'`인 세션은 `/today`, `/collections` 등에 진입 자체를 막음.
3. **CI 검사** — 가드를 우회한 직접 DB 쿼리를 검출. 기존 `scripts/check-service-role.mjs`와 같은 방식으로 `scripts/check-guards.mjs` 추가.

**잔여 위험 평가:** 사용자 2~3명, 웹이 서버 컴포넌트로만 DB에 접근(브라우저에 DB 자격증명이 노출되지 않음), 공개 서비스 아님. 이 조건에서 실질 위험은 낮습니다. 다만 검사를 빠뜨리면 데이터가 샐 수 있다는 것은 사실이며, 이를 인지한 상태에서의 트레이드오프입니다.

### 3.6 커버리지 — Supabase 기능을 얼마나 대체하는가

| Supabase 기능 | 대체 | 상태 |
|---|---|---|
| Postgres DB | Neon | 동등 (같은 Postgres) |
| Auth (Google OAuth) | NextAuth | 동등 |
| Storage | R2 | 우위 (10GB, 이그레스 무료) |
| RLS | 가드 + 미들웨어 | 앱 레벨로 이전 (위 3.5 참조) |
| 자동 REST API (PostgREST) | 서버 액션 / Route Handler | 직접 작성 |
| Realtime 구독 | 없음 | **미사용 기능** |
| Edge Functions | Render 워커 | **원래 계획대로** |
| 대시보드 SQL Editor | Neon Console | 동등 |

**실제 사용 중인 기능 기준 커버리지 100%.** Round 1에서 쓰던 것은 DB, Google 인증, RLS 셋뿐입니다. Realtime과 Edge Functions는 애초에 사용 계획이 없었습니다.

### 3.7 저작권 관련 유의사항

기사 원문 저장은 저작권 이슈를 동반합니다. 현재는 승인된 소수 인원만 접근하는 폐쇄형 내부 참고용이므로 실무상 문제가 되기 어렵습니다. 다만 **외부 공개나 재배포로 전환한다면 이 부분을 다시 검토해야 합니다.** 그 경우 본문 전문 대신 요약과 링크만 노출하는 방식이 안전합니다.

---

## 4. 데이터 모델

기존 `0001_init.sql`의 테이블을 유지하고, RLS 정책을 제거하며, 아카이빙 관련 필드·테이블을 추가합니다.

### profiles
사용자. Google 로그인 시 자동 생성.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| email | text unique | |
| name | text | |
| role | text | `admin` \| `member` |
| status | text | `pending` \| `active` \| `rejected` \| `suspended` |
| created_at | timestamptz | |

신규 가입은 `pending`. 관리자가 승인해야 `active`가 되고 그때부터 카드를 볼 수 있습니다.

### cards
수집된 뉴스·공고 한 건.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| title | text | |
| summary | text | |
| url | text | 원문 링크 |
| source_key | text | 출처 식별자 |
| published_on | date | |
| score | int | 정렬용 점수 |
| hidden | boolean | 숨김 처리 |
| **archive_status** | text | `pending` \| `archived` \| `failed` \| `skipped` |
| **archived_at** | timestamptz | |
| created_at | timestamptz | |

`archive_status` 이하 3개가 이번에 추가되는 필드입니다.

### card_assets *(신규)*
카드에 딸린 파일. 본문 스냅샷과 첨부를 함께 담습니다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| card_id | uuid FK → cards | |
| kind | text | `snapshot` \| `attachment` \| `thumbnail` |
| r2_key | text | R2 오브젝트 경로 |
| content_type | text | |
| byte_size | bigint | |
| is_compressed | boolean | gzip 여부 |
| created_at | timestamptz | |

카드 하나에 첨부가 여럿일 수 있어 별도 테이블로 둡니다. R2 키 규칙은 `cards/{card_id}/{kind}/{filename}`.

### collections / collection_items
사용자가 카드를 묶어두는 단위. 다대다 관계이므로 조인 테이블을 씁니다.

### fetch_logs
워커 실행 이력. 수집 성공·실패와 건수를 기록합니다.

---

## 5. 디렉터리 구조

```
src/
  app/                 화면 (App Router)
    api/auth/[...nextauth]/route.ts   NextAuth 핸들러
  components/          클라이언트 컴포넌트
  lib/
    db.ts              Drizzle + Neon 연결
    schema.ts          Drizzle 스키마 정의
    auth.ts            NextAuth 설정
    guards.ts          권한 검사 단일 지점 ★
    r2.ts              R2 업로드/조회 유틸 ★
migrations/            Drizzle 마이그레이션
worker/                수집 워커 (Round 2부터)
scripts/
  check-guards.mjs     가드 우회 검출 ★
  check-secrets.mjs    서버 전용 키 노출 검출
docs/
  ARCHITECTURE.md      이 문서
  PROGRESS.md          라운드별 진행 기록
  decisions/           개별 결정 문서
```

★ = 이번에 신규 추가

### 삭제되는 것

- `src/lib/supabase-server.ts`, `supabase-browser.ts`
- `src/app/auth/callback/route.ts` — NextAuth가 자동 처리
- `supabase/` 디렉터리 전체

### 유지되는 것

모든 UI 컴포넌트, Tailwind 설정, 페이지 구조, 미들웨어의 역할. 로그인 버튼은 `signIn("google")` 한 줄로 단순해집니다.

---

## 6. 보안 원칙

1. **브라우저에 DB 자격증명이 가지 않는다.** 모든 DB 접근은 서버 컴포넌트·서버 액션·Route Handler에서만.
2. **R2 키는 서버 전용이다.** 워커와 서버 코드에서만 사용. 클라이언트 번들에 포함되면 CI가 실패.
3. **모든 데이터 조회는 `guards.ts`를 거친다.** 직접 쿼리는 CI에서 검출.
4. **미들웨어가 라우트 단위로 1차 차단한다.** 가드는 2차 방어선.

---

## 7. 진행 계획

| 라운드 | 내용 | 상태 |
|---|---|---|
| Round 1 | 인증 + 승인 구조 + 빈 오늘 화면 | 재작성 예정 |
| Round 2 | 뉴스 수집 워커 | |
| Round 3 | 공고 수집 + 아카이빙 파이프라인 | |
| Round 4 | 묶음(collection) 기능 | |
| Round 5 | 워커 배포 (Render) + 스케줄링 | |

Round 1 재작성 범위: Supabase 클라이언트 → Drizzle + NextAuth 교체, RLS → 가드 이전, `card_assets` 테이블과 R2 유틸 추가.

---

## 8. 환경변수

```
# Neon
DATABASE_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudflare R2 (서버 전용)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
```

`NEXT_PUBLIC_` 접두사가 붙은 변수는 브라우저에 노출됩니다. 위 항목 중 어느 것도 이 접두사를 쓰지 않습니다.

---

## 9. 외부 서비스 준비 절차

**Neon**
1. neon.tech 가입 → 프로젝트 생성 (리전: ap-southeast 또는 근접)
2. Connection string 복사 → `DATABASE_URL`

**Google OAuth**
1. Google Cloud Console → OAuth 클라이언트 생성
2. 승인된 리디렉션 URI: `http://localhost:3000/api/auth/callback/google` (개발), 배포 도메인용도 추가
3. Client ID / Secret 복사

**Cloudflare R2**
1. Cloudflare 가입 (카드 등록 불필요)
2. R2 → Create bucket (리전: APAC)
3. Manage R2 API Tokens → 토큰 발급
4. 90일 PDF 삭제용 lifecycle rule은 Round 3에서 설정

---

## 10. 열린 질문

- 워커 실행 주기와 시간대 (Round 5)
- 카드 점수(`score`) 산정 로직 (Round 2)
- 아카이빙 실패 시 재시도 정책 (Round 3)
- PDF 저장 기준 — 체크된 카드만인지, 크기 상한인지 (Round 3)
