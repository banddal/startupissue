# 003 — Round 2 수집 불변조건과 워커 DB 연결

상태: 승인

일자: 2026-07-27

## 결정

### 원천 삭제

`source_items`는 수집 근거이므로 카드나 출처 연결이 존재하는 동안 삭제할 수 없다.

- `cards.primary_source_item_id`: `ON DELETE RESTRICT`
- `card_sources.source_item_id`: `ON DELETE RESTRICT`

보존 기간 정책이 필요해지기 전까지 물리 삭제 기능을 만들지 않는다.

### 병합 후보 순서

병합 후보는 무방향 쌍이다. 삽입 전에 UUID를 오름차순으로 정렬하고 DB의
`merge_candidates_ordered` CHECK와 pair unique 인덱스로 `(A, B)`와 `(B, A)` 중복을 막는다.

### 3단 멱등 키

PRD와 Round 2 계획서의 부분 unique 인덱스 정의를 유지한다.

1. `external_id`가 있으면 그것을 신뢰한다.
2. 없으면 정규 URL 해시를 사용한다.
3. 둘 다 없으면 정규 제목과 발표일 해시를 사용한다.

각 항목은 하나의 대표 멱등 키만 사용한다. 외부 ID가 바뀌었지만 URL이 같은 정정 공고는
본문 해시와 정정 관계를 확인해야 하므로 워커에서 관측·기록하되, DB의 배타적 멱등 제약을
임의로 바꾸지 않는다. 실제 소스 표본에서 이 사례가 확인되면 unique 제약 변경에 대한
별도 결정을 요청한다.

### 처리 시도 식별

`(run_id, coalesce(source_item_id, nil UUID), stage, attempt_no)`를 unique 인덱스로 묶는다.
따라서 source item이 아직 없는 fetch 실패도 동일 실행·단계·시도 번호로 중복 기록되지 않는다.

### DB 연결 분리

- 웹/BFF는 단발 쿼리에 적합한 `drizzle-orm/neon-http`를 유지한다.
- 워커는 트랜잭션 가능한 별도 연결 모듈을 사용한다.
- 카드화는 source item 갱신, 카드 생성, 대표 출처 연결을 한 트랜잭션으로 묶는다.

워커 연결은 `@neondatabase/serverless`의 Pool과 `drizzle-orm/neon-serverless` 조합을 기본으로
한다. Node 20 호환을 위해 WebSocket 구현을 명시적으로 주입한다.

### Round 2 카드 노출

Round 2에는 승인 UI가 없으므로 `/cards`는 `pending_review` 카드도 승인된 내부 사용자에게
표시한다. `hidden`과 `merged_into` 카드는 제외한다.

### 빈 요약

AI 요약 전에는 정제 본문 앞부분을 요약으로 사용한다. 본문 발췌가 비어 있으면 제목으로
대체해 `cards.summary`의 non-null 불변조건을 유지한다.
