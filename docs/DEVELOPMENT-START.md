# 개발 시작 기준

작성일: 2026-07-24  
상태: Round 1 착수 직전

---

## 1. 무엇을 먼저 만드는가

Round 1의 목표는 하나다.

> **Google로 로그인하고, 관리자의 승인을 받은 사용자만 빈 오늘 화면을 볼 수 있게 한다.**

아직 만들지 않는다.

- 뉴스·공고 수집
- R2 원문 저장
- 카드 목록
- 묶음
- AI 요약
- 배포

이 기능들은 인증과 권한이 검증된 다음 라운드에서 만든다.

---

## 2. 확정 기술안

| 영역 | 선택 |
|---|---|
| Web | 최신 안정 Next.js App Router |
| DB | Neon PostgreSQL |
| ORM | Drizzle |
| 인증 | Auth.js + Google OAuth |
| 세션 | Drizzle Adapter + database session |
| 권한 | Proxy 1차 이동 제어 + 서버 가드 최종 검사 |
| 스타일 | Tailwind CSS |
| 패키지 | pnpm |
| 테스트 | Vitest + DB 통합 테스트 + 인증 E2E smoke |

R2와 Node 수집 워커는 Round 2~3에서 추가한다.

---

## 3. 권한 구조

```text
Google 로그인
      ↓
신규 사용자 pending 생성
      ↓
pending 화면만 접근
      ↓
관리자가 active 승인
      ↓
today 화면 접근
      ↓
suspended 변경 시 다음 요청부터 차단
```

### 책임 분리

- `proxy.ts`: 로그인 여부를 보고 빠르게 이동시킨다.
- 서버 가드: DB의 현재 `status`와 `role`을 확인한다.
- 관리자 화면: 사용자를 승인·정지한다.
- Client Component: DB에 직접 접근하지 않는다.

Proxy만으로 권한을 보장하지 않는다.

---

## 4. Round 1 데이터

Auth.js 기본 테이블:

- `users`
- `accounts`
- `sessions`
- `verification_tokens`

`users` 추가 필드:

- `role`: `admin | member`
- `status`: `pending | active | rejected | suspended`
- `approved_by`
- `approved_at`

Round 1에서는 카드·기업·묶음 스키마를 마이그레이션하지 않는다. 인증 흐름이 통과한 뒤 기존 PostgreSQL 스키마를 Drizzle로 옮긴다.

---

## 5. Round 1 완료 조건

### 사용자 흐름

- [ ] 첫 Google 로그인 시 `pending` 사용자 생성
- [ ] pending 사용자는 대기 화면만 접근
- [ ] admin은 사용자 목록 확인
- [ ] admin이 사용자를 active로 승인
- [ ] active 사용자는 재로그인 없이 today 접근
- [ ] suspended 사용자는 다음 요청부터 차단
- [ ] 로그아웃 가능

### 보안

- [ ] 보호 페이지 직접 접근 차단
- [ ] 관리자 API를 member가 호출하면 403
- [ ] Server Action 직접 호출에도 권한 검사
- [ ] Client Component에서 DB import 불가
- [ ] 비밀 환경변수가 브라우저 번들에 없음

### 품질

- [ ] install
- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] production build
- [ ] 인증 E2E smoke

---

## 6. Claude가 맡을 일

Claude는 코드를 병렬로 작성하지 않고 **설계와 수용 기준을 확정하고 구현 결과를 리뷰**한다.

### 착수 전

1. Auth.js + Drizzle 사용자 스키마 검토
2. database session 선택 검토
3. pending·active·suspended 권한 흐름의 우회 가능성 검토
4. 최초 admin 생성 방식 제안
5. Round 1 수용 기준에서 빠진 보안 사례 확인
6. `docs/decisions/002-auth-and-neon.md` 초안 작성

### 구현 후

1. Codex가 제공한 diff와 테스트 결과 검토
2. P0/P1/P2로 문제 분류
3. 코드 스타일이 아니라 권한 불변조건 위반 여부 확인
4. 다음 라운드로 넘어가도 되는지 판정

### Claude에게 전달할 요청

```text
Startup Issues의 Round 1 인증 설계를 검토해 주세요.

목표:
Google로 로그인하고 관리자 승인을 받은 사용자만 today 화면에 접근한다.

확정안:
- 최신 안정 Next.js App Router
- Neon PostgreSQL + Drizzle
- Auth.js Google OAuth
- Drizzle Adapter + database session
- Proxy는 낙관적 이동 제어만 담당
- 서버의 requireActiveUser/requireAdmin이 최종 권한 검사
- 신규 사용자는 pending
- active 승인과 suspended 변경은 다음 요청부터 반영

검토할 것:
1. Auth.js adapter 테이블에 role/status를 추가할 때의 위험
2. database session의 장단점
3. pending/active/suspended 우회 가능성
4. 최초 admin bootstrap 방식
5. 빠진 테스트와 불변조건

결과물:
- docs/decisions/002-auth-and-neon.md에 들어갈 내용
- P0/P1/P2 문제
- Round 1 수용 기준

실행 가능한 애플리케이션 코드는 작성하지 말고, 스키마·불변조건·수용 기준을 검토해 주세요.
```

---

## 7. Codex가 맡을 일

Codex는 **저장소·구현·테스트·통합**을 책임진다.

### 저장소

1. GitHub 기준 저장소를 깨끗하게 clone
2. 기존 로컬 파일과 비교
3. 작업 브랜치 생성
4. 패키지와 Node 버전 고정

### 구현

1. Next.js 기준 버전으로 프로젝트 정리
2. Neon + Drizzle 연결
3. Auth.js adapter 스키마와 마이그레이션 작성
4. Google OAuth
5. `requireUser`, `requireActiveUser`, `requireAdmin`
6. Proxy
7. pending 화면
8. admin 사용자 승인 화면
9. 빈 today 화면
10. 환경변수 검증

### 검증

1. 권한 단위·통합 테스트
2. 인증 E2E smoke
3. lint·typecheck·build
4. Claude 리뷰용 diff와 테스트 결과 정리
5. 리뷰 반영 후 Round 1 완료 판정

---

## 8. 사용자에게 필요한 것

### 개발 시작 승인

- [ ] GitHub `banddal/startupissue`를 기준 저장소로 사용
- [ ] 최신 안정 Next.js로 재구성
- [ ] 위 Auth.js 권고안 사용

### 외부 설정

코드 골격과 테스트는 먼저 진행할 수 있다. 실제 Google 로그인 연결 전에는 다음이 필요하다.

- Neon `DATABASE_URL`
- Google OAuth Client ID
- Google OAuth Client Secret
- Auth.js secret

비밀값은 채팅이나 Git에 올리지 않고 로컬 `.env.local`에만 저장한다.

---

## 9. 작업 순서

```text
1. 사용자가 개발 시작안 승인
2. Claude가 ADR-002 검토
3. Codex가 기준 저장소와 브랜치 준비
4. Codex가 Round 1 구현
5. Codex가 테스트 결과와 diff 정리
6. Claude가 권한·수용 기준 리뷰
7. Codex가 수정하고 Round 1 완료
8. RSS 수집 Round 2 시작
```

Claude 검토와 Codex의 저장소 준비는 동시에 진행할 수 있다. 애플리케이션 구현은 P0 설계 문제가 없는지 확인한 뒤 시작한다.

