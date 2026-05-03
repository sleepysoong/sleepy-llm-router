# Research Index

Update the relevant research page when provider, latency, or client compatibility behavior changes, or when a durable tradeoff needs a decision record.

| Topic | Research page | Primary docs route | When to update |
| --- | --- | --- | --- |
| Providers and model sources | [providers.md](providers.md) | `docs/provider-guide.md` | Adding or changing provider behavior, credentials, model metadata, or provider assumptions. |
| Latency routing and probes | [latency-routing.md](latency-routing.md) | `docs/latency-routing.md` | Changing route selection, probe pacing, cache behavior, or quota handling. |
| Client compatibility | [client-compatibility.md](client-compatibility.md) | `docs/client-compatibility.md` | Changing OpenAI-compatible or Anthropic-compatible endpoint behavior. |
| Decision records | [decisions/README.md](decisions/README.md) | `docs/index.md` | Durable tradeoffs that future agents should not re-litigate. |

## Research rules

- Prefer primary source links and local test evidence when available.
- Separate observed behavior from planned behavior.
- Promote durable conclusions into the matching `docs/` route.
- Use ADR-lite records in `research/decisions/` for tradeoffs with rejected alternatives.
- Name decision files `YYYY-MM-DD-short-title.md`; include context, decision, alternatives, owner, and verification.
