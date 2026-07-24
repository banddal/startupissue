# 구현 착수 체크리스트

작성일: 2026-07-24

## 현재 판정

**조건부 준비 — 코드 작성 전에 Round 0 완료 필요**

---

## 1. 사용자 결정이 필요한 것

### 1. 기준 저장소

현재 작업 폴더는 Git 저장소가 아니며 중첩 폴더와 zip이 함께 있다.

권고:

- `https://github.com/banddal/startupissue`를 깨끗한 폴더에 clone
- clone한 폴더를 유일한 작업 폴더로 사용
- 현재 파일은 비교가 끝날 때까지 보존

사용자 결정:

```text
[ ] GitHub 저장소를 기준으로 새로 clone한다
[ ] 현재 루트 폴더를 새 Git 저장소로 만든다
```

### 2. Next.js 기준

권고:

- 코드가 작으므로 최신 안정 Next.js로 재구성
- `proxy.ts`와 현재 Auth.js 패턴 사용

사용자 결정:

```text
[ ] 최신 안정 버전으로 올린다
[ ] 기존 Next.js 14를 유지한다
```

### 3. Auth.js 전략

권고안:

- Auth.js Drizzle Adapter
- database session
- Google OAuth
- user 행에 `role`, `status`
- 매 보호 요청에서 현재 DB 상태 확인

사용자 결정:

```text
[ ] 권고안 승인
[ ] JWT session을 별도로 검토
```

### 4. 원문 아카이빙 정책

권고안:

- private R2
- Phase 1에는 원문을 inline HTML로 렌더링하지 않음
- 추출 텍스트 또는 다운로드만 제공
- 소스별 전문 저장 허용 여부 기록
- R2 실제 구현은 Round 3

사용자 결정:

```text
[ ] 권고안 승인
[ ] Round 1부터 R2 구현
```

---

## 2. 외부 서비스 준비

코드 구현 전에 비밀값을 이 문서나 Git에 적지 않는다.

### Neon

- [ ] 프로젝트 생성
- [ ] 가까운 리전 선택
- [ ] `DATABASE_URL` 확보
- [ ] 개발용 브랜치 정책 결정

### Google OAuth

- [ ] OAuth consent screen
- [ ] Web client 생성
- [ ] localhost callback 등록
- [ ] 배포 callback은 배포 시 추가

### Cloudflare R2

Round 3 전까지 미뤄도 된다.

- [ ] private bucket
- [ ] 최소 권한 API token
- [ ] CORS는 필요성이 확인될 때만 설정

---

## 3. Round 1 완료 정의

### 사용자 흐름

1. 사용자가 Google로 로그인한다.
2. 최초 사용자는 `pending`이 된다.
3. 사용자는 승인 대기 화면만 볼 수 있다.
4. 관리자가 사용자를 `active`로 승인한다.
5. 사용자는 재로그인 없이 빈 오늘 화면에 접근한다.
6. 관리자가 `suspended`로 변경하면 다음 요청부터 차단된다.

### 보안

- 보호 페이지 직접 URL 접근 차단
- Server Action 직접 호출 차단
- Route Handler 직접 호출 차단
- member의 관리자 기능 차단
- Client Component의 DB import 차단
- 환경변수와 비밀값의 클라이언트 번들 노출 차단

### 품질

- clean install 성공
- lint 성공
- typecheck 성공
- unit/integration test 성공
- production build 성공
- 인증 E2E smoke 성공

---

## 4. 첫 구현 순서

1. Git 기준점 확정
2. package·runtime 버전 고정
3. Drizzle schema와 migration
4. Auth.js adapter와 Google provider
5. `requireUser`, `requireActiveUser`, `requireAdmin`
6. Proxy의 낙관적 리다이렉트
7. pending 화면
8. admin 승인 화면
9. 빈 today 화면
10. 권한 통합 테스트
11. build와 E2E smoke

---

## 5. Claude 리뷰 요청

Round 1 구현 전에 Claude에게 다음만 검토 요청한다.

```text
Neon + Drizzle + Auth.js 전환안의 Round 1 인증 설계를 검토해 주세요.

확정 예정:
- Auth.js Drizzle Adapter
- database session
- auth user에 role/status 저장
- Proxy는 낙관적 redirect만 담당
- 모든 보호된 서버 진입점은 DB의 현재 status를 확인
- DB 모듈은 server-only DAL에서만 import

검토 항목:
1. Auth.js adapter 테이블과 제품 사용자 필드 결합 시 위험
2. pending/active/suspended 변경의 즉시 반영
3. 최초 admin bootstrap의 안전한 방식
4. Server Component/Action/Route Handler 권한 우회 가능성
5. database session 선택의 단점

P0/P1, 실패 시나리오, 수용 기준 형식으로 답해주세요.
```

