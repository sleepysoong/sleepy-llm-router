# sleepy-llm-router

English | [한국어](./docs/README.ko.md)

`sleepy-llm-router` (`slr`) is a local proxy that routes your coding agent to free models across providers. Point your OpenAI- or Anthropic-compatible agent at `localhost`, configure a few free models, and `slr` keeps requests flowing as rate limits and quotas shift underneath.

## Why this exists

Free-tier coding agents look great on paper and break in practice. A few things go wrong:

**Rate limits stop your work mid-task.** Free models on OpenRouter or NVIDIA hit 429 unpredictably. A clean run becomes a stalled tool call, and you have to retry by hand.

**Quotas force manual provider swapping.** When one provider's free quota runs out, you're manually swapping keys and base URLs. Your agent doesn't adapt.

**The free catalog churns.** Models appear, disappear, get deprecated, or quietly start returning errors.

## What slr does about it

You give `slr` an allowlist of free models you actually want to use. It runs as a local proxy on `http://localhost:4567` and handles these jobs internally.

| Job | What happens |
| --- | --- |
| Request routing | Routes requests to models in your configured order. |
| Client compatibility | Exposes OpenAI-compatible `/v1` and Anthropic-compatible `/anthropic` surfaces, including Anthropic tool-use fallback and local token counting. |

Your agent points at `localhost`. Provider switching happens transparently below.

## Get API keys

`slr` only forwards traffic. You bring keys from one or both providers.

**OpenRouter** — sign up at [openrouter.ai](https://openrouter.ai), then issue a key under Keys (prefix `sk-or-`). Free `:free` models cap at 50 requests/day; topping up at least $10 in credits raises the cap to 1,000/day. No credit card needed for the free cap.

**NVIDIA** — sign up at [build.nvidia.com](https://build.nvidia.com) (NVIDIA Developer Program), then click "Get API Key" on any model card (prefix `nvapi-`). No credit card needed; rate limits apply per model.

Add whichever you have to `~/.sleepy-llm-router/.env` — `slr` only uses providers whose key is set.

## 30-second try-it

```bash
npm install -g sleepy-llm-router
mkdir -p ~/.sleepy-llm-router && echo 'OPENROUTER_API_KEY=sk-or-...' > ~/.sleepy-llm-router/.env
slr start        # serves http://localhost:4567
```

## Common commands

| Command | Use |
| --- | --- |
| `slr start` | Run the local proxy in the foreground with request/response routing logs. |
| `slr status` | Show config and selected model status. |
| `slr doctor` | Inspect config paths, keys, and model cache status. |
| `slr usage` | Show per-model request and token observations. |

## Use it from your agent

OpenAI-compatible clients (OpenCode, Hermes Agent, OpenClaw, etc.):

```text
baseURL=http://localhost:4567/v1
```

Anthropic-compatible clients (Claude Code, etc.):

```bash
export ANTHROPIC_BASE_URL=http://localhost:4567/anthropic
export ANTHROPIC_AUTH_TOKEN=slr-local
export ANTHROPIC_API_KEY=
```

For Claude Code, you can create a shell alias that routes Opus, Sonnet, and Haiku requests to `slr` groups:

```bash
alias freeclaude='ANTHROPIC_BASE_URL=http://localhost:4567/anthropic ANTHROPIC_AUTH_TOKEN=slr-local ANTHROPIC_API_KEY= CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 ANTHROPIC_DEFAULT_OPUS_MODEL=slr/capable ANTHROPIC_DEFAULT_SONNET_MODEL=slr/balanced ANTHROPIC_DEFAULT_HAIKU_MODEL=slr/fast claude'
```

The bare `slr` model routes across the entire selected pool, while `slr/capable`, `slr/balanced`, and `slr/fast` filter to the matching model groups. The Claude-style aliases `opus`, `sonnet`, and `haiku` are equivalent to those same groups.

The Anthropic surface also supports local `count_tokens` estimates and translates common tool-use/tool-result flows when a request falls back to an OpenAI-compatible provider route.

## Keep context sizes consistent

`slr` forwards each request to the routed model. It does not compact, summarize, or truncate the agent's accumulated conversation, so context-window errors are still possible. If a long session starts on a 1M-token model and later routes or fails over to a 128k or 200k model, the smaller model can reject the request once the prompt exceeds its context window.

When selecting models, keep each model group in the same context tier. For example, use only ~1M-token models in `capable` if you run long sessions there, or keep all `fast`, `balanced`, and `capable` groups within the 128k-200k tier. You can check each model's context size with `slr status`.

## More

- Setup, all CLI flags, diagnostics: [INSTALLATION.md](./docs/INSTALLATION.md)
- Routing internals: [docs/latency-routing.md](./docs/latency-routing.md)
- Provider catalog: [docs/provider-guide.md](./docs/provider-guide.md)
- License: [MIT](./LICENSE.md)
