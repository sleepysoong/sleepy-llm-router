# Installation and Setup

English | [한국어](./INSTALLATION.ko.md) | [简体中文](./INSTALLATION.zh-CN.md) | [繁體中文](./INSTALLATION.zh-TW.md) | [日本語](./INSTALLATION.ja.md)

This document covers installing `sleepy-llm-router` (`slr`), configuring provider keys, setting up models, running the local proxy, and connecting clients. For the project's purpose and motivation, see [README.md](../README.md).

## 1. Install

```bash
npm install -g sleepy-llm-router
```

The package does **not** auto-start a background process during install. Start it explicitly when you want it running.

Requires Node.js 20 or newer.

## 2. Configure provider API keys

`slr` reads provider keys in this order:

1. `OPENROUTER_API_KEY` / `NVIDIA_API_KEY` from the process or global environment
2. `~/.sleepy-llm-router/.env`

Example `~/.sleepy-llm-router/.env`:

```bash
OPENROUTER_API_KEY=sk-or-...
NVIDIA_API_KEY=nvapi-...
```

Only the providers whose keys are present are used.

## 3. Configure models

`slr` only routes to models listed in the `selectedModelIds` array in the config file (`~/.sleepy-llm-router/config.json`). You can edit this file manually or manage the model list through the configuration API.

## 4. Start the local proxy

```bash
slr start
```

Starts the proxy in the foreground with request/response routing logs. Stop it with `Ctrl+C`.

Default port is `4567`. Override it when needed.

```bash
slr start --port 4600    # Start the proxy on port 4600
```

## 5. Connect clients

### OpenAI-compatible clients

Configure OpenCode, Hermes Agent, OpenClaw, or any other OpenAI-compatible client with:

```text
baseURL=http://localhost:4567/v1
```

Required endpoints:

- `GET /v1/models`
- `POST /v1/chat/completions`

### Anthropic-compatible clients (Claude Code)

Set:

```bash
export ANTHROPIC_BASE_URL=http://localhost:4567/anthropic
export ANTHROPIC_AUTH_TOKEN=slr-local
export ANTHROPIC_API_KEY=
```

Required endpoints:

- `POST /anthropic/v1/messages`
- `POST /anthropic/messages` (alias)
- `POST /anthropic/v1/messages/count_tokens`
- `POST /anthropic/messages/count_tokens` (alias)

`slr` accepts the local Anthropic auth header and forwards requests with the matching provider key. If the provider exposes its own Anthropic-compatible endpoint (e.g. OpenRouter's Anthropic surface), `slr` uses it directly; otherwise it falls back to Anthropic/OpenAI translation for text and common client tool-use flows. Token counting returns a local compatibility estimate, not an exact provider tokenizer count.

## 6. Diagnostics

| Command | Use |
| --- | --- |
| `slr doctor` | Report config paths, provider key sources, selected models, and cache size. |
| `slr usage` | Show per-model request counts and token totals when available. |
| `slr usage --json` | Print usage observations as JSON. |

`doctor` does not modify settings. Streaming requests are counted by `usage`, but token totals are usually unavailable from the stream passthrough.

## 7. Routing rules

- Models listed in the config file's `selectedModelIds` array are routed in that order.
- If a request names a selected model, `slr` routes to it directly. Provider-prefixed local model names also resolve to the matching upstream model id.
- Group model names (`slr/fast`, `slr/balanced`, `slr/capable`, plus `haiku`/`sonnet`/`opus`) route only within the configured group when that group has selected models; empty groups fall back to the full selected list.

## 8. Development

Use these commands to work on `slr` itself.

| Command | Use |
| --- | --- |
| `git clone https://github.com/sleepysoong/sleepy-llm-router` | Clone the repository. |
| `cd sleepy-llm-router` | Enter the project directory. |
| `npm install` | Install dependencies. |
| `npm test` | Run the test suite. |
| `npm run typecheck` | Run TypeScript type checking. |
| `npm run build` | Build `dist`. |
