# ARCHITECTURE.md 기술 검토

검토일: 2026-07-24  
대상: Claude 수정본 `ARCHITECTURE.md`  
결론: **Neon + Drizzle + Auth.js + R2 전환은 수용 가능. 아래 P0 수정 후 구현 착수 권장.**

---

## 1. 총평

사용자 2~3명, 하루 30~50카드, 내부 승인제라는 전제에 맞춰 무료 운영과 단순성을 우선한 방향은 합리적이다. Supabase 슬롯 제약 때문에 Neon으로 옮기는 것도 제품 코드와 데이터 모델을 크게 훼손하지 않는 선택이다.

다만 현재 문서는 다음 세 가지를 과소평가한다.

1. Auth.js 사용자와 승인 상태를 어떤 세션 전략으로 연결할지
2. RLS를 제거한 뒤 앱 레벨 권한을 실제로 강제하는 방법
3. 보관한 외부 HTML을 다시 제공할 때의 XSS·저작권 경계

이 세 가지를 먼저 확정하지 않으면 Round 1을 재작성한 뒤 다시 바꿀 가능성이 높다.

---

## 2. 수용할 결정

### 기술 스택

- Next.js App Router
- Neon PostgreSQL
- Drizzle ORM
- Auth.js + Google OAuth
- Cloudflare R2
- 별도 Node CLI 워커
- Tailwind CSS

### 구조

- Web과 장시간 수집 워커 분리
- DB를 기준 데이터 저장소로 유지
- R2를 DB와 독립된 오브젝트 스토리지로 사용
- 원천 수집과 카드 생성 이력을 분리
- 실제 데이터 한 건이 화면에 보이는 수직 절편부터 구현

### 범위

- 내부 사용자 2~3명
- Google 로그인 + 관리자 승인
- Round 1: 로그인 후 빈 오늘 화면
- Round 2: RSS 하나의 수집 수직 절편
- 복잡한 벡터 검색·리포트·다중 섹터 제외

---

## 3. P0 — 구현 전에 반드시 수정

### P0-1. Auth.js 세션과 승인 상태 모델을 확정한다

#### 문제

현재 문서는 NextAuth를 사용한다고만 되어 있고 다음이 없다.

- Auth.js adapter 사용 여부
- JWT 세션 또는 database session
- Google 로그인 때 사용자 행 생성 방법
- `pending → active` 변경을 세션에 즉시 반영하는 방법
- 관리자 계정 최초 생성 방법

#### 권고

Auth.js Drizzle Adapter와 database session을 사용한다.

```text
auth_users
accounts
sessions
verification_tokens
```

`auth_users`에 제품 필드를 추가한다.

```text
role: admin | member
status: pending | active | rejected | suspended
approved_by
approved_at
```

별도 `profiles`가 필요하면 공개 프로필 정보만 둔다. 사용자 승인 상태를 `profiles`와 Auth.js user 양쪽에 중복 저장하지 않는다.

각 보호된 요청은 세션 존재만 확인하지 않고 DB의 현재 `status`를 확인한다. 관리자가 사용자를 정지하면 기존 세션에서도 다음 요청부터 차단되어야 한다.

#### 수용 기준

- 첫 Google 로그인 시 사용자가 `pending`으로 생성된다.
- `pending` 사용자는 `/pending`과 로그아웃 외 업무 화면에 접근할 수 없다.
- 관리자가 `active`로 변경하면 재로그인 없이 다음 요청부터 접근 가능하다.
- `suspended` 변경도 다음 요청부터 적용된다.
- 최초 관리자 생성 절차가 문서와 seed에 존재한다.

---

### P0-2. Proxy와 권한 가드의 책임을 분리한다

#### 문제

Next.js의 Proxy(구 Middleware)는 빠른 리다이렉트에는 적합하지만 최종 권한 검사 수단이 아니다. 또한 “모든 쿼리가 `guards.ts`를 거친다”는 규칙은 코드 검색만으로 완전하게 보장하기 어렵다.

#### 권고

```text
proxy.ts
  └─ 세션 쿠키 존재 여부에 따른 낙관적 리다이렉트

src/server/auth/require-user.ts
  ├─ requireUser()
  ├─ requireActiveUser()
  └─ requireAdmin()

src/server/data/*
  └─ 서버 전용 repository / query
```

- 모든 Server Component, Server Action, Route Handler의 보호된 진입점에서 `requireActiveUser()` 또는 `requireAdmin()` 호출
- `src/server/*`에 `server-only` 적용
- DB 인스턴스는 `src/server/db`에서만 export
- UI와 Client Component에서 DB 모듈 import 금지
- CI는 grep 대신 ESLint `no-restricted-imports`와 구조 테스트를 병행

