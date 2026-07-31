# REBOOT 코드 감사 및 기능 판정

작성일 2026-08-01  
기준 PRD: `docs/PRD-REBOOT.md` v0.3  
감사 커밋: `174ef22` (`codex/round1-auth`)  
목적: 구현 전에 현재 코드를 `유지 / 수정 / 비활성화 / 제거`로 판정한다.

---

## 1. 결론

현재 저장소를 폐기하거나 새 앱으로 다시 만들 필요는 없다.

- 인증, 사용자 승인, Neon·Drizzle, 카드 수집, 정확 중복 방지, 수집 이력과 Vercel
  배포 기반은 재사용 가치가 있다.
- 제품 화면과 데이터 모델은 PRD v0.3에 맞게 축소·확장해야 한다.
- 기업 명부, 정보가치 평가, 품질 평가, 독립 논문 저장소와 생태계 지표는 핵심
  흐름에서 분리한다.
- 기존 테이블과 데이터는 즉시 삭제하지 않는다.
- 먼저 UI·라우트·Cron에서 비활성화하고 새 흐름이 안정된 뒤 물리 삭제를 판단한다.

권고 방식은 `현재 저장소 유지 + 과도 기능 비활성화 + 핵심 기능 추가`다.

---

## 2. 현재 구현 요약

### 기술 기반

- Next.js 16
- React 19
- TypeScript
- Neon PostgreSQL
- Drizzle ORM
- Auth.js
- Vitest
- Vercel Cron

### 현재 라우트

| 라우트 | 현재 기능 | 판정 |
|---|---|---|
| `/` | 로그인 상태에 따른 이동 | 유지 |
| `/today` | 카드·생태계 지표·관리 링크가 섞인 상황판 | 대폭 수정 |
| `/cards` | 카드 목록 | 수정 후 `/archive` 역할로 재사용 |
| `/cards/[id]` | 카드 상세와 정보가치 표시 | 수정 |
| `/papers` | 독립 논문 목록 | 비활성화 |
| `/papers/[id]` | 독립 논문 상세 | 비활성화 |
| `/pending` | 승인 대기 | 유지 |
| `/admin/users` | 사용자 승인 관리 | 유지 |
| `/admin/ingestion` | 수집 실행 상태 | 유지·확장 |
| `/admin/companies` | 기업 명부·검증 | 비활성화 |
| `/admin/quality` | 카드 품질 표본 평가 | 비활성화 |
| `/api/cron/indicators` | 기업 수·논문 수 갱신 | 비활성화 후 재작성 |
| `/api/health` | 상태 확인 | 유지 |

### 현재 없는 핵심 라우트

- `/archive`
- `/collections`
- `/dashboard`

### 현재 수집 소스

| 소스 | 기능 | 판정 |
|---|---|---|
| Platum RSS | 스타트업·투자·기업 기사 | 유지 |
| K-Startup API | 지원사업·정책 공고 | 유지 |
| arXiv | 논문 수와 논문 저장 | 현재 Cron 비활성화, 기술 카드 소스로 후속 검토 |
| OpenAlex | 논문 수 지표 | 비활성화 |

---

## 3. 데이터베이스 판정

현재 Drizzle 스키마에는 19개 테이블이 있다.

### 유지

| 테이블 | 이유 |
|---|---|
| `users` | 사용자 상태와 관리자 역할 |
| `accounts` | Auth.js |
| `sessions` | Auth.js |
| `verification_tokens` | Auth.js |
| `sources` | 수집 소스 관리 |
| `source_items` | 원문·메타데이터와 정확 중복 방지 |
| `cards` | 공통 정보 카드 기반 |
| `ingestion_runs` | 소스별 수집 실행 이력 |
| `processing_attempts` | 수집 단계 오류 추적 |
| `indicators` | 시장·거시지표 정의 |
| `indicator_values` | 지표 값·기준일·출처·증감 |

### 수정 후 유지

