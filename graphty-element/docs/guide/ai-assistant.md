# AI Assistant

The element has an assistant built in. A reader types (or says) what they want, "color the
servers red" or "remove every node with degree 0", and a language model drives the element's own
tools to do it. Each message is one undoable step.

The assistant can remember the conversation, also after a reload, ask the reader before it
changes the graph, ask the reader a question when a request is ambiguous, and hand parts of a
message to helpers of your own. All of these are off by default.

The assistant lives in its own entry point, `@graphty/graphty-element/ai`, so a page that only
draws a graph does not load it. The element's methods (`enableAiControl`, `aiCommand` and the rest)
load it on first use; you import from `./ai` only for its types.

## Quick start

Run this as a module script (`<script type="module">`), because it uses top-level `await`:

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;

await element.enableAiControl({ provider: "google", apiKey: myKey });

const result = await element.aiCommand("Color the five highest-degree nodes red");
console.log(result.code); // "AI_COMPLETED", or another code from AI_RESULT_CODES
console.log(result.llmText); // the model's answer, in the model's words
```

`provider` is one of `"openai"`, `"anthropic"`, `"google"`, `"webllm"` (in the browser, no key) or
`"mock"` (scripted answers, for tests). `model` picks a model; each provider has a default.

`result.code` is a code, never a sentence: your page decides what to tell the reader. The words in
`result.llmText` are the model's own.

## Remember the conversation and ask before changing the graph

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const card = document.querySelector<HTMLElement>("#approval")!;

// Listen BEFORE enabling, so a request saved before a reload reaches you too.
element.addEventListener("ai-approval-requested", (e) => {
    const { request } = e.detail;
    card.replaceChildren();
    for (const call of request.calls) {
        const line = document.createElement("pre");
        line.textContent = `${call.tool} ${JSON.stringify(call.arguments)}`; // text, never HTML
        card.append(line);
    }
    for (const approve of [true, false]) {
        const button = document.createElement("button");
        button.textContent = approve ? "Approve" : "Deny";
        button.onclick = async () => {
            card.replaceChildren();
            const final = await element.resolveAiApproval(request.id, { approve });
            console.log(final.code, final.llmText); // the message's final result
        };
        card.append(button);
    }
});
element.addEventListener("ai-pending-resolved", () => card.replaceChildren());

await element.enableAiControl({
    provider: "google",
    apiKey: myKey,
    history: "browser", // remember the conversation, also after a reload
    approvals: "writes", // ask before any command that changes the graph
});

const first = await element.aiCommand("Remove every node with degree 0");
if (first.code === "AI_CONFIRMATION_NEEDED") {
    // Held: nothing changed yet. The card is on screen; the reader's click finishes the message.
}
```

### When each promise resolves

- **`aiCommand` resolves when the message stops**, also when it stops to wait for the reader. A
  held message resolves with `code: "AI_CONFIRMATION_NEEDED"` and `params: { gate, request }`,
  where `request` is the id `ai-approval-requested` carries. Nothing the held calls asked for has
  happened.
- **`resolveAiApproval(id, answer)` continues the message** and resolves with its final result.
  Approve runs the held calls as one more part of the message's undo step; deny drops them. Either
  way the model hears the decision and answers, so the final result carries `llmText`. The codes:
  `AI_COMPLETED` (approved and done), `AI_APPROVAL_DENIED`, `AI_APPROVAL_STALE` (see below), or
  `AI_CONFIRMATION_NEEDED` again when another limit holds the calls. This is also how you get a
  message's result after a reload.
- **`ai-command-complete` fires when `aiCommand` resolves, and again** when a continued message
  ends.

### Rules you can rely on

- **Events come after state.** `ai-approval-requested` fires after the request is saved, so a
  listener may call `resolveAiApproval` at once. `getPendingAiApprovals()` lists every open request
  at any time, and `getAiStatus()?.pending?.approvals` counts them (`getAiStatus()` is `null` before the assistant is enabled, and `pending` is absent while nothing waits).
- **Replay after a reload.** With `history: "browser"`, a request still open when the page closed
  is asked again with `replayed: true`, in a task after `enableAiControl` resolves. A listener
  added before `enableAiControl`, or right after it resolves, gets it. Draw it like any other.
  Without `"browser"` history, a reload ends every request.
- **A request ends on an event, never on a timer.** It ends on the reader's decision; on a new
  message, `retryLastAiCommand()` included (`AI_APPROVAL_STALE` with `reason: "superseded"`); on
  `cancelAiCommand()` (`AI_CANCELLED`); or when the message's step is undone (`AI_UNDONE`). Each
  emits `ai-pending-resolved { id, kind: "approval", code, params }`: remove what you drew for it.
- **A changed graph makes a request stale.** If the graph changed after the request was made,
  approving it runs nothing and resolves `AI_APPROVAL_STALE` with `reason: "graph-changed"` and
  the node and edge counts then and now; the model is told and may ask again. Another tab or element
  that answers first wins: the late one resolves `AI_APPROVAL_STALE` with
  `reason: "resolved-elsewhere"`. An id no request has resolves `AI_APPROVAL_STALE` with
  `reason: "expired"`.
- **Render arguments as text, never as HTML.** `request.calls[].arguments` are what the model
  wrote. Put them in `textContent`, never `innerHTML`.
- **Nothing runs without an answer.** A page that never answers a request never runs the held
  calls.

### What is asked about

`approvals` decides which tool calls wait for the reader:

| Value                      | Asks before                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| `"none"` (default)         | nothing beyond the built-in limits below                                  |
| `"writes"`                 | any call that changes the graph; reading calls run at once                |
| `{ ask: ["style"] }`       | calls to the named tools (`request.calls[].tool` shows the names)         |
| `{ policy(call) { ... } }` | whatever your function says: `"allow"`, `"ask"` or `"deny"` for each call |

The built-in limits hold a batch whatever `approvals` says: one that is large, slow, replaces the
graph, cannot be undone, or fetches a URL the reader did not give. `request.gate` says which
(`"large"`, `"slow"`, `"replaces"`, `"irreversible"`, `"network"`, or `"policy"` for your
`approvals` setting), and `request.preview` holds what was measured (`removeNodes`, `seconds`,
`url` and so on). `gate: false` in the config turns the built-in limits off.

The calls the model makes together are held together: one request per batch, approved or denied
as a whole.

### A policy, and edited arguments