#### 수용 기준

- Proxy를 우회해 Route Handler를 직접 호출해도 `pending`은 401/403이다.
- 보호된 Server Action을 직접 호출해도 권한 검사가 수행된다.
- Client Component에서 DB 모듈 import 시 lint/build가 실패한다.
- 관리자 API를 member가 호출하면 403이다.

---

### P0-3. R2 원문은 앱 출처에서 그대로 실행하지 않는다

#### 문제

외부 HTML을 gzip으로 저장한 뒤 `Content-Encoding: gzip`으로 반환하면 압축은 풀리지만 콘텐츠는 안전해지지 않는다. `text/html`로 앱 도메인에서 inline 응답하면 원문의 script, form, event handler 등이 실행될 수 있다.

#### 권고

- R2 bucket은 private
- Phase 1은 원문 HTML을 사용자 화면에 inline 렌더링하지 않음
- 원문 보기 기본값:
  - 추출 텍스트를 `text/plain`으로 표시하거나
  - 파일 다운로드로 제공
- HTML 미리보기가 꼭 필요하면 강한 sanitizer와 sandboxed iframe을 별도 출처에서 사용
- R2 접근은 인증된 서버 Route Handler가 권한 확인 후 처리
- 외부에 공유 가능한 장기 presigned URL을 만들지 않음
- `card_assets`에 checksum과 원출처 메타데이터 추가

추천 필드:

```text
sha256
source_url
fetched_at
content_encoding
retention_class
archive_error
```

#### 수용 기준

- 저장된 HTML의 `<script>`와 event handler가 제품 출처에서 실행되지 않는다.
- 비승인 사용자가 R2 object key를 알아도 파일을 받을 수 없다.
- 카드와 R2 객체의 무결성을 checksum으로 확인할 수 있다.
- 실패한 업로드와 고아 객체를 탐지할 수 있다.

---

### P0-4. Next.js 버전을 지금 정리한다

#### 문제

현재 skeleton은 Next.js 14.2.15이고 문서는 현재 스택처럼 표현한다. 최신 Next.js에서는 Middleware가 Proxy로 변경되었으며 인증 경계의 권고도 달라졌다.

#### 권고

아직 코드가 작으므로 Round 1 재작성과 함께 최신 안정 버전으로 올린다.

- `middleware.ts` 대신 `proxy.ts`
- 현재 Auth.js 공식 패턴 사용
- Node 런타임 버전 명시
- lockfile 생성

업그레이드 비용이 예상보다 크면 Next.js 14 유지 결정을 ADR로 명시하고 지원 종료 전에 업그레이드 일정을 둔다.

#### 수용 기준

- `package.json`과 ARCHITECTURE의 버전 전제가 일치한다.
- clean install, typecheck, build가 통과한다.
- 인증 라우트와 Proxy가 선택한 Next.js 버전의 공식 패턴을 따른다.

---

### P0-5. 기준 프로젝트 디렉터리와 Git 상태를 확정한다

#### 문제

현재 로컬 작업 폴더에는 루트 프로젝트 외에 다음이 함께 존재한다.

- `startupissue/`
- `startupissue-round1/`
- `startupissue-round1.zip`

루트 폴더에는 `.git`이 없지만 `docs/PROGRESS.md`에는 GitHub 저장소가 기록되어 있다.

#### 권고

- GitHub 저장소의 현재 기본 브랜치를 깨끗한 별도 폴더에 clone
- 기존 루트 파일과 diff
- 기준 저장소가 확인된 뒤 한 곳만 canonical working copy로 사용
- 기존 폴더는 확인 전 삭제하지 않음

#### 수용 기준

- `git status`가 동작한다.
- remote URL과 기본 브랜치가 문서에 기록된다.
- 실제 작업 폴더가 하나로 확정된다.
- Round 1 변경 전 기준 커밋이 존재한다.

---

## 4. P1 — Round 1 또는 Round 2에서 보완

### P1-1. Neon에도 PostgreSQL RLS는 존재한다

“Neon에는 RLS가 없다”는 설명은 부정확하다. Neon은 PostgreSQL이므로 RLS를 사용할 수 있다. 다만 Auth.js 세션을 DB 정책의 사용자 컨텍스트로 전달하는 구현 복잡성이 생긴다.

현재 규모에서는 앱 레벨 권한을 선택할 수 있지만 다음처럼 기록해야 한다.

