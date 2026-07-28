# Startup Issues

스타트업 뉴스와 정부 공고를 매일 수집해 중요한 변화를 보여주고 과거 정보를 누적하는 내부 인텔리전스 아카이브.

## 현재 범위

Round 1은 인증과 승인 기반 접근 제어만 구현한다.

- Google OAuth
- 신규 사용자 `pending`
- 관리자 승인·정지
- 승인된 사용자만 `/today` 접근

수집 워커와 실제 카드는 Round 2부터 추가한다.

## 기술

- Next.js 16 App Router
- Neon PostgreSQL
- Drizzle ORM
- Auth.js + Google OAuth + database session
- Tailwind CSS 4
- Vitest

## 로컬 설정

### 1. 환경변수

`.env.example`을 `.env.local`로 복사하고 값을 입력한다.

```text
DATABASE_URL=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
BOOTSTRAP_ADMIN_EMAIL=
```

Auth.js secret은 안전한 무작위 문자열을 사용한다. 환경변수와 비밀값은 Git에 커밋하지 않는다.

### 2. 설치와 마이그레이션

```bash
pnpm install
pnpm db:migrate
```

### 3. 실행

```bash
pnpm dev
```

Google OAuth callback:

```text
http://localhost:3000/api/auth/callback/google
```

### 4. 첫 관리자

Google 로그인을 한 번 수행해 `pending` 사용자를 만든 다음:

```bash
pnpm exec node --env-file=.env.local scripts/bootstrap-admin.mjs
```

`BOOTSTRAP_ADMIN_EMAIL`과 일치하는 사용자 한 명만 admin·active로 변경한다.

## Round 2 수집

`.env.local`에 수집 설정을 추가한다.

```text
PLATUM_RSS_URL=https://platum.kr/feed
KSTARTUP_SERVICE_KEY=
```

DB에 쓰지 않고 파싱 결과만 확인:

```bash
pnpm worker ingest --source=platum --dry-run
pnpm worker ingest --source=kstartup --dry-run
```

한 소스 또는 설정된 전체 소스를 DB에 저장:

```bash
pnpm worker ingest --source=platum
pnpm worker ingest --all
```

`--all`은 소스별 실패를 격리한다. K-Startup 키가 없으면 해당 소스만 건너뛰고
플래텀 수집은 계속한다.

## 검증

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 문서

- `docs/ARCHITECTURE.md`
- `docs/PRD.md`
- `docs/DEVELOPMENT.md`
- `docs/decisions/002-auth-and-neon.md`
- `docs/HANDOFF.md`