```typescript
await element.enableAiControl({
    provider: "google",
    apiKey: myKey,
    approvals: {
        policy: (call) => {
            if (call.command === "import_data") {
                return "deny"; // never load data from the model's own choice of URL or text
            }
            return call.effect === "write" ? "ask" : "allow";
        },
    },
});
```

`call` is `{ command, action, arguments, effect }`: the tool, its action when it has several, the
model's arguments, and `effect`: `"write"` when it changes the graph, `"read"` when it only reads,
`"exempt"` when it changes only what nothing saves (the camera, the selection). Any `"ask"` holds the batch; any `"deny"`
refuses it, nothing in it runs, and the model hears `AI_TOOL_DENIED_BY_POLICY`.

The reader may change the arguments before approving. Give one entry per held call, in the order
of `request.calls`; an entry's `arguments` replace that call's arguments, and an entry without
them keeps the model's:

```typescript
await element.resolveAiApproval(request.id, {
    approve: true,
    calls: [{ arguments: { action: "remove_nodes", ids: ["n1", "n2"] } }],
});
```

Edited arguments are checked like the model's. Invalid ones run nothing and resolve
`AI_TOOL_INVALID_ARGUMENTS`.

## Questions

With `questions: true` the model may ask the reader a question with a few choices when a request
is ambiguous ("highlight my favorite department": which one?). Your page draws the question and
its choices; the reader's pick continues the message.

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const card = document.querySelector<HTMLElement>("#question")!;

// Listen BEFORE enabling, so a question saved before a reload reaches you too.
element.addEventListener("ai-question-asked", (e) => {
    const { request } = e.detail;
    card.replaceChildren();
    const question = document.createElement("p");
    question.textContent = request.question; // text, never HTML
    card.append(question);
    for (const choice of request.choices) {
        const button = document.createElement("button");
        button.textContent = choice;
        button.onclick = async () => {
            card.replaceChildren();
            const final = await element.answerAiQuestion(request.id, choice);
            console.log(final.code, final.llmText); // the message's final result
        };
        card.append(button);
    }
});
element.addEventListener("ai-pending-resolved", (e) => {
    if (e.detail.kind === "question") {
        card.replaceChildren();
    }
});

await element.enableAiControl({ provider: "google", apiKey: myKey, questions: true });

const first = await element.aiCommand("Highlight the nodes in my favorite department");
if (first.code === "AI_QUESTION_ASKED") {
    // Waiting: the card is on screen; the reader's click finishes the message.
}
```

- **The question is the model's.** `request` is an `AiQuestionRequest`:
  `{ id, question, choices, multiple }`, with `conversationId`, `messageId` and `createdAt` when
  known. `question` and `choices` are the model's words, two to ten choices, in the reader's
  language. Put them in `textContent`, never `innerHTML`.
- **`aiCommand` resolves when the question is asked**, with `code: "AI_QUESTION_ASKED"` and
  `params: { request }`, where `request` is the question's id. Tool calls the model made before
  the question in the same turn have run; nothing after it has.
- **`answerAiQuestion(id, answer)` answers by value**: `answer` is one of `request.choices`,
  exactly as given, or an array of them when `request.multiple` is true. The answer becomes the
  result of the model's question, the model goes on, and the promise resolves with the message's
  final result. An answer that is not among the choices (or several for a question that takes one)
  resolves `AI_ANSWER_INVALID` with `{ request }`; nothing continues and the question stays open.
  An id no open question has resolves `AI_APPROVAL_STALE` with `reason: "expired"`.
- **A question ends on an event, never on a timer**, as an approval does: on the answer; on a new
  message or `retryLastAiCommand()` (`AI_APPROVAL_STALE`, `reason: "superseded"`); on
  `cancelAiCommand()` (`AI_CANCELLED`); when the message's step is undone (`AI_UNDONE`); or when the
  conversation is replaced or cleared (`AI_APPROVAL_STALE`, `reason: "superseded"`). Each emits
  `ai-pending-resolved { id, kind: "question", code, params }`.
- **Replay after a reload**, as for approvals: with `history: "browser"` an open question is asked
  again with `replayed: true`, and of two tabs answering one question, the late one resolves
  `AI_APPROVAL_STALE` with `reason: "resolved-elsewhere"`. `getPendingAiQuestions()` lists the open
  questions at any time, and `getAiStatus()?.pending?.questions` counts them.
- **In the conversation** (`getAiConversation()`), the question is a call of the assistant's message
  (`command: "ask_reader"`, its arguments the question and choices) and the answer is a reader's
  message whose `text` is the chosen value (several are joined by line breaks).
- **Never the only way.** The model asks only when it is unsure; a reader may also answer by
  sending a new message, which ends the question and starts over.

Without `questions: true` the model is never offered a way to ask, so a page that draws no question
never meets one.

## Conversations

With `history` set, the assistant remembers what was said: "now make those bigger" knows which
nodes "those" are.

| `history`          | What is remembered                                                     |
| ------------------ | ---------------------------------------------------------------------- |
| `"none"` (default) | nothing: every message starts a new conversation                       |
| `"memory"`         | the conversation, until the page closes                                |
| `"browser"`        | the conversation and its open requests, in the browser, across reloads |
| `AiHistoryOptions` | one of the above, with the settings below                              |

```typescript
history: {
    store: "browser",          // or "memory"
    key: "sales-dashboard",    // which conversations belong here
    dataKey: "q3-accounts",    // your name for the dataset
    database: "my-app-ai",     // the IndexedDB database (default "graphty-ai")
    budgetTokens: 16000,       // how much of the past the model is shown
}
```

- **`key`** scopes conversations and their requests. The default is the element's `id` plus the
  page's path (`graph-1:/explore`), so two elements on one page, or one element on two pages, keep
  apart. Give each element an `id`.
- **`enableAiControl` reopens** the newest conversation of that `key` whose `dataKey` matches, or
  failing that, whose graph matches the loaded one (same nodes and edges). Otherwise it starts a
  new one; the others stay listed.
- **`budgetTokens`** is measured as characters / 4. The default is 16,000 (3,000 with
  `toolProfile: "small"`). Older exchanges drop out of what the model is shown, whole and oldest
  first; they stay in the conversation.

The methods, on the element (and on `Graph`):

| Method                              | What it does                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| `getAiConversation()`               | the open conversation, or `null`; see below                                                    |
| `listAiConversations({ allKeys? })` | summaries of this `key`'s conversations (every key's with `allKeys: true`)                     |
| `openAiConversation(id)`            | make a saved conversation the open one                                                         |
| `newAiConversation()`               | start an empty one                                                                             |
| `aiCommand(text, { conversation })` | open that conversation and send into it                                                        |
| `deleteAiConversation(id)`          | delete one                                                                                     |
| `clearAiHistory()`                  | delete every saved conversation and open request in the store, of every key                    |
| `exportAiConversation(id)`          | the saved record as JSON text (the [conversation format](./ai-conversation-format)), or `null` |

`aiCommand` with an unknown `conversation`, or any `conversation` with `history: "none"`,
resolves `AI_HISTORY_UNAVAILABLE` with `reason: "unknown-conversation"` and sends nothing.
`openAiConversation` and `exportAiConversation` return `null` for an unknown id, and
`deleteAiConversation` of an unknown id does nothing.

Opening or sending into another conversation ends the requests still waiting in the open one
(`AI_APPROVAL_STALE`, `reason: "superseded"`, saved in that conversation), and asks again about
any saved in the one opened.

`getAiConversation()` returns `{ id, key, formatVersion, messages, pending }`. Each message is
either the reader's, `{ role: "reader", text, via }`, or the assistant's,
`{ role: "assistant", text, calls, outcome? }`, where each call is
`{ command, arguments, code, params }`. It holds what the reader and the model said, never the
instructions or graph facts the element sends the model.

- **The reader's message is saved as it is sent**, so it is in the conversation while the
  assistant works on it.
- **`via`** is `"voice"` when the reader spoke the message through [`aiTalk`](#voice), or you sent
  it with `aiCommand(text, { via: "voice" })` -- pass it for a transcript from `startVoiceInput` --
  and `"text"` otherwise.
- **`outcome`** (`{ code, params }`) is set on the assistant entry of a message that failed or
  was taken back, instead of an answer: the code `aiCommand` resolved with (`AI_PROVIDER_ERROR`,
  `AI_CANCELLED`, ...). Word it as you word that result.
- **Roles may be added in a minor release.** Give a `switch (message.role)` a `default` branch
  that skips a role it does not know.

`ai-conversation-changed { conversationId }` fires on every save, reopen and switch, and when
another tab changed the conversation: read it again with `getAiConversation()`. With `code` set,
storage failed: `AI_STORAGE_FAILED` (a write failed; the conversation carries on in memory) or
`AI_HISTORY_UNAVAILABLE` (the browser's storage could not open; `"browser"` became `"memory"`).

A transcript, redrawn on every change:

```typescript
element.addEventListener("ai-conversation-changed", () => {
    const list = document.querySelector("#transcript")!;
    list.replaceChildren(
        ...(element.getAiConversation()?.messages ?? []).map((message) => {
            const item = document.createElement("li");
            // A failed message has no text: say how it ended, in your own words for its code.
            const ended = message.role === "assistant" ? message.outcome?.code : undefined;
            item.textContent = `${message.role}: ${ended ?? message.text}`;
            return item;
        }),
    );
});
```

## Helpers and plans

Helpers are smaller assistants of your own that the assistant hands parts of a message to: one
that only reads the graph and counts, one that only styles. Each runs with only the tools you give
it, so a narrow task gets a narrow toolset.

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;

element.addEventListener("ai-agent-start", (e) => console.log("started", e.detail.agent, e.detail.task));
element.addEventListener("ai-agent-end", (e) => console.log("ended", e.detail.agent, e.detail.code));

await element.enableAiControl({
    provider: "google",
    apiKey: myKey,
    agents: [
        { name: "counter", purpose: "Find and count nodes; changes nothing", commands: ["query"] },
        { name: "stylist", purpose: "Color and size nodes", commands: ["style"] },
    ],
});

const result = await element.aiCommand("Find the nodes with degree 3 or more, then color them red");
console.log(result.code, result.llmText); // the main model's answer, after its helpers
```