| 테이블 | 수정 내용 |
|---|---|
| `cards` | `type`에 기업·기술·정책·투자 추가, 정보가치 UI 의존 제거 |
| `card_sources` | 기존 카드 상세가 의존하므로 당장 제거하지 않고 대표 출처 연결로 유지 |

### 신규

| 테이블 | 최소 구조 |
|---|---|
| `card_user_states` | `user_id`, `card_id`, `important` |
| `notes` | `user_id`, `card_id`, `body`, 시각, `(user_id, card_id)` 유일 |
| `collections` | `id`, `title`, 생성·수정 시각 |
| `collection_items` | `collection_id`, `card_id` |

투자 정보는 우선 `cards`의 선택 필드로 둔다.

- `investment_target`
- `investors`
- `investment_stage`
- `investment_amount`
- `investment_currency`

### 비활성화 후 삭제 검토

| 테이블 | 이유 |
|---|---|
| `information_value_rule_versions` | 복잡한 자동 평가가 제품 핵심이 아님 |
| `card_value_assessments` | 사용자 중요 체크로 대체 |
| `card_quality_reviews` | 실사용 중요 체크와 무관 |
| `companies` | 고정 섹터와 기업 명부를 전제 |
| `company_verifications` | 기업 명부 검증 워크플로에 종속 |
| `research_papers` | 독립 논문 저장소 제외 |
| `merge_candidates` | MVP는 정확 중복 방지로 충분 |

### 주의할 결합

- `worker/pipeline.ts`가 카드 생성 시 정보가치 규칙과 평가값을 직접 생성한다.
- 정보가치 기능을 끌 때 카드 수집 자체가 깨지지 않도록 파이프라인 결합을 먼저
  제거해야 한다.
- 카드 상세는 `card_sources`를 조인한다. 이 테이블을 먼저 제거하면 상세 화면이
  깨진다.
- 비활성 테이블의 외래키가 카드 삭제나 마이그레이션을 막는지 확인해야 한다.

---

## 4. 코드 판정

### 유지

- `src/auth.ts`
- `src/server/auth/*`
- `src/server/db/index.ts`
- `worker/adapters/rss.ts`
- `worker/adapters/kstartup.ts`
- `worker/core/normalize.ts`
- `worker/db.ts`
- `worker/cli.ts`
- `src/app/admin/ingestion`
- `src/app/admin/users`
- `src/lib/cron-auth.ts`
- 기존 인증·정규화·수집·Cron 인증 테스트

### 수정

| 파일·영역 | 필요한 변경 |
|---|---|
| `src/server/db/schema.ts` | 4축 카드와 최소 지식 관리 스키마 추가 |
| `worker/pipeline.ts` | 정보가치 계산 결합 제거, 카드 유형 저장 |
| `worker/sources.ts` | 소스별 기본 카드 유형 정의 |
| `src/app/today/page.tsx` | 과도한 지표·관리 링크 제거, 4축 카드와 경제 현황 중심 재구성 |
| `src/app/cards/page.tsx` | `/archive` 검색·필터 기반으로 전환 |
| `src/app/cards/[id]/page.tsx` | 정보가치 표시 제거, 중요 체크·메모·묶음 추가 |
| `src/app/api/cron/indicators/route.ts` | 생태계 지표 대신 실제 시장·거시지표 수집으로 교체 |
| `vercel.json` | 새 카드 수집 Cron과 경제지표 Cron 확정 |

### 비활성화

- `src/app/admin/companies`
- `src/app/admin/quality`
- `src/app/papers`
- `src/components/company-review-form.tsx`
- `src/components/card-quality-form.tsx`
- `scripts/refresh-ecosystem-indicators.ts`
- `worker/indicators/arxiv.ts`
- `worker/indicators/openalex.ts`
- 오늘 화면의 기업 수·논문 수·정보가치 UI
- `worker:refresh-indicators`, `worker:backfill-value` 운영 명령

### 즉시 삭제하지 않음

