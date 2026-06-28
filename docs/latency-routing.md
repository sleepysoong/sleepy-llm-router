# 라우팅

라우팅 로직, 후보 순서 지정, 요청 대체 동작에 이 경로를 사용하세요.

## 라우팅 규칙

요청된 모델 이름에 따라 다음 순서로 처리해요:

1. **등록된 그룹 이름** → 해당 그룹의 모델을 순서대로 시도해요.
2. **모델 ID** (그룹에 포함된 것) → 해당 모델을 직접 사용하고, 실패하면 같은 그룹의 나머지를 시도해요.
3. **그 외 전부** (알 수 없는 이름, `auto`, 빈 문자열 등) → `defaultGroup`으로 라우팅해요.

```
 요청              → 처리
──────────────────────────────────────
 "A"               → 그룹 A의 모델 순서대로
 "slr/A"           → slr/ 제거 후 → 그룹 A
 "deepseek-v4-pro" → 해당 모델 직접 → 같은 그룹 fallback
 "auto"            → defaultGroup
 ""                → defaultGroup
```

- `slr/` 접두사는 매칭 전에 제거돼요 (예: `slr/coding` → 그룹 `coding`).
- 레거시 별칭 `haiku`→`fast`, `sonnet`→`balanced`, `opus`→`capable`은 여전히 지원돼요.
- `defaultGroup`이 없으면 첫 번째 그룹이 기본값이에요.

## 소스

- 라우터: `src/latency/router.ts`
- 테스트: `test/router.test.ts`