### Roles

A role (`AiAgentRole`, from `@graphty/graphty-element/ai`) is
`{ name, purpose, commands, provider?, model? }`:

- **`name`**: unique among the roles; the model names the helper by it. `"main"` and `"reader"` are
  reserved. At most 20 characters (`MAX_AGENT_NAME_LENGTH`).
- **`purpose`**: what the helper is for, in the model's language. The main model reads it to choose
  a helper, and the helper reads it as its instructions. At most 200 characters
  (`MAX_AGENT_PURPOSE_LENGTH`): every main turn carries every helper's purpose.
- **`commands`**: the assistant's own tools the helper may call, by name: `catalog`, `query`,
  `select`, `run_algorithm`, `results`, `style`, `filter`, `layout`, `view`, `edit_data`, `undo`,
  `sets`, `notes`, `import_data`, `export_graph`, `project`, `capture`, `immersive` (the
  `ASSISTANT_TOOLS` of `@graphty/graphty-element/catalog` with a non-empty `profiles`). It gets no
  others: no tool of yours, and neither `delegate` nor `ask_reader`.
- **`provider`** and **`model`**: a helper runs on the assistant's own provider and model unless
  you name others. `provider` is `"openai"`, `"anthropic"` or `"google"` (a helper cannot run on
  the in-browser model or the mock); `model` alone keeps the assistant's provider with another
  model, which works only when the assistant runs on `"openai"`, `"anthropic"` or `"google"`: on
  `"webllm"`, the mock or a `providerInstance` of your own, name a `provider` too. A helper on a
  provider of its own takes its key from `apiKeys`:

```typescript
await element.enableAiControl({
    provider: "google",
    apiKey: googleKey,
    apiKeys: { anthropic: anthropicKey }, // the keys of the providers helpers run on
    agents: [{ name: "stylist", purpose: "Color and size nodes", commands: ["style"], provider: "anthropic" }],
});
```

A provider with no key in `apiKeys` uses the one `setApiKey` gave it. A message whose helper has no
key at all resolves `AI_KEY_MISSING` with `{ provider }` before anything is sent.

### A configuration that cannot run

`enableAiControl` checks the roles before it builds anything, and rejects with an `AiConfigError`
when one cannot run; so do `AiManager.init` and `new AiController`. Read its `code` (always
`"AI_CONFIG_INVALID"`) and `params` (`{ agent, field, reason }`, and `limit` for a reason that
names one):

| `field`             | `reason`                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `"agents"`          | `"too-many"`: more than 8 roles (no `agent`)                                                   |
| `"name"`            | `"empty"`, `"too-long"`, `"reserved"` (`main`, `reader`), `"duplicate"`                        |
| `"purpose"`         | `"empty"`, `"too-long"`                                                                        |
| `"commands"`        | `"unknown-command"`, with the name in `params.command`                                         |
| `"provider"`        | `"unsupported"` (`"webllm"` or `"mock"`)                                                       |
| `"model"`           | `"unsupported"`: `model` without `provider` while the assistant runs on no remote built-in one |
| `"classifierModel"` | `"unsupported"`: the same, for the classifier (no `agent`)                                     |

