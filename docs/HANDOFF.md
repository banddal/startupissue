# Claude 리뷰 핸드오프 — Round 1

## 목표

Google 로그인 후 관리자 승인을 받은 사용자만 빈 오늘 화면에 접근한다.

## 구현 범위

- Next.js App Router
- Neon + Drizzle
- Auth.js Google OAuth + database session
- pending / active / rejected / suspended
- Proxy 낙관적 이동 제어
- 서버 권한 가드
- 관리자 사용자 상태 변경

## 리뷰 기준

`docs/decisions/002-auth-and-neon.md`의 불변조건과 수용 기준을 검토한다.

## Claude 요청

- P0/P1/P2로 문제 분류
- 실패 시나리오와 재현 방법
- 권장 수정
- 수정 완료를 판단할 수용 기준

코드 스타일보다 인증 우회, 세션 최신성, 관리자 권한과 데이터 경계를 우선한다.

## Codex 후속 구현 — 2026-07-28

Round 2 수집 파이프라인을 Neon 실환경에 적용하고 `/today` 수직 절편을 연결했다.

- Platum은 3회 연속 각 10건을 중복 처리했고 실패는 없었다.
- K-Startup은 3회 연속 각 100건을 중복 처리했고 실패는 없었다.
- `/today`는 오늘 신규 카드 수, 최대 5건의 주요 업데이트, 마지막 성공 수집 시각을 표시한다.
- 오늘 신규가 없으면 빈 화면 대신 최근 아카이브를 명시적으로 표시한다.
- 주요 업데이트 순서는 현재 최신 수집·발표 시각 기준의 임시 규칙이다.

검증:

- TypeScript 통과
- ESLint 통과
- Vitest 28개 통과
- Next.js production build 통과

다음 리뷰에서는 오늘 화면의 날짜 경계(Asia/Seoul), 검토 대기 카드 노출 정책,
정보가치 모델 도입 전의 임시 최신순 정렬을 우선 확인한다.
