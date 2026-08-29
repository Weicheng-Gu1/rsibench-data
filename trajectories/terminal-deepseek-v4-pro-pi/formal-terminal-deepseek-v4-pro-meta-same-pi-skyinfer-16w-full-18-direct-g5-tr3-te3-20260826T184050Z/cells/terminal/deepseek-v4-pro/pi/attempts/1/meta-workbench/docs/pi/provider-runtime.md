# PI_SRC_PROVIDER_RUNTIME — Provider Request and Stream Runtime

## What this module is

The wire-protocol layer for talking to Anthropic and OpenAI. Owned files:
`packages/ai/src/api/anthropic-messages.ts`,
`packages/ai/src/api/constrained-sampling.ts`,
`packages/ai/src/api/openai-completions.ts`,
`packages/ai/src/api/openai-responses.ts`,
`packages/ai/src/api/openai-responses-shared.ts`,
`packages/ai/src/api/simple-options.ts`,
`packages/ai/src/api/transform-messages.ts`,
`packages/ai/src/utils/error-body.ts`,
`packages/ai/src/utils/event-stream.ts`,
`packages/ai/src/utils/json-parse.ts`, and
`packages/ai/src/utils/provider-retry.ts`. Core-source —
`requires_core_rebuild = true`.

## How it affects runtime behavior

This is the last step before a request leaves the process and the first
step after a response arrives: serializing parameters (including reasoning
budget), parsing streamed events, tool calls, usage, finish reasons, and
retry/error handling on the wire. A correct context that reaches this
boundary can still be transformed incorrectly here — a parameter silently
dropped in serialization, a streamed tool call misparsed, a retry policy
that doesn't actually retry.

## How to edit it well

Choose PI_SRC_PROVIDER_RUNTIME when request parameters (such as reasoning
budget) are not serialized or honored, or when stream events, tool calls,
usage, finish reasons, retries, or provider errors are parsed incorrectly —
i.e. when a correct context reaches the provider boundary but is
transformed incorrectly on the wire.

Inspect `packages/ai/src/api/openai-completions.ts`,
`packages/ai/src/api/anthropic-messages.ts`,
`packages/ai/src/api/simple-options.ts`, and
`packages/ai/src/api/transform-messages.ts` first. Add protocol-level
fixtures for the exact malformed/edge-case payload you're fixing, and
verify you have not broken the other provider while fixing one — this
module covers both Anthropic and OpenAI paths.

## Constraints

Model catalogs, provider registration, credentials, endpoint routing, lazy
entry wrappers (`*.lazy.ts`, `packages/ai/src/api/lazy.ts`), and experiment
model choice remain frozen — this module is the transport and parsing logic
around a fixed set of registered providers, not the provider selection
itself.

## How to verify

Add protocol fixtures reproducing the exact wire-level defect, confirm other
providers are unaffected, run the targeted checks (`provider-request`,
`provider-stream`, `tool-call-parsing`, `reasoning-budget`), then run the
mandatory clean rebuild and Pi CLI smoke via `candidate_check.py --agent pi
--source <path>` before submission.