```typescript
import { AiConfigError } from "@graphty/graphty-element/ai";

try {
    await element.enableAiControl({ provider: "google", apiKey: myKey, agents: myRoles });
} catch (error) {
    if (error instanceof AiConfigError) {
        console.log(error.code, error.params.agent, error.params.field, error.params.reason);
    }
}
```

### What helpers may do

- **The main model decides.** With `agents` set, the main model is offered a `delegate` tool
  naming the roles, and its instructions list each role's purpose. It hands a helper a task in its
  own words; the helper works on a conversation of its own and answers, and its answer is what the
  main model reads next.
- **At most 4 at once.** One turn starts at most 4 helpers (`MAX_HELPERS_PER_TURN`); its further
  hand-offs do not run, and the main model reads `AI_TOOL_NOT_RUN` with `reason: "limit"` for each.
- **Helpers that run at once only read.** Several hand-offs in one turn run at the same time, and
  while they do, a batch of a helper's calls that does more than read (a change to the graph, an
  undo, a selection, the view) is refused whole with `AI_TOOL_DENIED_BY_POLICY` and
  `reason: "parallel-helper"`; the graph is left alone and the helper hears why. A helper that runs
  alone, or in a `"sequence"` step, may change the graph. Give a helper that is meant to run beside
  others only reading tools, such as `query`. One that fails outright stops the others with it.
- **One message, one undo step, all or nothing.** What a helper changes joins the message's undo
  step, with what the main model changed. A helper whose last change failed takes the whole message
  back with it, as the main model's would: the message resolves `AI_TOOL_FAILED`.
- **The same approvals.** Your `approvals` setting and the built-in limits hold a helper's calls as
  they hold the main model's. The `ai-approval-requested` request then has `agent` set to the
  helper's name, and resolving it continues the helper, then the message. A hand-off is judged too,
  as a call of `delegate` that only reads, with `{ agent, task }` as its arguments: `"deny"` refuses
  it (`AI_TOOL_DENIED_BY_POLICY`) and `"ask"` holds it (`gate: "policy"`).
- **What earlier helpers said is data.** A helper later in a sequence or a plan is told what the
  ones before it answered beside its task, marked as data as the graph's facts are, so an
  instruction an earlier helper read in a node's label or a fetched page does not become one.
- **Helpers neither hand on nor ask.** A helper cannot delegate further and cannot ask the reader a
  question; one that needs the reader says so in its answer, and the main model asks.
- **Cancel stops them.** `cancelAiCommand()` stops running helpers with the message.

### Routers: who decides which helpers run

`agents` also takes `{ roles, router, classifierModel, confirmPlans }`:

| `router`                  | What happens to a new message                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"model"` (default)       | the main model hands tasks to helpers as it chooses                                                                                                                                                          |
| `"classifier"`            | one short turn first picks the helpers the request needs, on the assistant's model, or on `classifierModel` (same provider); they run, then the main model answers. No pick: the main model handles it alone |
| `(input: string) => plan` | your function returns an `AiPlan` for the reader's text; its steps run, then the main model answers                                                                                                          |

A plan (`AiPlan`) is data:

```typescript
import type { AiPlan } from "@graphty/graphty-element/ai";

const plan: AiPlan = {
    steps: [
        { agents: ["counter", "researcher"], order: "parallel" }, // at once, reading only
        { agents: ["stylist"] }, // then this, with what the first step answered
    ],
};
```

- **Steps run in order**, each helper given the reader's request and what the helpers before it
  answered. A step's helpers run at once (`"parallel"`, the default; reading only) or one after
  another (`"sequence"`).
- **At most 8 steps** run, of at most 4 helpers each; the rest are dropped.
- **A plan naming a helper that is not a role** resolves the message `AI_CONFIG_INVALID` with
  `{ agent, field: "router", reason: "unknown-agent" }`, and nothing is sent. A router function that
  throws resolves it with `{ field: "router", reason: "threw" }`, and one that returns something
  other than a plan with `{ field: "router", reason: "invalid-plan" }`.
- After the plan, the main model still has `delegate` and may hand on more.

**`confirmPlans: true`** asks the reader before every hand-off. Each is an ordinary approval
(`ai-approval-requested`, `gate: "plan"`), whose calls are `delegate` calls with
`{ agent, task }`; a plan's step is one request. Approve runs the step; deny tells the main model
`AI_APPROVAL_DENIED`, and it answers without that helper.

### Cost

`ai-agent-start` carries `{ agent, task, after? }`: `task` as the main model or the plan wrote it,
and `after`, for a helper later in a sequence or a plan, who answered before it and how they ended
(`[{ agent, code }]`). `ai-agent-end` carries `{ agent, code, params, usage }`: how the helper ended,
the facts behind the code, and in `usage` the tokens it used, `{ inputTokens, outputTokens }`, as
its provider reported them.

A message's result (`ExecutionResult`) carries `usage` too: every token the message used, the main
model's turns, the `"classifier"` router's turn and every helper's, as the providers reported them
(zero for a provider that reports none). It is absent on a message that ended before a model was
asked.

In the conversation (`getAiConversation()`), a helper's words and calls are assistant messages with
`agent` set to its name; the main model's hand-off is its call `delegate`.

## Web search, web pages and code

The assistant can search the web, read a web page, and run a short program it writes to compute
over the graph. Each is off by default and switched on in `tools`:

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const list = document.querySelector<HTMLUListElement>("#sources")!;

element.addEventListener("ai-hosted-tool-result", (e) => {
    for (const source of e.detail.sources) {
        const item = document.createElement("li");
        item.textContent = source.title ?? source.url; // text, never HTML
        list.append(item);
    }
});

await element.enableAiControl({ provider: "google", apiKey: myKey, tools: { webSearch: true } });

const result = await element.aiCommand("Search the web for the year the Eiffel Tower opened");
console.log(result.code, result.llmText); // "AI_COMPLETED", and an answer drawn from the web
```

The search runs at the provider, not in the page: the page makes no new request. The mock provider
cannot return search results, so there is no Storybook story for web search; the "Run code" story
shows in-page code.

### Which tools, and where

