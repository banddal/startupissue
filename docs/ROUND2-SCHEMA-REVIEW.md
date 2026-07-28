# Round 2 스키마 리뷰 요청

작성: Codex · 2026-07-27

## 범위

Round 2 수집 파이프라인의 DB 경계만 구현했다. 어댑터, 워커, 화면은 아직 시작하지 않았다.

- `sources`
- `source_items`
- `cards`
- `ingestion_runs`
- `processing_attempts`
- `card_sources`
- `merge_candidates`
- `pg_trgm`

## 반드시 확인할 불변조건

1. 같은 소스의 재수집은 아래 우선순위에 따라 DB 부분 unique 인덱스로 막는다.
   - `source_id + external_id`
   - external ID가 없을 때 `source_id + url_hash`
   - external ID와 URL이 없을 때 `source_id + title_hash`
2. 같은 소스에서 `running` 상태의 실행은 하나만 존재할 수 있다.
3. 한 카드의 대표 출처는 하나만 존재할 수 있다.
4. 병합 후보는 기록만 하며 자동 병합하지 않는다.
5. 원문 HTML/PDF는 저장하지 않는다. `raw_payload`와 정제된 본문을 저장한다.

## 구현 중 명확히 한 사항

- fetch 결과를 먼저 기록하고 normalize 실패를 격리할 수 있도록 `source_items`의 정규화 결과 컬럼은 nullable로 두었다.
- 발표일이 없는 경우 수집일 대체 여부를 보존하기 위해 `published_at_inferred`를 추가했다.
- 동시 수집 방지는 `ingestion_runs_one_running_per_source` 부분 unique 인덱스로 강제했다.
- 본문 500KB 제한 여부는 `cards.body_truncated`에 보존한다.

## 리뷰 요청

- 부분 unique 인덱스의 조건이 3단 폴백 규칙과 정확히 일치하는지
- nullable 정규화 컬럼과 상태 전이가 모순 없는지
- FK 삭제 정책이 원천 추적성을 훼손하지 않는지
- Round 3 병합 기능을 추가할 때 스키마 변경 없이 확장 가능한지
- `pg_trgm`을 대상 Neon 프로젝트에서 활성화할 수 있는지

## 검증 결과

- ESLint 통과
- TypeScript 통과
- 기존 Vitest 7개 통과
- 실제 Neon 마이그레이션은 `DATABASE_URL` 제공 후 검증 필요

## Claude 리뷰 반영

2026-07-27 조건부 통과 리뷰의 P0 두 건을 반영했다.

- 병합 후보 UUID 정렬 CHECK 추가
- 대표 source item FK를 `ON DELETE RESTRICT`로 통일
- 처리 시도 identity unique 추가 (nullable source item은 nil UUID로 정규화)
- 웹 DB 클라이언트 변수명을 `neonClient`로 명확화

P1-4의 배타적 폴백은 PRD의 부분 unique 정의를 정본으로 유지한다. 판단 근거와 워커 DB
연결 분리 결정은 `docs/decisions/003-round2-ingestion.md`에 기록했다.
