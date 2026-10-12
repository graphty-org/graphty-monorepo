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
- **`via`** is `"voice"` when you sent the message with `aiCommand(text, { via: "voice" })` --
  pass it for a transcript from `startVoiceInput` -- and `"text"` otherwise.
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
  reserved.
- **`purpose`**: what the helper is for, in the model's language. The main model reads it to choose
  a helper, and the helper reads it as its instructions.
- **`commands`**: the assistant's own tools the helper may call, by name: `catalog`, `query`,
  `select`, `run_algorithm`, `results`, `style`, `filter`, `layout`, `view`, `edit_data`, `undo`,
  `sets`, `notes`, `import_data`, `export_graph`, `project`, `capture`, `immersive` (the
  `ASSISTANT_TOOLS` of `@graphty/graphty-element/catalog` with a non-empty `profiles`). It gets no
  others: no tool of yours, and neither `delegate` nor `ask_reader`.
- **`provider`** and **`model`**: a helper runs on the assistant's own provider and model unless
  you name others. `provider` is `"openai"`, `"anthropic"` or `"google"` (a helper cannot run on
  the in-browser model or the mock); `model` alone keeps the assistant's provider with another
  model. A helper on a provider of its own takes its key from `apiKeys`:

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
when one cannot run. Read its `code` (always `"AI_CONFIG_INVALID"`) and `params`
(`{ agent, field, reason }`):

| `field`      | `reason`                                                  |
| ------------ | --------------------------------------------------------- |
| `"name"`     | `"empty"`, `"reserved"` (`main`, `reader`), `"duplicate"` |
| `"purpose"`  | `"empty"`                                                 |
| `"commands"` | `"unknown-command"`, with the name in `params.command`    |
| `"provider"` | `"unsupported"` (`"webllm"` or `"mock"`)                  |

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
  naming the roles. It hands a helper a task in its own words; the helper works on a conversation of
  its own and answers, and its answer is what the main model reads next.
- **Helpers that run at once only read.** Several hand-offs in one turn run at the same time, and
  while they do, a batch of a helper's calls that would change the graph is refused whole with
  `AI_TOOL_DENIED_BY_POLICY` and `reason: "parallel-helper"`; the graph is left alone and the helper
  hears why. A helper that runs alone, or in a `"sequence"` step, may change the graph. Give a
  helper that is meant to run beside others only reading tools, such as `query`.
- **One message, one undo step.** What a helper changes joins the message's undo step, with what
  the main model changed.
- **The same approvals.** Your `approvals` setting and the built-in limits hold a helper's calls as
  they hold the main model's. The `ai-approval-requested` request then has `agent` set to the
  helper's name, and resolving it continues the helper, then the message.
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
- **At most 8 steps** run; the rest are dropped.
- **A plan naming a helper that is not a role** resolves the message `AI_CONFIG_INVALID` with
  `{ agent, field: "router", reason: "unknown-agent" }`, and nothing is sent.
- After the plan, the main model still has `delegate` and may hand on more.

**`confirmPlans: true`** asks the reader before every hand-off. Each is an ordinary approval
(`ai-approval-requested`, `gate: "plan"`), whose calls are `delegate` calls with
`{ agent, task }`; a plan's step is one request. Approve runs the step; deny tells the main model
`AI_APPROVAL_DENIED`, and it answers without that helper.

### Cost

`ai-agent-start` carries `{ agent, task }`. `ai-agent-end` carries `{ agent, code, params }`:
how the helper ended, and in `params` the tokens it used, `inputTokens` and `outputTokens`, as its
provider reported them. When a helper ran, the message's own result adds the helpers' totals to its
`params` too.

In the conversation (`getAiConversation()`), a helper's words and calls are assistant messages with
`agent` set to its name; the main model's hand-off is its call `delegate`.

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

## Result codes

Every result, event and saved tool result carries a code from `AI_RESULT_CODES`
(`@graphty/graphty-element/catalog`) and its `params`. The list may grow in a minor release, so
treat an unknown code as a generic outcome.