| Option       | What the model may do                                                 | Runs                      |
| ------------ | --------------------------------------------------------------------- | ------------------------- |
| `webSearch`  | search the web                                                        | at the provider           |
| `webFetch`   | read a web page, only on a host you allow or the reader named (below) | at the provider           |
| `inPageCode` | run a program it writes, which may only read the graph (`run_code`)   | in the page, in a sandbox |

Which provider offers which tool is in [Provider features](./ai-provider-features). In short: web
search on OpenAI, Anthropic and Google; web pages on Anthropic only; code on every provider.

`webSearch` and `webFetch` take `true` or an `AiHostedToolOptions`, `inPageCode` takes `true` or
`{ required }`:

```typescript
await element.enableAiControl({
    provider: "anthropic",
    apiKey: myKey,
    tools: {
        webSearch: { maxUses: 3, allowedDomains: ["wikipedia.org"] },
        webFetch: { allowedDomains: ["example.org"] },
        inPageCode: { required: true },
    },
});
```

- **`maxUses`**: the most times one message may use the tool. Anthropic keeps to it itself; on
  OpenAI and Google the assistant stops offering the tool once the message has used it that many
  times, so one model turn there may still search more than once.
- **`allowedDomains`**: the only hosts the tool may reach, such as `"example.org"`. A provider that
  cannot keep to them does not get the tool: Google's search has no domain filter, so a
  `webSearch` with `allowedDomains` on Google is left out.
- **`required`**: see below.

### When a tool cannot be used

`getAiCapabilities()` says, synchronously, what the provider and model can use once the assistant
is enabled (it is `null` before):

```typescript
const capabilities = element.getAiCapabilities();
// { provider: "google", model: "...", tools: { "web-search": "available", "web-fetch": "results-not-returned", "in-page-code": "available" } }
if (capabilities?.tools["web-search"] !== "available") {
    hideSearchSwitch(); // your page's own
}
```

Each tool is `"available"`, `"unsupported"`, `"results-not-returned"` (the provider runs it but
does not hand its results back, so the assistant does not offer it) or `"unknown"`. The statuses
may grow in a minor release: treat an unknown one as not available. The table behind it is
`AI_HOSTED_TOOL_CAPABILITIES`, and `aiHostedToolStatus(provider, model, tool)` reads it for a model
without enabling anything (both in `@graphty/graphty-element/catalog`).

A tool you ask for that cannot be used is **left out, and the command runs without it**. The first
message after `enableAiControl` emits `ai-capability-unavailable` once for each such tool, with
`code: "AI_HOSTED_TOOL_UNSUPPORTED"` and `params: { provider, model, tool }`. One config therefore
works on every provider.

To fail instead, set `required: true` on that tool: every `aiCommand` then resolves
`AI_HOSTED_TOOL_UNSUPPORTED` with the same params, and nothing is sent to the provider.

### Sources

Each time the provider runs a web tool, `ai-hosted-tool-result` fires with
`{ tool, status, sources }`. `status` is `"done"`, or `"result-unavailable"` when the provider ran
the tool but its results did not come back. `sources` (`AiSource[]`) lists the pages found or read,
`{ tool, url, title? }`, in the provider's order.

A model may answer without searching, from what it already knows (Gemini decides for itself
whether a question needs Google Search). Then `ai-hosted-tool-result` fires once for each web tool
that was offered and not used, with `status: "not-used"` and no sources, and the `delegate` call's
result in the conversation carries `hostedToolUses: 0`. Tell the reader the answer has no source.

The same sources are in the conversation: each assistant message of `getAiConversation()` has
`sources`, every page the web tools found for that message (empty when none ran). A renderer:

```typescript
import type { AiSource } from "@graphty/graphty-element/ai";

function sourceLinks(sources: readonly AiSource[]): HTMLElement {
    const list = document.createElement("ul");
    for (const source of sources) {
        const item = document.createElement("li");
        const label = source.title ?? new URL(source.url).hostname;
        if (/^https?:\/\//i.test(source.url)) {
            const link = document.createElement("a");
            link.href = source.url;
            link.textContent = label; // text, never HTML
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            item.append(link);
        } else {
            item.textContent = label;
        }
        list.append(item);
    }
    return list;
}

element.addEventListener("ai-conversation-changed", () => {
    const transcript = document.querySelector("#transcript")!;
    transcript.replaceChildren();
    for (const message of element.getAiConversation()?.messages ?? []) {
        const item = document.createElement("li");
        item.textContent = message.text;
        if (message.role === "assistant" && message.sources.length > 0) {
            item.append(sourceLinks(message.sources));
        }
        transcript.append(item);
    }
});
```

**Render sources as text links, http and https only.** A title and a URL are what a web page and
the provider said. The element saves only `http:` and `https:` addresses, but check the scheme
again before you make a link, and put titles in `textContent`, never `innerHTML`.

### The research helper

The main model never searches itself. With `webSearch` or `webFetch` on and usable, the main model
is offered `delegate` with a built-in helper named `research`, which has the web tools and no
commands: it cannot see or change the graph. The main model hands it a question, the helper
searches and answers, and its answer is what the main model reads next. So `ai-agent-start` and
`ai-agent-end` fire for `research` like any helper, its usage is in the message's `usage`, and
`cancelAiCommand()` stops it. The name `research` is reserved: a role of your own cannot take it.

A helper of your own may have web tools too, in its `tools` (an `AiToolOptions`):

```typescript
await element.enableAiControl({
    provider: "anthropic",
    apiKey: myKey,
    agents: [
        {
            name: "fact-checker",
            purpose: "Checks node names against the web; changes nothing",
            commands: ["query"],
            tools: { webSearch: { maxUses: 2 } },
        },
    ],
});
```

A helper with web tools may only read: its `commands` may name only `catalog` and `query`, or
`enableAiControl` rejects with `AI_CONFIG_INVALID` and `{ agent, field: "tools", reason:
"web-tools-with-writes" }`. On Google a search turn cannot also call commands, so a helper with
web tools and any command on Google rejects with `reason: "unsupported"`.

### What web content may not do

Text read on the web may say anything, including "remove every node". So once a conversation has
read web content, the assistant does not change the graph on that content's say-so.
`tools.webContentWrites` says what happens to every call that does more than read:

- **`"refuse"` (the default):** the call is refused: the model hears `AI_TOOL_DENIED_BY_POLICY`
  with `reason: "web-content"`, the graph is left alone, and it answers.
- **`"ask"`:** the call is held for the reader, with `request.gate === "web-content"`, whether or
  not `approvals` is set; approving it runs it. Your policy, if you set one, is still asked first,
  sees `webContent: true` on the call, and its `"deny"` still wins.
