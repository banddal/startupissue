# 008 — 상황판 지표 계약 v1

상태: 승인

일자: 2026-08-01

## 결정

상황판 v1은 지표 정의와 기간별 값을 분리한다.

- `indicators`: 코드, 표시명, 단위, 지표군, 갱신 주기, 소스 설정
- `indicator_values`: period, 값, 이전 값, 증감, 상태, 출처·기준 시각
- 동일 `(indicator_id, period)`는 하나만 존재하며 재수집 시 갱신한다.
- period 키는 연 `YYYY`, 월 `YYYYMmm`, 분기 `YYYYQq` 형식이다.
  - 예: `2026`, `2026M07`, `2026Q3`
- 두 자리 연도는 해석 모호성을 막기 위해 허용하지 않는다.
- 기간 시작·종료일은 UTC 날짜로 함께 저장해 키 파싱에 의존하지 않는 조회를 지원한다.
- `available`과 `estimated`는 값이 필수이며 `unavailable`은 값이 없어야 한다.
- 실제 `0`은 available 값 0이고, 데이터 없음은 unavailable 또는 값 행 부재다.
- 전기 값이 없으면 증감도 null로 유지한다.

## 초기 지표 정의

- `ecosystem_company_count`
- `ecosystem_venture_investment`
- `ecosystem_new_papers`
- `ecosystem_new_patents`

정의는 먼저 생성하되 승인된 산출 기준과 소스가 없으면 값 행을 만들지 않는다.

## 보류

- 첫 섹터와 지표별 검색 쿼리
- 벤처투자 공식 소스와 금액 단위
- 사용자별 표시 순서
- 시장·거시 지표와 그래프
