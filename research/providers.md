# Provider Research

Update this page when provider credentials, endpoints, model metadata, supported providers, or provider tests change.

## Current local anchors

- Implementation: `src/providers/openrouter.ts`, `src/providers/nvidia.ts`, `src/providers/catalog.ts` (multi-provider aggregation entry point), `src/providers/types.ts`
- Tests: `test/openrouter.test.ts`, `test/nvidia.test.ts`, provider-related coverage in `test/server.test.ts`, `test/model-command.test.ts`, and `test/probe.test.ts`
- Product docs: `README.md` sections “API key”, “Select models”, and “0.0.1 limitations”

## Current findings

- The package supports OpenRouter and NVIDIA chat model adapters in version `0.0.1`.
- API-key lookup is documented as provider-specific process/global environment variables, then `~/.oh-my-free-models/.env`.
- Provider work should preserve OpenAI-compatible and Anthropic-compatible proxy behavior unless the task explicitly changes compatibility.
- OpenRouter rows without explicit `source` metadata should continue to route through OpenRouter, even when a model ID contains a provider-like prefix.
- NVIDIA rows use local `nvidia/` IDs and preserve upstream IDs for provider API calls.
- Model catalog cache entries are fresh for 5 minutes. Fresh caches avoid repeated provider list requests; stale caches trigger provider refresh and remain available only as a fallback when refresh fails.

## Open questions

- What provider-specific rate limits, auth headers, streaming modes, and model-list formats affect compatibility?
- Which smoke tests prove new provider support without regressing existing providers?

## Provider-change checklist

1. Update this research page with provider facts and credential assumptions.
2. Update `docs/provider-guide.md` with navigation or verification changes.
3. Add or adjust provider tests before implementation behavior changes.
4. Run `npm test`, `npm run typecheck`, and `npm run build`.
5. Record durable tradeoffs in `research/decisions/` when changing provider boundaries.
