# Startup Issues

스타트업 관련 정보(뉴스·정부공고)를 매일 자동 수집해 카드로 쌓고, 훑어보며 중요한 것을 체크·메모하고, 관련된 카드들을 묶어 인사이트를 남기는 도구.

## 문서

- `docs/PROGRESS.md` — 진행 기록. 매 라운드 갱신
- `docs/decisions/` — 결정 문서

## 설정

### 1. 의존성

```bash
pnpm install
```

### 2. Supabase

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase/migrations/0001_init.sql` 실행
3. Authentication → Providers → Google 활성화
   - Google Cloud Console에서 OAuth 클라이언트 생성
   - 승인된 리디렉션 URI에 Supabase가 안내하는 콜백 URL 등록
4. Project Settings → API에서 URL과 anon key 확인

### 3. 환경변수

`.env.example`을 복사해 `.env.local` 생성 후 값 입력.

```bash
cp .env.example .env.local
```

### 4. 실행

```bash
pnpm dev
```

### 5. 첫 관리자 지정

Google 로그인을 한 번 한 뒤, Supabase SQL Editor에서 실행.

```sql
update profiles set role = 'admin', status = 'active'
where email = 'your@email.com';
```

## 구조

```
src/app/          화면 (Next.js App Router)
src/components/   클라이언트 컴포넌트
src/lib/          Supabase 클라이언트, 타입
supabase/         마이그레이션
worker/           수집 워커 (Round 2부터)
scripts/          CI 검사
```

## 원칙

- 웹은 anon 키 + 사용자 세션만 사용한다. `service_role`은 워커 전용.
- `pnpm check:service-role`로 위반을 검사한다.
