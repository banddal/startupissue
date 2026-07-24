# 진행 기록

이 문서는 매 라운드마다 갱신한다. ChatGPT/Codex에 현재 상태를 공유할 때 이 파일을 그대로 전달하면 된다.

---

## 프로젝트 요약

스타트업 관련 정보(뉴스·정부공고)를 매일 자동 수집해 카드로 쌓고, 사용자가 아침에 훑어보며 중요한 것을 체크·메모하고, 관련된 카드들을 묶어 인사이트를 남기는 도구.

사용자 규모는 소수(2~3명 시작, 확대 가능). 창업 프로젝트가 아니라 실사용 도구.

**기술 스택**: Next.js(App Router) + TypeScript / Supabase(PostgreSQL + Auth + RLS) / 별도 Node CLI 워커 / Tailwind CSS

---

## 현재 상태

| 항목 | 값 |
|---|---|
| 현재 라운드 | Round 1 (Sprint 0) |
| 진행 단계 | 프로젝트 골격 + 스키마 + 인증 |
| 저장소 | https://github.com/banddal/startupissue |
| 로컬 경로 | `C:\Users\HP\Desktop\coding test\startup issues` |

---

## Round 1 — Sprint 0: 뼈대

**목표**: 로그인해서 빈 오늘 화면을 본다.

### 완료

- [x] 프로젝트 디렉토리 구조
- [x] 결정 문서 001 (스키마와 RLS)
- [x] Supabase 스키마 마이그레이션 (profiles, companies, raw_items, cards, bundles 등)
- [x] RLS 정책
- [x] Next.js 프로젝트 설정 파일
- [x] Supabase 클라이언트 (브라우저/서버)
- [x] Google OAuth 로그인
- [x] 승인 대기 화면
- [x] 관리자 승인 화면
- [x] 빈 오늘 화면

### 사용자가 할 일

1. Supabase 프로젝트 생성 후 URL과 anon key를 `.env.local`에 입력
2. Google OAuth 설정 (Supabase 대시보드 → Authentication → Providers → Google)
3. `supabase/migrations/0001_init.sql`을 Supabase SQL Editor에서 실행
4. 본인 계정으로 로그인 후, SQL Editor에서 본인을 admin으로 승격 (아래 명령)
5. `pnpm install` 후 `pnpm dev`로 실행 확인

```sql
-- 본인 이메일로 교체
update profiles set role = 'admin', status = 'active'
where email = 'your@email.com';
```

### 다음 라운드 (Round 2 — Sprint 1)

- 워커 CLI 골격
- 스타트업 전문지 RSS 어댑터 1개
- raw_items 저장 + 멱등키
- ingestion_runs 기록
- 카드 목록에 실제 데이터 노출

### 조사 필요

- 전문지 RSS 후보 3개의 피드 안정성·기사 비율·이용조건 (Round 2 전)

---

## 결정 사항 누적

| 번호 | 제목 | 상태 |
|---|---|---|
| 001 | 스키마 1차 확정과 RLS 정책 | 확정 |

---

## 범위 결정 이력

**2026-07-24 — 범위 축소**

사용자 규모(2~3명)에 비해 과한 기능을 제거.

제거: 검토 큐, 3환 shadow 정책, 중복 병합 관리자 승인, 점수 내역 조회 UI, 가중치 조정 화면

유지: Google 로그인 + 승인 대기/승인 (사용자 확대 대비, DB로 처리되므로 코드 수정 불필요)

단순화: 정보가치 점수는 계산해 정렬에만 사용. 화면에는 "중요도순/최신순" 토글만 제공

---

## 알려진 제약

- Phase 1에서는 섹터를 정하지 않는다. 스타트업 전반을 수집하고 나중에 태그로 분류
- 따라서 앵커 키워드 필터는 사용하지 않으며, 유일한 관련성 필터는 명부 매칭
- arXiv·KIPRIS 수집은 섹터 확정 후 (Phase 1.5)
