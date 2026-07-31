# Vercel 배포

최종 갱신: 2026-07-29

## 배포 경계

- Vercel: Next.js 웹/BFF와 Auth.js 콜백
- Neon: PostgreSQL
- 별도 실행 환경: `worker/` 수집 CLI

현재 Vercel 프로젝트는 `161company/startupissue`, Production URL은
`https://startupissue.vercel.app`이다.

Vercel 배포는 웹 앱을 상시 접근 가능하게 만들지만, 장시간 실행되는 수집 워커를
자동으로 실행하지 않는다. 수집은 현재 로컬 또는 별도 워커 환경에서 실행한다.

## 1. Vercel 프로젝트 연결

Vercel 대시보드에서 `banddal/startupissue` 저장소를 가져오거나 프로젝트 루트에서
다음을 실행한다.

```bash
npx vercel link
```

Framework Preset은 `Next.js`, Root Directory는 저장소 루트로 둔다. Git 기반 자동
배포를 사용한다면 Production Branch를 실제 운영 브랜치로 지정한다. 현재 개발
브랜치는 `codex/round1-auth`이고 저장소 기본 브랜치는 `main`이다.

## 2. 환경변수

Vercel Project Settings → Environment Variables에 다음 값을 Production 환경으로
등록한다.

| 이름 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | 필수 | Neon pooled PostgreSQL 연결 문자열 |
| `AUTH_SECRET` | 필수 | 32자 이상의 안전한 무작위 문자열 |
| `AUTH_GOOGLE_ID` | 필수 | Google OAuth 클라이언트 ID |
| `AUTH_GOOGLE_SECRET` | 필수 | Google OAuth 클라이언트 비밀값 |
| `BOOTSTRAP_ADMIN_EMAIL` | 운영용 | 최초 관리자 이메일 |

`AUTH_URL`과 `AUTH_TRUST_HOST`는 Vercel에서 Auth.js v5가 요청 헤더와 `VERCEL`
환경변수로 자동 추론하므로 기본 배포에서는 설정하지 않는다.

수집 전용 값(`PLATUM_RSS_URL`, `KSTARTUP_SERVICE_KEY`, `KSTARTUP_API_URL`,
`OPENALEX_API_KEY`, `OPENALEX_SEARCH_QUERY`)은 별도 워커 실행 환경에만 둔다.
OpenAlex 키는 무료 발급 키를 사용하며, 검색식은 지표 범위 검토 후 승인된 문자열을
등록한다.

## 3. Google OAuth

프로덕션 도메인이 `https://startupissue.vercel.app`이라면 Google Cloud Console의
OAuth 클라이언트에 다음 URI를 추가한다.

```text
https://startupissue.vercel.app/api/auth/callback/google
```

실제 Vercel 도메인으로 바꿔 입력한다. 로컬 콜백도 계속 사용할 경우 아래 URI를 함께
유지한다.

```text
http://localhost:3000/api/auth/callback/google
```

Preview 배포 URL은 매번 달라지므로 Google 로그인 검증은 안정적인 Production
도메인에서 수행한다.

## 4. 데이터베이스

배포 전에 대상 Neon DB에 migration을 한 번 적용한다.

```bash
pnpm db:migrate
```

Vercel 빌드 과정에서는 migration을 자동 실행하지 않는다. 동시 배포나 Preview
배포가 스키마 변경을 중복 적용하지 않게 하기 위함이다.

## 5. 검증과 배포

```bash
pnpm check
npx vercel deploy
npx vercel deploy --prod
```

배포 후 다음 경로를 확인한다.

- `/api/health`: 웹 함수 기동 상태와 배포 커밋
- `/`: Google 로그인
- `/pending`: 신규 사용자 승인 대기
- `/today`: 승인 사용자 오늘 화면
- `/admin/ingestion`: 관리자 수집 실행 이력

## 6. 최초 관리자

프로덕션 Google 로그인을 한 번 수행해 사용자를 만든 다음, 안전한 운영 터미널에서
Production `DATABASE_URL`과 `BOOTSTRAP_ADMIN_EMAIL`을 사용해 실행한다.

```bash
pnpm exec node --env-file=.env.production.local scripts/bootstrap-admin.mjs
```

비밀값 파일은 Git에 커밋하지 않는다.