> Neon의 RLS 부재가 아니라, Auth.js와 RLS 컨텍스트 연결 복잡성을 피하기 위해 Phase 1에서 앱 레벨 권한을 선택한다.

앱이 외부 API를 제공하거나 사용자 규모가 확대되면 RLS 재도입을 검토한다.

### P1-2. `cards.company_id`를 다대다로 변경

하나의 투자·제휴·인수 기사에는 여러 기업이 등장할 수 있다.

```text
card_companies(card_id, company_id, relation_type, confidence)
```

단일 `company_id`는 대표 기업 캐시로만 사용하거나 제거한다.

### P1-3. DB와 R2의 원문 중복을 제거

기존 `raw_items.raw_content`와 R2 snapshot이 같은 원문을 중복 저장할 수 있다.

권고:

- DB: 원천 식별자, URL, 제목, 날짜, 허용된 추출 텍스트, 해시, R2 참조
- R2: 원문 snapshot과 첨부

저작권 또는 이용 조건상 전문 저장이 허용되지 않으면 R2 snapshot을 만들지 않고 메타데이터와 해시만 저장한다.

### P1-4. 원문 전문 저장 정책을 별도 결정

“내부 소수 사용자라 실무상 문제가 되기 어렵다”는 문구만으로 저장을 정당화하지 않는다.

소스별로 다음을 기록한다.

- 수집 허용
- 전문 저장 허용
- 내부 재열람 허용
- 보존 기간
- 삭제 요청 처리

법적 판단이 필요한 소스는 정식 검토 전 메타데이터·요약·원문 링크만 저장한다.

### P1-5. R2 lifecycle 규칙은 체크 상태를 직접 알지 못한다

“사용자가 체크한 PDF만 유지하고 미체크 PDF는 90일 후 삭제”하려면 객체 prefix/tag 변경 또는 애플리케이션 정리 작업이 필요하다. DB 상태를 R2 lifecycle이 자동으로 조회하지는 못한다.

Round 3에서 다음 중 하나를 결정한다.

- 임시와 보존 bucket/prefix를 분리
- 체크 시 object를 보존 prefix로 이동
- 주기적 정리 워커가 DB와 R2를 함께 확인

### P1-6. Round 1에서 R2 구현을 분리

Round 1의 목표는 인증·승인·빈 오늘 화면이다. `card_assets` 스키마는 준비할 수 있지만 R2 upload/streaming 유틸 구현은 실제 수집과 아카이빙이 시작되는 Round 2~3으로 미룬다.

---

## 5. 권장 수정 스택

```text
Web/BFF       Next.js 최신 안정 App Router
Database      Neon PostgreSQL
ORM           Drizzle ORM
Auth          Auth.js + Google + Drizzle Adapter + database session
Authorization Proxy(낙관적) + server-only DAL guard(최종)
Storage       Private Cloudflare R2
Worker        Node CLI, 추후 Render scheduled job
Style         Tailwind CSS
Validation    Zod
Test          Vitest + DB 통합 테스트 + Playwright smoke
```

---

## 6. 수정된 Round 계획

### Round 0 — 기준 저장소와 결정

- canonical Git 저장소 확정
- ADR-002: Neon/Auth.js/R2 전환
- Auth.js 사용자·세션·승인 모델 확정
- 권한 경계와 테스트 확정
- R2 안전 제공·보존 원칙 확정
- Next.js 버전 결정

### Round 1 — 인증 수직 절편

- Neon + Drizzle
- Auth.js Google 로그인
- 신규 사용자 pending
- 최초 관리자 seed
- active 승인·suspended 차단
- Proxy 낙관적 리다이렉트
- 서버 DAL의 최종 권한 검사
- 빈 오늘 화면

### Round 2 — RSS 수집 수직 절편

- RSS 소스 하나
- source item 멱등 저장
- ingestion run
- 카드 생성
- 카드 목록
- 관리자 숨김

### Round 3 — 공고와 아카이빙

- 정부 공고 소스
- private R2
- snapshot·첨부 정책
- 실패 재시도와 고아 객체 정리

### Round 4 — 묶음

- 카드 선택
- collection
- 내부 공개

### Round 5 — 배포

- Web
- Worker scheduled job
- 운영 로그·복구

---

## 7. 구현 착수 판정

현재 상태: **조건부 준비**

다음 다섯 항목이 완료되면 Round 1 구현을 시작할 수 있다.

- [ ] canonical Git 작업 폴더 확정
- [ ] Auth.js adapter·session 전략 확정
- [ ] 승인·정지의 서버 권한 검사 수용 기준 확정
- [ ] R2 원문 제공 보안 원칙 확정
- [ ] Next.js 버전 확정