- **`"allow"`:** the call runs as any other would, under `approvals`. Set it only when the reader
  trusts what the web will say.

```typescript
await element.enableAiControl({
    provider: "google",
    apiKey: myKey,
    tools: { webSearch: true, webContentWrites: "ask" },
});
```

- "Does more than read" includes the selection and the camera, not only the data, and a helper's
  calls as much as the main model's.
- A hand-off to a helper that fetches web pages counts too: the model could write what a page told
  it into the task, and a fetch would carry it out in a URL. Under `"refuse"` it is refused, under
  `"ask"` held. A helper that only searches is handed tasks as before.
- **It lasts for the conversation.** A new conversation (`newAiConversation()`) clears it; with
  `history`, it survives a reload, since the web content is saved with the conversation.

**Web content cannot carry data out.** Web pages are read only on hosts you allow: a web fetch
reaches the hosts in `webFetch.allowedDomains`, plus the hosts of `http` and `https` URLs in the
reader's own words in this message. `webFetch: true` alone means only the URLs the reader typed.
A host the model wrote, or one read in the graph or on a page, is never added, so a model cannot
send graph data to `https://evil.example/?d=...` by fetching it. A message with no allowed host
is not offered web fetch at all.

### Running code

With `tools: { inPageCode: true }`, the model may call `run_code` with a short program in
TypeScript or JavaScript, to compute what the assistant's tools do not give directly ("the average
degree", "how many nodes have a label longer than 20 characters"):

```typescript
await element.enableAiControl({ provider: "google", apiKey: myKey, tools: { inPageCode: true } });

const result = await element.aiCommand("Use code to compute the average degree of the graph");
console.log(result.llmText); // the model's answer, from the program's value
```

- **It runs in the page**, in a QuickJS sandbox compiled to WebAssembly, whatever provider wrote
  the program. It has no `fetch`, no `document`, no network and no page globals.
- **It may only read.** The program calls the assistant's tools as `await tools.<name>(args)`
  (`tools.query({ action: "overview" })`, for instance), and only their actions that read and hand
  your page nothing: never a screenshot, a recording or an export. A call that would change
  anything is refused (`AI_TOOL_DENIED_BY_POLICY`, `reason: "in-page-code"`) and the graph is left
  alone; no approval is ever asked from inside a program.
- **Limits:** 5 seconds, 64 tool calls, 4,000 characters of console output and 16 MB of memory per
  program. A program past one ends `AI_TOOL_FAILED` with `cause` `"program-timeout"`,
  `"program-call-limit"` or `"program-memory"`; one that throws, `"program-threw"`; one stopped
  by `cancelAiCommand()`, `"program-cancelled"`. The model reads what the program returned and
  logged, or how it failed, as a tool result.
- In the conversation it is a call with `command: "run_code"` and `arguments: { code }`.
- **Where it cannot run:** in `@graphty/graphty-element/bundle`, which leaves the sandbox out, and
  on a page whose content security policy does not allow `'wasm-unsafe-eval'`. There
  `getAiCapabilities().tools["in-page-code"]` is `"unsupported"`, and the tool is left out as
  above.

The sandbox (about 130 kB of script and 240 kB of WebAssembly) loads only on the first program, so a page that never turns code on never downloads it.

### Result codes these tools add

| Code                         | When                                                                                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AI_HOSTED_TOOL_UNSUPPORTED` | a `required` tool cannot be used; `{ provider, model, tool }`. Also the code of `ai-capability-unavailable`                                                                                                                                           |
| `AI_PROVIDER_PAUSED`         | the provider stopped a turn that used its own tool before the model answered (a long search), and again each of the three times the assistant sent the turn back to continue; `{ provider }`. What it found is not kept: asking again searches afresh |
| `AI_TOOL_DENIED_BY_POLICY`   | with `reason: "web-content"` or `"in-page-code"`, as above                                                                                                                                                                                            |

## Voice

The reader can talk to the assistant and hear it answer. Set `voice`, and draw a button that the
reader holds while talking:

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const talk = document.querySelector<HTMLButtonElement>("#talk")!;

await element.enableAiControl({ provider: "google", apiKey: myKey, voice: { output: "browser" } });

talk.onpointerdown = (e) => {
    talk.setPointerCapture(e.pointerId); // letting go off the button still ends the press
    element.aiTalk(true);
};
talk.onpointerup = talk.onpointercancel = () => element.aiTalk(false);
talk.onkeydown = (e) => {
    if (e.key === " " && !e.repeat) {
        element.aiTalk(true);
    }
};
talk.onkeyup = (e) => {
    if (e.key === " ") {
        element.aiTalk(false);
    }
};
```

`aiTalk(true)` opens the microphone and listens; `aiTalk(false)` ends what the reader said and
sends it as a message, exactly as `aiCommand(text, { via: "voice" })` would: the same tools,
approvals, questions and history, and the conversation records it with `via: "voice"`. Voice is
never the only way in: anything a reader can say, they can type.

Show the button only where speech can be heard, and again whenever that changes (the reader
allows or blocks the microphone, a key is set, VR starts or ends):

```typescript
const show = (support) => (talk.hidden = support.input.status === "unavailable");
show(await element.getAiVoiceSupport());
element.addEventListener("ai-voice-support-change", (e) => show(e.detail.support));
```

`getAiVoiceSupport()` returns `{ input, output }`, each `{ path, status, destination, code?,
params? }`:

- **`path`**: `"browser"` (the browser's own recognition or speech), `"provider"` (the AI
  provider transcribes or speaks), or `"none"`.
- **`status`**: `"ready"`, `"needs-permission"` (the reader has not yet allowed the microphone;
  the first press asks) or `"unavailable"`, with `code` `AI_VOICE_UNAVAILABLE` and
  `params: { path, reason }` saying why, or `AI_NOT_ENABLED` without `voice`.
