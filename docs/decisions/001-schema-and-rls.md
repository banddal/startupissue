# 001 — 스키마 1차 확정과 RLS 정책

작성일 2026-07-24 · Sprint 0 · 상태: 확정

---

## 결정 사항

### 테이블 구성

Phase 1에 필요한 최소 테이블만 생성한다. Phase 2 이후 기능(리포트, 답글, 지표)의 테이블은 만들지 않되, 나중에 추가할 때 기존 테이블을 변경하지 않아도 되도록 컬럼을 설계한다.

| 테이블 | 역할 |
|---|---|
| `profiles` | 사용자. auth.users와 1:1 |
| `sectors` | 섹터. Phase 1에서는 기본 행 1개만 사용 |
| `companies` | 명부 |
| `company_verifications` | 명부 확인 경로 이력 |
| `raw_items` | L0 원천 데이터 |
| `cards` | L2 카드 |
| `card_sources` | 카드-원천 다대다 (중복 병합용) |
| `bundles` | L3 묶음 |
| `bundle_cards` | 묶음-카드 다대다 |
| `ingestion_runs` | 수집 실행 이력 |
| `ai_runs` | AI 호출 이력 |

### 사용자 상태와 역할

- `status`: `pending` → `active` / `rejected` / `suspended`
- `role`: `admin` / `member`

신규 가입자는 트리거로 `pending` + `member`로 자동 생성된다. 관리자가 승인하면 `active`가 된다. 사용자가 늘어도 코드 수정이나 배포가 필요 없다.

### 카드의 ring 판정

`ring`은 소스가 아니라 **명부 매칭 결과**로 결정한다.

- `0`: 명부 기업에 매칭됨
- `1`: 자본·제도 (정부 공고 등)
- `2`: 기술 기반 (Phase 1.5)
- `3`: 산업·시장

Phase 1에서 3환은 저장하되 기본 목록에서 제외한다(별도 관리자 승인 절차 없음).

### 정보가치 점수

`cards.score`에 정수로 저장하고 `score_breakdown jsonb`에 항목별 기여도를 남긴다. Phase 1에서 breakdown은 저장만 하고 UI에 노출하지 않는다(디버깅용).

가중치는 워커 코드의 상수로 관리한다. 설정 테이블과 재계산 배치는 만들지 않는다.

### 카드 숨기기

`cards.hidden boolean`으로 처리한다. 검토 큐 없이, 사용자가 목록에서 바로 숨긴다.

---

## 불변조건

1. **`pending` 상태 사용자는 어떤 업무 데이터에도 접근할 수 없다.** 본인 `profiles` 행만 조회 가능.
2. **`raw_items`는 일반 사용자에게 노출되지 않는다.** admin만 조회 가능.
3. **웹 애플리케이션은 `service_role` 키를 사용하지 않는다.** 워커 프로세스에만 존재한다.
4. **`raw_items`의 `(source_key, external_id)`는 유일하다.** 수집 멱등성의 기반.
5. **`bundles`는 작성자만 수정·삭제할 수 있고, 조회는 `active` 사용자 전원에게 열려 있다.** (전면 공개 모델)
6. **`cards.published_on`은 date 타입이다.** 분기 라벨은 뷰나 생성 컬럼으로 파생하며 문자열로 저장하지 않는다.
7. **모든 테이블은 RLS가 활성화되어 있다.** 예외 없음.

---

## 수용 기준

| 항목 | 확인 방법 |
|---|---|
| pending 차단 | pending 계정 토큰으로 `cards`, `companies`, `bundles` 조회 시 0행 |
| 본인 프로필 조회 | pending 계정이 자신의 `profiles` 행은 조회 가능 |
| raw_items 격리 | member 계정으로 `raw_items` 조회 시 0행, admin은 조회 가능 |
| 멱등성 제약 | 동일 `(source_key, external_id)` 두 번 insert 시 두 번째는 충돌 |
| 묶음 권한 | 타인의 `bundles` 행을 update 시도하면 실패, select는 성공 |
| service_role 격리 | `src/` 하위 grep에서 `service_role` 참조 0건 |
| 신규 가입 자동 생성 | Google 로그인 직후 `profiles`에 `pending` 행이 생성됨 |

---

## 명시적 비목표

이번 결정에 **포함하지 않는 것**. 필요해지면 별도 결정 문서로 다룬다.

- 리포트, 답글, 지표 관련 테이블
- 벡터 임베딩 컬럼 (Phase 2에서 nullable 컬럼으로 추가)
- 검토 큐, merge_candidates 테이블
- 가중치 설정 테이블
- 다중 섹터 테넌시 (컬럼은 두되 로직은 단일 섹터 가정)
- 감사 로그, 활동 로그
- 소프트 삭제 정책

---

## 참고

- Supabase의 `auth.users`는 직접 수정하지 않는다. 모든 사용자 속성은 `profiles`에 둔다.
- RLS 정책에서 역할을 확인할 때 `profiles`를 재귀 참조하면 무한 루프가 발생하므로, `security definer` 헬퍼 함수를 사용한다.
