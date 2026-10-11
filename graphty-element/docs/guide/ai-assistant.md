# AI Assistant

The element has an assistant built in. A reader types (or says) what they want, "color the
servers red" or "remove every node with degree 0", and a language model drives the element's own
tools to do it. Each message is one undoable step.

The assistant can remember the conversation, also after a reload, and can ask the reader before
it changes the graph. Both are off by default.

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
  at any time, and `getAiStatus().pending.approvals` counts them.
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

An unknown id, or any id with `history: "none"`, resolves `AI_HISTORY_UNAVAILABLE` with
`reason: "unknown-conversation"`.

`getAiConversation()` returns `{ id, key, formatVersion, messages, pending }`. Each message is
either the reader's, `{ role: "reader", text, via }` (`via` is `"text"` or `"voice"`), or the
assistant's, `{ role: "assistant", text, calls }`, where each call is
`{ command, arguments, code, params }`. It holds what the reader and the model said, never the
instructions or graph facts the element sends the model.

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
            item.textContent = `${message.role}: ${message.text}`;
            return item;
        }),
    );
});
```

## Privacy

- **History is off by default.** Nothing is kept unless you set `history`.
- **It stays on the reader's device.** `"browser"` writes to the browser's IndexedDB for this
  origin; nothing is sent anywhere but to the model provider, as every message is.
- **It is not encrypted.** Any script on the same origin can read it.
- **No API key is saved.** A configured key that appears in any saved text is replaced with
  `[api-key]`.
- **Readers can see and remove it.** `listAiConversations`, `exportAiConversation`,
  `deleteAiConversation` and `clearAiHistory` let your page offer that.
- **Shared headsets and kiosks:** call `clearAiHistory()` when a session ends, so the next reader
  starts with nothing.

## Result codes

Every result, event and saved tool result carries a code from `AI_RESULT_CODES`
(`@graphty/graphty-element/catalog`) and its `params`. The list may grow in a minor release, so
treat an unknown code as a generic outcome.
