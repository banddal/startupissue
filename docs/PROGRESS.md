# 진행 기록

최종 갱신: 2026-07-24

## 현재 상태

| 항목 | 값 |
|---|---|
| 라운드 | Round 1 — 인증 |
| 브랜치 | `codex/round1-auth` |
| 기준 저장소 | `https://github.com/banddal/startupissue` |
| 로컬 작업본 | `C:\Users\HP\Desktop\coding test\startup issues` |
| 상태 | 외부 서비스 연결 전 로컬 구현 완료 |

## 확정 스택

- Next.js 16.2.11
- React 19.2.8
- Neon PostgreSQL
- Drizzle ORM
- Auth.js 5 beta + Google OAuth
- database session
- Tailwind CSS 4
- Vitest

## 구현 완료

- [x] 빈 GitHub 저장소에 기존 골격 기준 커밋
- [x] `codex/round1-auth` 브랜치
- [x] Supabase 코드 제거
- [x] Neon + Drizzle 스키마
- [x] Auth.js adapter와 database session
- [x] 신규 사용자 기본값 `pending`
- [x] Proxy 낙관적 이동 제어
- [x] 서버의 현재 사용자 상태 재확인
- [x] pending 화면
- [x] admin 사용자 상태 변경
- [x] 빈 today 화면
- [x] 최초 admin bootstrap script
- [x] Drizzle 초기 migration
- [x] 권한 이동 규칙 단위 테스트 7개
- [x] lint
- [x] typecheck
- [x] production build

## 아직 필요한 것

### 사용자 외부 설정

- [ ] Neon 프로젝트와 `DATABASE_URL`
- [ ] Google OAuth client
- [ ] `AUTH_SECRET`
- [ ] 최초 관리자 이메일

### 실제 환경 검증

- [ ] Neon에 migration 적용
- [ ] Google 로그인
- [ ] pending 사용자 생성 확인
- [ ] admin bootstrap
- [ ] active 승인 후 today 접근
- [ ] suspended 변경 후 차단

### Claude 리뷰

- [ ] `docs/decisions/002-auth-and-neon.md`
- [ ] `docs/HANDOFF.md`
- [ ] 권한 우회와 database session 검토

## 다음 라운드

Round 2 목표:

> RSS 기사 한 건이 수집되어 카드로 오늘 화면에 보인다.

예정:

- RSS 소스 하나
- Node CLI worker
- source item 멱등 저장
- ingestion run
- 카드 생성
- 카드 목록·상세
