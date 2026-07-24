# Startup Issues — Architecture

최종 갱신: 2026-07-24

## 제품

스타트업 뉴스와 정부 공고를 매일 수집해 중요한 변화를 보여주고, 과거 정보를 누적하는 승인제 내부 웹 도구.

초기 전제:

- 사용자 2~3명
- 하루 카드 30~50건
- 비공개 내부 서비스
- 재작업 최소화와 저비용 운영 우선

## 기술

| 영역 | 선택 |
|---|---|
| Web | Next.js 16 App Router |
| DB | Neon PostgreSQL |
| ORM | Drizzle |
| Auth | Auth.js + Google OAuth |
| Session | Database session |
| Style | Tailwind CSS 4 |
| Worker | Node CLI, Round 2부터 |
| Storage | Private Cloudflare R2, Round 3부터 |

## 시스템 경계

```text
Browser
  ↓
Next.js Web/BFF
  ├─ Server Components
  ├─ Server Actions
  └─ Route Handlers
       ↓
Neon PostgreSQL

External Sources
  ↓
Node Worker
  ├─ 수집·정규화
  ├─ AI 처리
  └─ 재시도·실행 이력
       ↓
Neon + Private R2
```

원칙:

- 브라우저는 DB와 R2 자격증명을 받지 않는다.
- Proxy는 빠른 이동 제어만 담당한다.
- 서버 가드가 현재 DB의 사용자 상태를 확인해 최종 권한을 결정한다.
- 장시간 수집은 Next.js 요청에서 실행하지 않는다.
- 원문 HTML은 앱 출처에서 그대로 실행하지 않는다.

## 인증

사용자 상태:

```text
pending → active
        ↘ rejected
active  → suspended
```

- 첫 Google 로그인 사용자는 `pending`
- `pending`, `rejected`, `suspended`는 제품 데이터 접근 불가
- admin만 사용자 상태 변경
- 상태 변경은 다음 보호 요청부터 적용

Auth.js 테이블:

- `users`
- `accounts`
- `sessions`
- `verification_tokens`

`users`에 `role`, `status`, 승인 이력을 둔다.

## 권한 계층

```text
proxy.ts
  └─ 낙관적 redirect

requireUser()
requireActiveUser()
requireAdmin()
  └─ 서버의 최종 검사
```

Client Component의 DB import는 lint에서 차단한다.

## 개발 단계

1. 인증과 승인
2. RSS 수집과 첫 카드
3. 정부 공고·AI 요약·정보가치
4. 검색·타임라인·아카이빙
5. 메모·묶음
6. 베타 배포

## 현재 결정

- Supabase 대신 Neon 사용
- PostgreSQL 관계형 모델 유지
- 앱 레벨 권한 사용
- Auth.js database session 사용
- R2 구현은 실제 아카이빙이 시작되는 Round 3까지 연기

세부 결정은 `docs/decisions/`에 기록한다.
