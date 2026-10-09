# The Vercel AI SDK, versions 5 and 7, for graphty's assistant

Written 2026-10-08 against master. Compares the npm package `ai` (the Vercel AI SDK) at version 5,
which graphty-element uses today, with version 7, the current release. It covers what changed in
between (including version 6), how agents are tested on version 7, and whether and how graphty
should move. Every claim about behavior was checked against the published packages; the ones
marked "ran" were executed in a scratch project, whose script and output are quoted in section 5.

## 1. Summary

**Recommendation: stay on `ai` 5 for now, and do three small things on 5 that make a later move
to 7 cheap. Upgrade, keeping graphty's own loop, when one of the triggers in section 9 fires.
Do not replace graphty's controller with the SDK's `ToolLoopAgent`.**

The evidence:

- **Version 5 already has the loop features graphty would use.** `ai` 5.0.273 exports
  `stepCountIs`, `hasToolCall`, `prepareStep`, `activeTools`, `pruneMessages`,
  `experimental_repairToolCall` and `Experimental_Agent` (ran, section 5). The things only 6 or 7
  have are tool approvals (6), signed approvals (7), tool search (7) and per-call approval
  policies (7). graphty needs none of these yet. Every assistant message is already one undo
  step, which covers most of what an approval prompt would protect against.
- **Version 7 costs 48 to 102 kB more in the browser.** Measured with esbuild, minified and
  gzipped, against zod 3.25.76: the loop alone is the same size on both (107 kB versus 106 kB).
  With the Anthropic provider it is 171 kB on 7 versus 123 kB on 5. With all three providers
  graphty ships (OpenAI, Anthropic, Google) it is 255 kB versus 152 kB. The version 7 provider
  packages are about twice the size of the version 5 ones.
- **The upgrade itself is small, and it is not the risky part.** Kept as graphty's own loop,
  version 7 needs two code changes in `VercelAiProvider` (the system prompt moves out of the
  message list, and `fullStream` is renamed) plus new provider versions. The message shapes
  graphty builds today pass through version 7 unchanged (ran). zod stays at 3: version 7 accepts
  graphty's zod 3 schemas, including `.transform` and `.default` (ran).
- **The cost that matters is the release, not the code.** `ai` and `@ai-sdk/*` are optional peer
  dependencies of graphty-element. Moving their ranges from `^5` / `^2` to `^7` / `^4` breaks
  every consumer who installed the old ones, so the upgrade is a graphty-element major release
  and should ride with the next planned major, not get one of its own.
- **The in-page model and the test mock do not need graphty's loop as their seam.** A fake
  in-page engine wrapped as a version 7 model ran a full tool loop in about 60 lines, and the
  SDK's mock model drove multi-step loops, streaming and approvals (all ran). Better still, a
  model written to version 5's specification still runs under version 7 (ran), so that work can
  start now and survive the upgrade.
- **The in-page model is the one place where version 7 could pay for itself.** None of the five
  WebLLM models graphty offers can call tools today, because WebLLM accepts native tools only for
  its Hermes models (section 7). The community provider `@browser-ai/web-llm` gets around that by
  describing the tools in the prompt and parsing the model's fenced JSON itself, for any WebLLM
  model. Its maintained line needs `ai` 7; the one release for `ai` 5 does the same thing but has
  not been updated since 2026-01-23. If graphty revives the in-page model by adopting that
  package, upgrade first.

## 2. What graphty uses today

graphty-element's assistant lives in `graphty-element/src/ai/`, behind the
`@graphty/graphty-element/ai` entry point, loaded on demand. Its dependency on the SDK is narrow:

| Where                                        | What it uses from the SDK                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers/VercelAiProvider.ts`              | `generateText` (one model call, tools without `execute`, `toolChoice` `"auto"` or `"none"`), `streamText` and its `fullStream` events (`text-delta`, `tool-call`, `tool-result`, `error`), `ModelMessage` with a `system` message first, tool results as `{ type: "text", value }`, `usage.inputTokens` / `outputTokens`, `createOpenAI`, `createAnthropic`, `createGoogleGenerativeAI` |
| `AiController.ts`                            | Nothing from the SDK. It runs graphty's own loop over graphty's `LlmProvider` interface: up to 5 model calls per message, then a forced text-only answer; each message is one session transaction (one undo step); a tool that fails stops the rest; results are cut at 8,000 characters                                                                                                |
| `providers/WebLlmProvider.ts`                | Nothing from the SDK. It calls WebLLM's OpenAI-style engine directly                                                                                                                                                                                                                                                                                                                    |
| `providers/MockLlmProvider.ts`               | Nothing from the SDK. It returns canned graphty `LlmResponse`s keyed on the user's text                                                                                                                                                                                                                                                                                                 |
| `test/helpers/llm-regression-harness.ts`     | `APICallError` and `RetryError` (to decide whether to retry), and a subclass of `VercelAiProvider` that records every tool call. It runs about 100 cases against Google's model                                                                                                                                                                                                         |
| `test/ai/providers/VercelAiProvider.test.ts` | `vi.mock("ai", ...)` to replace `generateText`                                                                                                                                                                                                                                                                                                                                          |
| The graphty app                              | Nothing from the SDK. It uses the element's `./ai` entry point only                                                                                                                                                                                                                                                                                                                     |

Versions: `graphty-element/package.json` declares `ai` `^5.0.270` and `@ai-sdk/*` `^2.0.x` for
development, and peer ranges `ai` `^5.0.104` and `@ai-sdk/*` `^2.0.x`, all optional. The lockfile
holds `ai` 5.0.271. (Both earlier reports quote 5.0.116: that is a stale `node_modules` in one
checkout, not what the lockfile installs.)

The public API report `graphty-element/api/ai.api.md` contains graphty's own types
(`LlmProvider`, `Message`, `ToolCall`, `LlmResponse`, `MockLlmProvider`, `VercelAiProvider`,
`createProvider`) and no SDK types. That is what makes an SDK upgrade an internal change for
the API, and a breaking change only through the peer ranges.

## 3. What changed: version 5 to 6 to 7

Dates are npm publish dates. "Ran" means checked in the scratch project; "pkg" means read from
the published type declarations; "doc" means the official migration guide.

| Area                                     | v5 (2025-07-31)                                               | v6 (2025-12-22)                                                                     | v7 (2026-06-25)                                                                                                            | Effect on graphty                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Current release                          | 5.0.273 (2026-10-07)                                          | 6.0.302 (2026-10-07)                                                                | 7.0.136 (2026-10-09 UTC)                                                                                                   | v5 still gets patches, but no end-of-support policy is published                                      |
| Provider packages                        | `@ai-sdk/*` 2.x                                               | 3.x                                                                                 | 4.x                                                                                                                        | New versions of all three                                                                             |
| Model specification                      | `LanguageModelV2`                                             | `LanguageModelV3`                                                                   | `LanguageModelV4` (pkg)                                                                                                    | Only matters for a custom model. v7 still runs V2 and V3 models (ran)                                 |
| Finish reason (spec)                     | a string                                                      | `{ unified, raw }`                                                                  | same as v6 (pkg)                                                                                                           | Only inside a custom model                                                                            |
| Usage (spec)                             | flat numbers                                                  | nested `{ total, noCache, cacheRead, ... }`                                         | same as v6 (pkg)                                                                                                           | Only inside a custom model; `result.usage.inputTokens` is still a number (ran)                        |
| System prompt                            | `system` option, or a system message in `messages`            | same                                                                                | `instructions` option; a system message in `messages` is **rejected** unless `allowSystemInMessages: true` (ran, doc)      | **Breaks `VercelAiProvider`**, which sends the system prompt as the first message. A few lines to fix |
| Stream property                          | `fullStream`                                                  | `fullStream`                                                                        | `stream`; `fullStream` kept as a deprecated alias (doc)                                                                    | Rename; works unchanged meanwhile                                                                     |
| Multi-step results                       | `text`, `toolCalls`, `usage` are the last step's              | same                                                                                | cover all steps; the last step is `result.finalStep` (doc)                                                                 | None: graphty makes one model call per `generateText`                                                 |
| Stop conditions                          | `stepCountIs`, `hasToolCall`                                  | same                                                                                | `isStepCount` (old name kept), `isLoopFinished`, `hasToolCall` (pkg)                                                       | Available on v5 already                                                                               |
| Per-step hook                            | `prepareStep`, `activeTools`                                  | same                                                                                | `prepareStep` may return `instructions`; returned values carry to later steps (doc)                                        | Available on v5 already                                                                               |
| Agent class                              | `Experimental_Agent` (stops after 1 step by default)          | `ToolLoopAgent` (default 20 steps), `instructions`, `prepareCall`                   | `ToolLoopAgent`; `Experimental_Agent` kept as an alias; also `WorkflowAgent` (durable) and `HarnessAgent` (doc, blog)      | See section 8                                                                                         |
| Tool approval                            | none                                                          | `needsApproval` on a tool; `tool-approval-request` / `tool-approval-response` parts | per-call `toolApproval` policy (`approved`, `denied`, `user-approval`, `not-applicable`); `needsApproval` deprecated (pkg) | Not needed yet (section 9)                                                                            |
| Signed approvals                         | none                                                          | backported late in 6.x                                                              | `experimental_toolApprovalSecret`: an HMAC over tool name, call id and input; a tampered approval fails (ran)              | Protects a server from a client that edits history. graphty has no server in this path                |
| Tool search                              | none                                                          | none                                                                                | `toolSearch()` (pkg)                                                                                                       | Matters past several dozen tools (section 9)                                                          |
| Tool-call repair                         | `experimental_repairToolCall`                                 | same                                                                                | `repairToolCall`; the experimental name is deprecated (pkg)                                                                | Available on v5 already                                                                               |
| Message pruning                          | `pruneMessages`                                               | same                                                                                | same                                                                                                                       | Available on v5 already                                                                               |
| Tool context                             | `experimental_context`                                        | same                                                                                | typed per-tool `context` plus `runtimeContext` (doc)                                                                       | graphty passes its context through its own loop                                                       |
| Structured output                        | `generateObject`                                              | `output: Output.object(...)`; `generateObject` deprecated                           | `experimental_output` removed (doc)                                                                                        | Not used                                                                                              |
| `convertToModelMessages` (UI messages)   | sync                                                          | async                                                                               | async                                                                                                                      | Not used                                                                                              |
| Test utilities (`ai/test`)               | `MockLanguageModelV2`, `mockValues`, `simulateReadableStream` | V3 mocks; V2 mocks removed                                                          | V3 and V4 mocks, `mockId`, stream helpers (pkg)                                                                            | See section 4                                                                                         |
| zod                                      | peer `^3.25.76 \|\| ^4.1.8`                                   | same                                                                                | same (pkg)                                                                                                                 | graphty's zod 3.25.76 works, classic `import { z } from "zod"` included (ran)                         |
| Module format, Node                      | ESM and CommonJS, Node 18+                                    | same                                                                                | ESM only, Node 22+ (pkg, doc)                                                                                              | graphty-element is ESM-only and the repository already requires Node 22                               |
| Telemetry                                | OpenTelemetry bundled (11 kB of the v5 bundle)                | same                                                                                | moved to `@ai-sdk/otel` (doc)                                                                                              | Slightly smaller loop                                                                                 |
| Browser bundle, loop only                | 106 kB gzip                                                   | not measured                                                                        | 107 kB gzip (ran)                                                                                                          | Same                                                                                                  |
| Browser bundle, with Anthropic           | 123 kB                                                        | not measured                                                                        | 171 kB (ran)                                                                                                               | +48 kB                                                                                                |
| Browser bundle, with all three providers | 152 kB                                                        | not measured                                                                        | 255 kB (ran)                                                                                                               | +102 kB                                                                                               |

Version 7 also has a migration skill and codemods (`npx @ai-sdk/codemod`), useful for applications
written against the SDK's UI hooks. graphty uses none of those hooks, so the codemods have little
to do here.

## 4. How testing works on version 7

`ai/test` exports `MockLanguageModelV4` (and the V3 one). A mock is built from a list of results,
one per model call, or from a function. Each call's options (prompt, tools, `toolChoice`) are
recorded in `doGenerateCalls` / `doStreamCalls`, so a test asserts both what the model was asked
and what the loop did. `simulateReadableStream` turns a list of stream parts into the stream a
model returns. The official page is https://ai-sdk.dev/docs/ai-sdk-core/testing (read
2026-10-08).

The SDK tests its own agent the same way: `packages/ai/src/agent/tool-loop-agent.test.ts` in
https://github.com/vercel/ai (main, read 2026-10-08) uses vitest, `MockLanguageModelV4` and a
call counter in `doGenerate` that returns a tool call first and text second, then asserts on the
recorded call options.

**A multi-step loop, ran** (the tools close over a fake graph; `callStep` and `textStep` build
one V4 result each, see the script):

```js
import { generateText, stepCountIs, tool } from "ai";
import { MockLanguageModelV4 } from "ai/test";

const model = new MockLanguageModelV4({
    doGenerate: [
        callStep("c1", "findNodes", { minDegree: 5 }),
        callStep("c2", "styleNodes", { ids: ["a", "c"], color: "#ff0000" }),
        textStep("Colored the 2 hubs red."),
    ],
});
const result = await generateText({
    model,
    instructions: "You are graphty's assistant.",
    prompt: "color the hubs red",
    tools: makeTools(graph),
    stopWhen: stepCountIs(5),
});
assert.deepEqual(
    result.steps.map((s) => s.toolCalls.map((c) => c.toolName)),
    [["findNodes"], ["styleNodes"], []],
);
assert.deepEqual(graph.styles, [{ ids: ["a", "c"], color: "#ff0000" }]);
// The second call's prompt carried the first tool's result, and tools went out as JSON Schema.
assert.deepEqual(Object.keys(model.doGenerateCalls[0].tools[1].inputSchema.properties), ["ids", "color"]);
```

**An approval, ran:**

```js
const APPROVAL = { styleNodes: "user-approval" };
const first = await generateText({ toolApproval: APPROVAL, model, messages, tools, stopWhen: stepCountIs(5) });
const request = first.content.find((p) => p.type === "tool-approval-request");
// The loop paused: nothing ran, one model call made.
messages.push(...first.response.messages, {
    role: "tool",
    content: [{ type: "tool-approval-response", approvalId: request.approvalId, approved: true }],
});
const second = await generateText({ toolApproval: APPROVAL, model, messages, tools, stopWhen: stepCountIs(5) });
// Now the tool ran. A denial instead sends the model a tool result of type "execution-denied" with the reason.
```

**Streaming, ran:** two `simulateReadableStream` responses (a tool call, then two text deltas)
produced the `stream` events `tool-call, tool-result, text:Found , text:2 hubs.`.

**On version 5** the same pattern works with `MockLanguageModelV2` from `ai/test`; the spike ran
the identical three-step loop there. What changes between the versions is the result shape
(finish reason and usage, section 3), not the method.

**What this means for graphty's tests:**

- `VercelAiProvider.test.ts` can drop `vi.mock("ai")` and pass a mock model. That needs one seam,
  a way to hand `VercelAiProvider` a model instead of a key, and it works on 5 as well as 7.
- `MockLlmProvider` stays. It is public API, it tests graphty's loop without the SDK, and the
  app's and stories' tests use it. The SDK mock tests the layer below it.
- The LLM regression harness is unaffected by the SDK version except for the system prompt fix:
  it subclasses `VercelAiProvider`, and `APICallError` and `RetryError` still exist on 7.

## 5. The spike

Scratch project `tmp/ai-v7-spike/` (not committed; `tmp/` is ignored): `ai` 7.0.136,
`@ai-sdk/anthropic` 4.0.78, `@ai-sdk/google` 4.0.93, `@ai-sdk/openai` 4.0.91, zod 3.25.76, and
`ai` 5.0.273 installed beside it under the alias `ai5`. A second folder, `v5/`, holds `ai`
5.0.273 with `@ai-sdk/*` 2.0.109 / 2.0.102 / 2.0.133 and the same zod, for a fair bundle
comparison. Node 22.23.2.

```
cd tmp/ai-v7-spike && npm install && (cd v5 && npm install)
node spike.mjs && node zod3-check.mjs && node v2-in-v7.mjs
./bundle.sh
```

Output:

```
(a) v7 mock loop: steps 3 styles [{"ids":["a","c"],"color":"#ff0000"}] usage {"inputTokens":30,...,"totalTokens":45}
(a2) system message in messages, default: AI_InvalidPromptError: Invalid prompt: System messages are not allowed in the prompt or messages fields. Use the instructions option instead.
(a3) ToolLoopAgent stopped after 2 steps on hasToolCall(styleNodes)
(a4) v7 stream events: tool-call, tool-result, text:Found , text:2 hubs.
(a5) v5 mock loop: steps 3 | v5 exports: stepCountIs=function hasToolCall=function Experimental_Agent=function pruneMessages=function ToolLoopAgent=undefined
(a6) hand-written loop on v7 (no execute, graphty message shapes): ok, usage 10 5
(b) approval: paused with tool-approval-request aitxt-... -> approved -> ran; text: Done.
(b2) denied: tool did not run; model's next prompt has {"type":"tool-result","toolCallId":"c1","toolName":"styleNodes","output":{"type":"execution-denied","reason":"reader said no"}}
(b3) signed approvals: forged approval id -> AI_InvalidToolApprovalError | tool ran: false
(b4) signed approvals: input edited after approval -> AI_InvalidToolApprovalSignatureError | tool ran: false
(c) in-page provider loop: engine calls 3 styles [{"ids":["a","c"],"color":"green"}] text: Hubs are green now.
(c2) same provider through streamText: ok
ALL SPIKE ASSERTIONS PASSED
zod 3 classic schema in ai@7: transform+default applied -> {"color":"#ff0000","size":2} | JSON schema keys: color,size
V2 model under ai@7: ok, steps 2 finishReason "stop" usage 6 4
```

The last line also printed the SDK's warning that the V2 model runs "in a compatibility mode".

Bundles (`esbuild --bundle --minify --platform=browser --format=esm`, then `gzip -9`; each entry
imports `generateText`, `streamText`, `stepCountIs`, `tool`, zod, and the named providers):

```
v7-loop-only     106.9 kB gzip      v5-loop-only     106.4 kB gzip
v7-anthropic     170.8 kB gzip      v5-anthropic     122.5 kB gzip
v7-google        183.0 kB gzip      v5-google        116.9 kB gzip
v7-all-three     254.6 kB gzip      v5-all-three     152.4 kB gzip
node builtins or process spawners in any v7 bundle: none; one copy of zod
```

Before gzip, per package, v7 against v5: `ai` 167 kB against 86 kB, `@ai-sdk/anthropic` 133
against 77, `@ai-sdk/google` 148 against 36, `@ai-sdk/openai` 189 against 83. zod is about 300
kB in both.

### An in-page engine as a version 7 model (ran)

The fake engine answers in the OpenAI chat-completions shape, as WebLLM's
`engine.chat.completions.create` does. The adapter is the whole provider:

```js
function inPageModel(engine, modelId = "fake-in-page") {
    const doGenerate = async (options) => {
        const res = await engine.chat.completions.create({
            messages: toOpenAi(options.prompt),           // V4 prompt -> OpenAI messages (about 15 lines)
            tools: options.tools?.map((t) => ({ type: "function",
                function: { name: t.name, description: t.description, parameters: t.inputSchema } })),
            tool_choice: options.toolChoice?.type,
        });
        const msg = res.choices[0].message;
        const content = [];
        if (msg.content) content.push({ type: "text", text: msg.content });
        for (const c of msg.tool_calls ?? [])
            content.push({ type: "tool-call", toolCallId: c.id, toolName: c.function.name, input: c.function.arguments });
        return { content, warnings: [],
            finishReason: { unified: msg.tool_calls?.length ? "tool-calls" : "stop", raw: res.choices[0].finish_reason },
            usage: { inputTokens: { total: res.usage?.prompt_tokens }, outputTokens: { total: res.usage?.completion_tokens } } };
    };
    return { specificationVersion: "v4", provider: "graphty-in-page", modelId, supportedUrls: {}, doGenerate,
             doStream: /* doGenerate's content replayed as stream parts */ };
}
```

Run under `generateText` with `stopWhen: stepCountIs(5)`, it made three engine calls, styled the
graph, and returned the final text. Two checks matter for graphty: the system prompt
(`instructions`) reached the engine as its first message, and the tools reached it as JSON Schema
with property names. graphty's current `WebLlmProvider` gets both wrong: it skips the system
prompt when tools are present, and it passes the raw zod object where JSON Schema belongs (both
still true on master, `WebLlmProvider.ts`). Any SDK model adapter fixes the second for free,
because the SDK converts the schema; the first is graphty's choice to make.

## 6. How graphty's parts map onto version 7

| graphty part               | On version 7, kept loop                                                                                                                                                                                                       | On version 7 with `ToolLoopAgent`                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AiController` loop        | Unchanged                                                                                                                                                                                                                     | Its rules move into SDK hooks: stop after 5 calls (`stopWhen`), the forced text-only turn (`prepareStep` returning `toolChoice: "none"` and the extra instruction), stop at the first failing tool (a stop condition over tool results), result truncation (in each tool's `execute`), status and events (`onStepStart` / `onToolExecutionEnd`). The transaction and the abort on undo stay graphty's. The code moves rather than disappears |
| `VercelAiProvider`         | System prompt to `instructions`, `fullStream` to `stream`, providers 2.x to 4.x                                                                                                                                               | Becomes model construction only                                                                                                                                                                                                                                                                                                                                                                                                              |
| `LlmProvider` (public)     | Unchanged                                                                                                                                                                                                                     | Either kept as an adapter over the SDK, or removed in a major                                                                                                                                                                                                                                                                                                                                                                                |
| `WebLlmProvider`           | Unchanged, or rewritten as an SDK model (section 5). The community package `@browser-ai/web-llm` 3.x is a V4 model for WebLLM, which prompts for tool calls in fenced JSON instead of using WebLLM's native tools (section 7) | Must become an SDK model                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `MockLlmProvider` (public) | Unchanged                                                                                                                                                                                                                     | Kept for embedders, or replaced in tests by `MockLanguageModelV4`                                                                                                                                                                                                                                                                                                                                                                            |
| LLM regression harness     | System prompt fix only                                                                                                                                                                                                        | Its tool-call recorder moves to `onToolExecutionStart`                                                                                                                                                                                                                                                                                                                                                                                       |
| graphty app                | Nothing                                                                                                                                                                                                                       | Nothing, unless the element's public AI types change                                                                                                                                                                                                                                                                                                                                                                                         |

## 7. The in-browser model under version 7

**Today.** `WebLlmProvider` offers Llama 3.2 1B and 3B, Phi 3.5 Mini, Qwen 2.5 1.5B and SmolLM2
360M, and passes graphty's tools to WebLLM's `tools` parameter. The installed `@mlc-ai/web-llm`
(0.2.80) accepts that parameter only for its Hermes models and refuses it for every other model
("... is not supported for ChatCompletionRequest.tools"), so none of the offered models can call
a tool (issue #1681; `design/ai/ai-tools-additional-webllm-models.md`). The SDK version does not
cause this and an SDK upgrade alone does not fix it: version 7 hands a model tools as JSON Schema
and leaves it to the model's provider to get them across.

**What the community providers do.** Two families of AI SDK providers for in-browser models
exist, both by one author (jakobhoeg): `@browser-ai/web-llm` (WebLLM), `@browser-ai/core`
(Chrome's and Edge's built-in model through the Prompt API) and `@browser-ai/transformers-js`,
plus their predecessors under `@built-in-ai/*`. Reading the published code of
`@browser-ai/web-llm` 1.0.0 and 3.0.4 and `@browser-ai/core` 3.0.4 (2026-10-08):

- **They do not use native tool calling.** The WebLLM provider never passes `tools` or
  `tool_choice` to the engine, so the Hermes-only restriction does not apply. Instead it adds a
  system prompt listing each tool's JSON Schema and asks the model to answer with a
  ` ```tool_call ` fenced block holding `{"name": ..., "arguments": {...}}`. It parses that
  text back into SDK tool calls, in `doGenerate` and in `doStream` (a fence detector turns the
  streamed text into tool-call stream parts). Tool results go back in fenced blocks too.
- **One tool call per turn.** The prompt says "Only request one tool call at a time. Wait for
  tool results before asking for another tool." graphty's loop already takes several turns, so
  this costs turns, not capability.
- **Versions.** `@browser-ai/web-llm` 3.x (latest 3.0.4, 2026-10-01) implements the version 7
  model specification and needs `ai` ^7 and `@mlc-ai/web-llm` ^0.2.79. 2.x is for `ai` 6. 1.0.0
  (2026-01-23, the only release for `ai` 5) implements the version 5 specification and contains
  the same prompt-based tool path. `@browser-ai/core` follows the same numbering.
- **Not measured here.** Whether a 360M to 3B model follows the fenced format reliably enough for
  graphty's 15 tools was not tested; that needs the real models in a browser. The prompt also
  grows with every tool's schema, which matters for small context windows.

**What changes for graphty.** The fix for #1681 is prompt-based tool calling, wherever it lives.
There are three ways to get it:

1. Adopt `@browser-ai/web-llm` 3.x as an optional peer of graphty-element, behind the existing
   `WebLlmProvider` name. Needs `ai` 7. Least code, but a single-maintainer package becomes part
   of graphty's assistant.
2. Adopt `@browser-ai/web-llm` 1.0.0 on `ai` 5. Works by its code, but that line has had no
   release since January, so graphty would own its bugs.
3. Write the same thing in graphty (a tool prompt and a fenced-JSON parser, a few hundred lines),
   either inside `WebLlmProvider` or as an SDK model. Works on either SDK version.

So the in-browser path does not by itself force version 7, but it is the strongest reason to
take it: if the in-page model is revived by adopting the maintained community provider, the
upgrade comes first. Either way graphty-element, not the app, owns the choice and the wiring.

## 8. Effort and risk

**Upgrade, keeping graphty's loop:** about a day of code (system prompt, stream rename, provider
versions, peer ranges, the API report, the tests), then one paid run of the LLM regression suite
(about 190 Google calls) to confirm the newer Google provider sends the same requests.

Risks:

- **A major release of graphty-element**, through the peer ranges. Low cost if it joins a major
  already planned; a whole migration for every consumer if it does not.
- **Bundle growth** of 48 to 102 kB gzip in the lazily loaded `./ai` entry. A page that only
  draws a graph pays nothing, but every assistant user downloads it.
- **Provider behavior changes** (new request shapes in the 4.x providers) that only the paid
  regression run catches.
- **Browser safety** of v7 depends on a `browser` condition two packages down (noted by the
  September study). The spike's bundles pulled in no Node built-ins, which agrees; a build test
  for the `./ai` entry would keep it true.

**Replacing the controller with `ToolLoopAgent`:** several days, and it touches the public API
(`LlmProvider`, `MockLlmProvider`) for a gain that is mostly relocation. The behaviors graphty
built by hand are specific (the forced answer, the stop on the first failure, the undo-aborts-
everything rule), and the SDK expresses each through a hook rather than removing it.

**Staying on 5:** no work now. The risks are that v5 gets fewer fixes over time (no
end-of-support date is published, but the community has moved: `@browser-ai/web-llm` has one
release for v5 and twenty for v6 and v7), and that a feature graphty wants later exists only on 7.

## 9. Recommendation and path

**Now, on version 5 (no dependency change, each step useful on its own):**

1. Send the system prompt through the `system` option instead of as the first message. Version
   5 accepts both; version 7 accepts only the option. This removes the one breaking difference
   the spike found.
2. Let `VercelAiProvider` accept a ready-made SDK model as well as a provider name and key, and
   test it with the SDK's mock model instead of `vi.mock("ai")`. The same tests then run
   unchanged on 7.
3. Decide how the in-page model gets tool calls (section 7). If graphty writes the prompt-based
   tool path itself, write it as an SDK model (`LanguageModelV2`) behind `WebLlmProvider`: it
   runs under version 7 without changes (ran) and gets JSON Schema tools from the SDK. If
   graphty adopts `@browser-ai/web-llm` instead, that is the first trigger below.

**Upgrade to version 7, keeping graphty's loop and its public interface, when any of these
happens:**

- graphty decides to revive the in-page model by adopting the maintained
  `@browser-ai/web-llm` 3.x, which needs `ai` 7 (section 7). This is the most likely trigger,
  because the five offered WebLLM models cannot call tools at all today (issue #1681);
- a graphty-element major release is being assembled anyway (the planned removal of English
  sentences from the assistant's results is one), so the peer-range change costs no extra major;
- the assistant gains tools that change data in ways one undo step does not cover, and the
  reader should confirm before they run. Approvals are v6 and later; graphty would use the
  per-call `toolApproval` policy, not the signed form, which protects servers;
- the tool list grows past about 30 to 40 (for example by exposing the 36 session commands next
  to the 15 current tools) and a per-step `activeTools` filter, which v5 already has, is not
  enough. Then `toolSearch` is the v7 reason;
- a model or provider feature graphty needs lands only in the 4.x provider packages, or a v5 fix
  stops coming.

**Adopt `ToolLoopAgent` behind the existing controller only if** graphty's loop has to grow
features the SDK already has, such as streaming several steps to the reader, approvals inside
the loop, or durable runs. Then build it behind `AiController`'s current interface so the app
and embedders see no change.

## 10. Where this agrees and disagrees with the two earlier reports

**`design/element-api/agent-harness-options.md` (2026-09-21)** recommended upgrading to 7 and
replacing the controller and provider layer (about 1,850 lines) with the SDK's agent loop.

- Agreed: version 7 works in a browser build and does not force zod 4. Its Anthropic figure (172
  kB) matches the spike's 171 kB.
- Disagreed on cost: it never compared against version 5. The same build on 5 is 123 kB, so the
  upgrade adds 48 kB with one provider and 102 kB with the three graphty ships.
- Disagreed on gains: most of the features it credited to 7 (stop conditions, the per-step hook,
  pruning, tool-call repair) are already in the installed 5. Only approvals, signed approvals and
  tool search are new, and graphty needs none of them yet.
- Disagreed on deletion: the controller's rules (forced answer, stop on first failure,
  transactions, abort on undo) move into SDK hooks rather than disappear, and `LlmProvider` and
  `MockLlmProvider` are public API, so removing them is a breaking change on its own.
- Missed: version 7 rejects a system message in the message list, which `VercelAiProvider` sends.
- Its finding about the in-page model's raw zod schema still holds on master, and an SDK model
  adapter fixes it on either version.

**`design/ai/agent-harness-options.md` (2026-10-08)** recommended staying on 5.

- Agreed with the recommendation and with its main reason: version 5 already exports the stop
  conditions, `prepareStep` and `pruneMessages` (checked on 5.0.273).
- Disagreed that tool-call repair is new in 7. Version 5 has it as `experimental_repairToolCall`;
  7 only drops the prefix.
- Disagreed that graphty's own loop is the seam the in-page model and the mock need. The spike
  ran both as SDK models under version 7, and a version 5 model runs under 7 as well. Keep the
  loop for its graph-specific rules and its public interface, not as the only way to plug in
  models.
- Added: the bundle cost, the major release forced by the peer ranges, and the triggers in
  section 9.
- Both reports quote `ai` 5.0.116. The lockfile installs 5.0.271.

## 11. Sources

- AI SDK 6 migration guide, https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0 (read
  2026-10-08; also shipped in the `ai` 7.0.136 package as `docs/08-migration-guides/24-migration-guide-6-0.mdx`)
- AI SDK 7 migration guide, https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0 (read
  2026-10-08)
- Testing, https://ai-sdk.dev/docs/ai-sdk-core/testing (read 2026-10-08)
- Tool approvals, https://ai-sdk.dev/docs/agents/tool-approvals (the packaged copy
  `docs/03-agents/06-tool-approvals.mdx` in `ai` 7.0.136 was read)
- "AI SDK 6", https://vercel.com/blog/ai-sdk-6 (2025-12-22); "AI SDK 7",
  https://vercel.com/blog/ai-sdk-7 (2026-06-25)
- The SDK's agent tests, https://github.com/vercel/ai/blob/main/packages/ai/src/agent/tool-loop-agent.test.ts
  (read 2026-10-08)
- npm registry: `ai`, `@ai-sdk/provider`, `@ai-sdk/anthropic`, `@ai-sdk/google`,
  `@ai-sdk/openai` (versions, dist-tags, publish times, peer dependencies, engines; read
  2026-10-08); the type declarations of `ai` 5.0.273 and 7.0.136 and `@ai-sdk/provider` 4.0.26
- Community in-browser models: https://github.com/jakobhoeg/browser-ai (`@browser-ai/web-llm`
  3.0.4, 2026-10-01, for `ai` 7; 1.0.0, 2026-01-23, for `ai` 5; `@browser-ai/core` 3.0.4) and
  https://github.com/jakobhoeg/built-in-ai (`@built-in-ai/*` for `ai` 6); the published code of
  each was read from npm on 2026-10-08
- WebLLM's Hermes-only `tools` support: issue #1681 and `design/ai/ai-tools-additional-webllm-models.md`
- The earlier reports: `design/element-api/agent-harness-options.md` and
  `design/ai/agent-harness-options.md`