- 위 비활성 코드
- 기존 마이그레이션
- 기존 운영 데이터
- 기존 테이블 정의

기존 이력을 재현할 수 있어야 하므로 과거 마이그레이션 파일은 삭제하지 않는다.

---

## 5. PRD v0.3 대비 구현 공백

| PRD 기능 | 현재 상태 | 작업 규모 |
|---|---|---|
| 기업·기술·정책·투자 유형 | 없음 | 중 |
| 소스별 기본 유형 | 없음 | 소 |
| 관리자 유형 교정 | 없음 | 소 |
| 중요 체크 | 없음 | 중 |
| 사용자별 카드당 메모 | 없음 | 중 |
| 단순 묶음 | 없음 | 중 |
| `/archive` 검색·필터 | 없음 | 중 |
| `/dashboard` | 없음 | 중 |
| 시장·거시 5개 지표 실제 수집 | 없음 | 중~대 |
| 카드 자동 수집 Cron | `vercel.json`에 없음 | 소~중 |
| 기업 정보 소스 | Platum 일부 충족 | 보강 필요 |
| 정책 정보 소스 | K-Startup 일부 충족 | 보강 필요 |
| 투자 정보 소스 | Platum 일부 충족 | 보강 필요 |
| 기술 정보 소스 | 카드 소스 없음 | 보강 필요 |

---

## 6. 위험과 방지책

### 위험 1 — 화면만 숨기고 파이프라인 결합을 남김

정보가치 UI를 숨겨도 `worker/pipeline.ts`는 계속 규칙과 평가 데이터를 만든다.

방지:

1. 카드 수집 테스트를 먼저 보존한다.
2. 정보가치 계산을 파이프라인에서 분리한다.
3. 동일 소스를 3회 수집해 카드 중복과 오류를 확인한다.

### 위험 2 — 경제 대시보드가 다시 과도해짐

현재 Cron은 경제지표가 아니라 기업 수와 논문 수를 계산한다.

방지:

- 1차 지표 5개만 구현한다.
- 복잡한 그래프와 예측을 추가하지 않는다.
- 공급자·기준일·출처·마지막 수집 상태부터 완성한다.

### 위험 3 — 투자 유형과 기업 유형 중복

투자유치 기사는 기업 정보이면서 투자 정보일 수 있다.

방지:

- MVP에서는 대표 유형 하나만 저장한다.
- 투자·펀드·출자·M&A·지분투자는 `investment`를 우선한다.
- 복수 유형과 자동 분류는 후속으로 둔다.

### 위험 4 — 비활성 기능을 너무 일찍 삭제

DB 데이터와 기존 외래키 때문에 롤백과 마이그레이션이 어려워질 수 있다.

방지:

- UI·라우트·Cron부터 비활성화한다.
- 테이블은 deprecated로 표시한다.
- 새 흐름이 검증된 뒤 별도 삭제 마이그레이션을 작성한다.

---

## 7. 다음 구현 절차

코드 감사 이후의 작업은 다음 순서로 제한한다.

1. 이 판정표 사용자 승인
2. PRD v0.3 문서와 감사 문서 커밋
3. Git `main` 통합 방식 결정
4. 과도한 UI·라우트·Cron 비활성화
5. 카드 4축과 소스 기본 유형 구현
6. 중요 체크·메모·묶음 구현
7. `/archive` 검색·필터 구현
8. 5개 경제지표 공급자 확정 및 `/dashboard` 구현
9. 기업·기술·정책·투자 소스 보강
10. 통합 테스트 후 커밋·푸시·배포

각 단계는 테스트와 사용자 확인을 통과하기 전 다음 단계로 넘어가지 않는다.

---

## 8. 이번 감사에서 하지 않은 일

- 코드 변경
- DB 마이그레이션
- 라우트 비활성화
- Cron 변경
- 데이터 삭제
- Git 브랜치 통합
- 배포

이 문서는 다음 구현에서 불필요한 재작업을 막기 위한 기준표다.