- **`destination`**: where the audio, or the text to speak, goes: `"on-device"`,
  `"browser-vendor"`, `"provider"` or `"none"`. See [Privacy](#privacy).

### Options

| Option            | Default                              | What it does                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`           | `"auto"`                             | How speech is heard. `"auto"` (or `"on"`): the browser's recognition where it works, else the provider's transcription, else `AI_VOICE_UNAVAILABLE`. `"browser"`, `"provider"` or `"off"` force one; `"browser"` tries the browser's recognition even where it failed before |
| `output`          | `"auto"`                             | How answers are spoken. `"auto"`: not at all on a flat page, and in VR or AR by the browser's speech, else the provider's. `"on"`: the same, on every page. `"browser"`, `"provider"` or `"off"` force one                                                                   |
| `language`        | the page's (`navigator.language`)    | The language heard and spoken, a BCP 47 tag such as `"fr-FR"`                                                                                                                                                                                                                |
| `voiceName`       | the provider's default               | The provider's voice, by the provider's own name for it (`"alloy"` on OpenAI, `"Kore"` on Google). A name the provider does not have ends with `AI_VOICE_UNAVAILABLE` `{ reason: "unknown-voice" }`                                                                          |
| `push`            | `"hold"`                             | `"hold"`: the reader talks while `aiTalk(true)` holds. `"toggle"`: each `aiTalk(true)` starts or ends, for a reader who cannot hold a button                                                                                                                                 |
| `holdKey`         | none                                 | A key (`KeyboardEvent.key`, such as `"v"`) that holds talk while held with the graph focused, so the mouse stays free to point. See [Pointing](#pointing-color-this)                                                                                                         |
| `maxPressSeconds` | `60`                                 | The longest one press listens; past it the press ends as if released, so a forgotten toggle does not record for ever. `Infinity` for no limit                                                                                                                                |
| `speechLevel`     | `0.04`                               | When the provider transcribes: the microphone level (0 to 1, as `ai-voice-level` reports it) a press must reach to be sent. A quieter press is heard as nothing, so silence never reaches a model that might write words nobody said. `0` sends every press                  |
| `transcription`   | the chat provider                    | `{ provider, model? }`: transcribe through another provider, with its key from `apiKeys`. Anthropic transcribes nothing itself, so an Anthropic page sets `transcription: { provider: "openai" }`. On Google, whose chat model transcribes, `model` names that chat model    |
| `replies`         | `{ approve: ["yes"], deny: ["no"] }` | What the reader says to answer a [held approval](#remember-the-conversation-and-ask-before-changing-the-graph), compared with case and punctuation ignored. The defaults are English whatever `language` is: set your own words for another language. `gates`: see below     |
| `say`             | absent                               | `({ code, params }) => string \| undefined`: the words to speak for an outcome the model wrote no text for. Absent, such an outcome is not spoken                                                                                                                            |

Which providers transcribe and speak, and which browsers and headsets recognize speech, is on
[AI Provider Features](./ai-provider-features#voice).

**What is spoken.** Only the model's own text (`result.llmText`) is spoken. An outcome with no
text -- an error, a held approval -- is spoken only in your words, from `say`; the element never
speaks words of its own:

```typescript
await element.enableAiControl({
    provider: "openai",
    apiKey: myKey,
    voice: {
        output: "provider",
        language: "fr-FR",
        replies: { approve: ["oui"], deny: ["non"] },
        say: ({ code }) => (code === "AI_CONFIRMATION_NEEDED" ? "Je dois demander avant." : undefined),
    },
});
```

**Answering by voice.** While an approval is held, saying one of `replies.approve` approves it and
one of `replies.deny` denies it. A spoken approve answers only the holds in `replies.gates`
(default `AI_VOICE_APPROVABLE_GATES` from `@graphty/graphty-element/catalog`): a change asked for
after the model read the web (`"web-content"`) or one that cannot be undone (`"irreversible"`) is
approved on screen, where the reader can see it, because a web page can steer the model into
asking the reader to "say yes". For those, "yes" changes nothing and the outcome is
`AI_CONFIRMATION_NEEDED` `{ gate, request }`, which `say` can put into words. A spoken deny answers
every hold. While a [question](#questions) is open, saying one of its choices answers it. Anything
else is a new message, which ends what was waiting, as a typed message does.

**Talking interrupts.** `aiTalk(true)` stops an answer being spoken, and so does
`stopAiSpeech()`. `disableAiControl()` closes the microphone and stops speaking.

### Pointing: "color this"

While talk is held, the element records the nodes the pointer passes over, in order, and the
nodes selected when the press began. The model is sent them with the message, so "color this one
red" or "connect this to that" names the nodes the reader pointed at. Only ids are sent, whole:
the last 20 nodes pointed at and the first 20 selected (10 each with the small tool profile), and
fewer when the ids are long. A typed message carries no pointing.

To point with the mouse, talk must be held by something other than the mouse: while the mouse
holds the talk button down, it cannot move over the graph. Hold talk with a key instead:

- `voice.holdKey`: the element listens for that key itself while the graph is focused, so the
  reader clicks the graph once, then holds the key, points and lets go.
- Space on a focused talk button, as in the example above.

In VR the controller's ray points while B or Y is held, and with hands the other hand's ray points
while the wrist orb is pinched.

### Events

| Event                     | `detail`                   | When                                                                                                                                                                                                                                                                            |
| ------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-voice-start`          | `{}`                       | the microphone opened and listening began                                                                                                                                                                                                                                       |
| `ai-voice-transcript`     | `{ transcript, isFinal }`  | what has been heard so far; the last one has `isFinal: true`                                                                                                                                                                                                                    |
| `ai-voice-level`          | `{ level }`                | how loud the microphone is, 0 to 1, at most once per animation frame while talk is held: draw a meter from it                                                                                                                                                                   |
| `ai-voice-end`            | `{ reason, code, params }` | the press ended: `AI_COMPLETED`, `AI_CANCELLED`, `AI_VOICE_UNAVAILABLE`, `AI_NOT_ENABLED` when the assistant has no `voice`, `AI_FAILED` when the voice code would not load, or the provider's code when its transcription failed (`AI_PROVIDER_ERROR`, `AI_KEY_REJECTED`, ...) |
| `ai-voice-support-change` | `{ support }`              | what `getAiVoiceSupport()` would return changed: redraw the talk button from `support`                                                                                                                                                                                          |
| `ai-speech-start`         | `{}`                       | an answer started being spoken                                                                                                                                                                                                                                                  |
| `ai-speech-end`           | `{ code, params }`         | it stopped: `AI_COMPLETED`, `AI_CANCELLED` (talk or `stopAiSpeech()` cut it off), `AI_VOICE_UNAVAILABLE`, or a provider's code                                                                                                                                                  |

```typescript
element.addEventListener("ai-voice-level", (e) => {
    talk.style.setProperty("--level", String(e.detail.level));
});
element.addEventListener("ai-voice-end", (e) => {
    if (e.detail.code === "AI_VOICE_UNAVAILABLE") {
        showWhy(e.detail.params); // { path, reason }
    }
});
```

### In VR and AR

In an immersive session the page's own buttons cannot be seen, so the element draws and binds
its own controls. Each is on by default when `voice` is set, and each can be rebound or switched
off in `xr.ai`:

- **Talk**: hold B or Y on a Quest Touch controller, or, with hands, pinch and hold the microphone
  orb on the wrist (`pushToTalk`). The trigger and thumbsticks keep their usual jobs.
- **Answer a held approval**: A approves and X denies (`pendingButtons`) the change whose card is
  drawn in the scene, and only that one: with `pendingControl: false` no card is drawn and A and X
  do nothing. Or point at the approve or deny control and pull the trigger or pinch; or say "yes"
  or "no" (see `replies.gates`). The card shows why the change was held (its gate code), what it
  does (its preview) and each held command with its arguments, wrapped to the card.
- **Questions**: one control per choice, drawn in the scene.
- **The panel**: what was heard and the assistant's answer, drawn in the scene (`panel`).
- **Speaking**: with `output: "auto"`, answers are spoken.

Entering VR or AR asks for the microphone and unlocks audio on that click, because a headset
cannot ask once the reader is inside; the microphone closes again at once. Leaving VR or AR closes
the microphone and stops speaking.

The scene shows only data: why a change was held and its preview, the command's name from the
catalog, its arguments, the model's question, choices and answer, and what the reader said, each
with an icon. The words on the controls are yours, from `xr.ai.labels`, keyed by code (and by the
gate, such as `"web-content"`, and the preview's field names, such as `removeNodes`); a code with
no label shows its icon only, and a gate or preview field with no label shows its code:

```typescript
element.xr = {
    enabled: true,
    ai: {
        pushToTalk: { buttons: ["b", "y"], wristOrb: true },
        pendingButtons: { approve: ["a"], deny: ["x"] },
        labels: {
            XR_APPROVE: "Approve",
            XR_DENY: "Deny",
            XR_TRANSCRIPT: "You said",
            AI_CONFIRMATION_NEEDED: "Allow this change?",
            AI_QUESTION_ASKED: "The assistant asks",
            AI_COMPLETED: "Done",
        },
    },
};
```

An empty button list switches that binding off (`pushToTalk: { buttons: [] }`).

### Result codes voice adds

| Code                   | When                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AI_VOICE_UNAVAILABLE` | speech cannot be heard or spoken; `{ path, reason }`. `path` is `"input"` or `"output"`; `reason` is one of `AI_VOICE_UNAVAILABLE_REASONS`: `"no-recognition"`, `"no-microphone"`, `"permission-denied"`, `"insecure-context"` (the page is not HTTPS), `"no-provider-transcription"`, `"no-provider-speech"`, `"no-key"`, `"no-synthesis"`, `"playback-failed"`, `"unknown-voice"` (the provider has no voice by that name), `"recognition-network"` (the browser's recognition service could not be reached; the next press tries again). More may be added in a minor release |

The "Voice" story in Storybook shows a talk button on the mock provider. On a headset or a phone
it uses the device's own speech, so it is also the page to check a device with.

## Privacy

- **History is off by default.** Nothing is kept unless you set `history`.
- **It stays on the reader's device.** `"browser"` writes to the browser's IndexedDB for this
  origin; nothing is sent anywhere but to the model provider, as every message is.
- **It is not encrypted.** Any script on the same origin can read it.
- **No API key given to the element is saved.** Every key passed to `enableAiControl` or
  `setApiKey` while the page is open, a replaced one included, is replaced with `[api-key]`
  wherever it appears in saved or exported text. A credential your page uses some other way (a
  proxy token, a header of its own provider) is not known to the element and is not removed.
- **Readers can see and remove it.** `listAiConversations`, `exportAiConversation`,
  `deleteAiConversation` and `clearAiHistory` let your page offer that.
- **Shared headsets and kiosks:** call `clearAiHistory()` when a session ends, so the next reader
  starts with nothing.

Web search, web pages and code add these:

- **The reader pays.** Web tools run at the provider on the reader's key, and providers charge for
  them on top of the model (Anthropic's web search costs $10 per 1,000 searches). They are off by
  default; `maxUses` caps each message.
- **Search queries are written by the model** and may carry what it knows of the graph: node
  names, labels, values. They go to the provider's search, and from there to the web. Turn web
  search on only for data the reader may send there.
- **Web pages are read on the hosts you allow** and the hosts of URLs the reader typed, never
  others (see "What web content may not do").
- **Content security policy.** Web search and web pages run at the provider, so they need no
  `connect-src` beyond the provider's own. Code needs `'wasm-unsafe-eval'` in `script-src`;
  without it, code is reported `"unsupported"` and left out.
- **Saved with the conversation.** With `history`, the sources and the helper's answer are saved
  in the record (see the [conversation format](./ai-conversation-format)), as the rest of the
  conversation is.

Voice adds these:

- **The microphone is open only while talk is held**, from `aiTalk(true)` to `aiTalk(false)`, and
  every track is stopped on release, cancel and `disableAiControl()`. Entering VR or AR opens it
  for a moment to ask permission, and closes it at once.
- **Where the audio goes depends on the path** (`getAiVoiceSupport()` says, as `destination`):
    - the browser's recognition: Chrome's default sends audio to Google and Edge's to Microsoft
      (`"browser-vendor"`); Chrome's on-device recognition, Safari and Vision Pro keep it on the
      device (`"on-device"`);
    - the provider's transcription sends a recording of what the reader said to the provider, on
      the reader's key, as every message is (`"provider"`). With `transcription`, it goes to that
      provider instead;
    - spoken answers: the browser's speech stays in the browser (often on the device); the
      provider's sends the answer's text to the provider.
- **Nothing is recorded or kept.** The recording lives only until it is transcribed; the
  conversation keeps the transcript, as it keeps typed text. A press that never reached
  `speechLevel` is not sent at all.
- **One fact is kept per origin.** Whether the browser's recognition works is stored in
  `localStorage` under `@graphty-ai-voice:recognition` (and, for a language the browser refused,
  `@graphty-ai-voice:recognition:<language>`), so a browser whose recognition never works (Quest
  Browser) is not tried on every press. Only "works" or "fails" is stored. `input: "browser"`
  tries again, and a start that works replaces it.
- **Content security policy.** The provider's speech is played from a `blob:` URL, so it needs
  `media-src blob:`; transcription and speech go to the provider's own host, already in
  `connect-src`.

## Result codes

Every result, event and saved tool result carries a code from `AI_RESULT_CODES`
(`@graphty/graphty-element/catalog`) and its `params`. The list may grow in a minor release, so
treat an unknown code as a generic outcome.
