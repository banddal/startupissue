# ADR-002 — Neon, Auth.js, 승인 기반 접근 제어

상태: Claude 검토 대기  
작성일: 2026-07-24

## 결정

- Neon PostgreSQL과 Drizzle ORM을 사용한다.
- Auth.js Google provider와 Drizzle Adapter를 사용한다.
- 세션은 database session으로 저장한다.
- 사용자 `role`과 `status`는 Auth.js user 행에 둔다.
- 신규 사용자는 `pending`이다.
- Proxy는 낙관적 이동 제어만 한다.
- 서버 진입점의 `requireActiveUser`와 `requireAdmin`이 최종 권한을 검사한다.
- 관리자 상태 변경은 다음 보호 요청부터 적용된다.

## 불변조건

1. pending, rejected, suspended 사용자는 제품 데이터를 읽을 수 없다.
2. member는 관리자 기능을 호출할 수 없다.
3. Client Component는 DB에 직접 접근할 수 없다.
4. DB와 OAuth 비밀값은 브라우저에 노출되지 않는다.
5. 관리자는 자기 계정을 비활성화할 수 없다.

## 수용 기준

- 첫 Google 로그인 후 pending 사용자 행과 database session이 생성된다.
- pending은 대기 화면과 로그아웃만 사용할 수 있다.
- active 승인 후 재로그인 없이 today에 접근한다.
- suspended 변경 후 다음 요청부터 차단된다.
- 보호된 페이지, Server Action, 관리자 변경을 직접 호출해도 같은 권한 규칙이 적용된다.
- lint, typecheck, test, production build가 통과한다.

## Claude 검토 질문

1. Adapter user 테이블에 제품 필드를 추가할 때의 호환 위험은 무엇인가?
2. database session 선택으로 생기는 운영 단점은 무엇인가?
3. 현재 권한 흐름에서 우회 가능한 진입점이 있는가?
4. 최초 admin bootstrap 방법은 충분히 안전한가?
5. Round 1 수용 기준에 빠진 테스트가 있는가?
