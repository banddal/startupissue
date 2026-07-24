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
