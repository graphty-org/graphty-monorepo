# The Conversation Format

When the [assistant](./ai-assistant) keeps `history`, each conversation is saved as one record in
the `graphty-ai-conversation` format. `exportAiConversation(id)` returns that record as JSON text,
so a page can offer a download, keep a copy on its server, or inspect what was said and done.

The format is published and versioned. This page describes version 1.

```typescript
import { AI_CONVERSATION_FORMAT, AI_CONVERSATION_FORMAT_VERSION } from "@graphty/graphty-element/catalog";

const json = await element.exportAiConversation(conversationId);
if (json !== null) {
    const record = JSON.parse(json);
    console.log(record.format === AI_CONVERSATION_FORMAT); // "graphty-ai-conversation"
    console.log(record.version <= AI_CONVERSATION_FORMAT_VERSION); // 1 in this release
}
```

## The versioning promise

- **Every record names its format and version** (`"format": "graphty-ai-conversation"`,
  `"version": 1`).
- **Older records are upgraded on read.** A release that adds version 2 also reads version 1
  records, upgrading them in memory.
- **A record is never rewritten until it is saved.** Reading, listing or replaying a record leaves
  it exactly as it was; only the next save writes it at the newer version.
- **A newer record is left alone.** A record written by a later release, with a version this
  release does not know, is not read and not changed. The element reports
  `AI_HISTORY_NEWER_FORMAT` with `{ version }` and carries on without it.
- **An invalid record is skipped, never thrown.** It is reported as `AI_HISTORY_UNAVAILABLE` with
  `reason: "invalid-record"`.
- **A version, once released, never changes.** Its JSON Schema is
  [`graphty-ai-conversation.v1.schema.json`](https://github.com/graphty-org/graphty-monorepo/blob/master/graphty-element/src/ai/conversation/formats/graphty-ai-conversation.v1.schema.json),
  and a change to the format is a new version with an upgrade from the old one.

Records are strict: every object has exactly the fields listed below. Codes and the open lists
marked "open" may gain values in a minor release, so a reader treats an unknown one as generic.

## The record

```json
{
    "createdAt": "2026-10-11T09:30:00.000Z",
    "format": "graphty-ai-conversation",
    "graph": { "dataKey": null, "fingerprint": "9f2c41d07a3be815" },
    "id": "c_8f1d",
    "key": "graph-1:/explore",
    "messages": [
        {
            "id": "m_1",
            "parts": [{ "origin": "reader", "text": "Remove the monitor", "type": "text", "via": "text" }],
            "role": "user"
        },
        {
            "id": "m_2",
            "parts": [
                {
                    "arguments": { "action": "remove_nodes", "ids": ["monitor"] },
                    "callId": "t1",
                    "command": "edit_data",
                    "origin": "model",
                    "type": "tool-call"
                }
            ],
            "role": "assistant"
        }
    ],
    "pending": [],
    "revision": 3,
    "updatedAt": "2026-10-11T09:30:04.000Z",
    "version": 1
}
```

| Field                    | What it holds                                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`                 | always `"graphty-ai-conversation"`                                                                                                                               |
| `version`                | `1`                                                                                                                                                              |
| `revision`               | bumped by every save, so a save from a stale copy (another tab) is detected and merged                                                                           |
| `id`                     | the conversation's id, as the element's conversation methods take it                                                                                             |
| `key`                    | the scope it belongs to (the `history.key` option; by default the element's id and the page path)                                                                |
| `createdAt`, `updatedAt` | ISO 8601 times                                                                                                                                                   |
| `graph`                  | the graph it was about: `dataKey` (the `history.dataKey` option, or `null`) and `fingerprint`, a digest of the node ids and edges (`session.data.fingerprint()`) |
| `messages`               | the messages, oldest first; never edited, only appended                                                                                                          |
| `pending`                | what the conversation is waiting on the reader for                                                                                                               |

## Messages and parts

A message is `{ id, role, parts }`, with `role` one of `"user"`, `"assistant"` or `"tool"`. Each
part has a `type` and an `origin`, which says where its content came from: `"reader"`, `"model"`,
`"graph-data"` (the graph's own data, as a tool read it), `"graphty"` (the element) or `"web"`
(something a [web tool](./ai-assistant#web-search-web-pages-and-code) read on the web).

A `tool-call` is `"model"`, or `"graphty"` for a hand-off a router's plan made (a `delegate` call
the model did not write). A `tool-result` is `"graph-data"`, or `"reader"` for the reader's answer
to a question, with `code: "AI_COMPLETED"` and the chosen values in `content`, or `"web"` for the
answer of a helper that read the web (the `research` helper's, or one of yours with web tools).
A `text` part may carry `"web"` too: read it as web content, as below.

| `type`        | Fields                                                                                                                                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`        | `text`; `via` (`"text"` or `"voice"`) for the reader's words, when the page said how they were given                                                                                                                                                                                                                                |
| `tool-call`   | `callId`, `command` (the tool), `arguments`                                                                                                                                                                                                                                                                                         |
| `tool-result` | `callId`, `code`, `params`, `content` (the text the model read, at most 8,000 characters)                                                                                                                                                                                                                                           |
| `agent-ref`   | `agent` (the helper's name), `callId` (the `delegate` call it answers), `messages` (the helper's conversation)                                                                                                                                                                                                                      |
| `reasoning`   | `text`, when the provider returned the model's reasoning in the clear                                                                                                                                                                                                                                                               |
| `outcome`     | `code`, `params`: how a message that failed or was taken back ended, in place of an answer (`origin: "graphty"`)                                                                                                                                                                                                                    |
| `hosted-tool` | `tool` (`"web-search"`, `"web-fetch"`; open), `status` (`"done"` or `"result-unavailable"`), `sources` (`{ url, title?, retrieval?, contentReturned? }`, `url` http or https only; `retrieval` `"loaded"`, `"failed"`, `"paywalled"`, `"unsafe"` or `"unknown"`, open; `contentReturned` only ever `false`); always `origin: "web"` |

**Helpers.** A [helper's](./ai-assistant#helpers-and-plans) conversation is saved inside the
message that handed it a task: an `agent-ref` part (`origin: "graphty"`) in the tool message that
holds the `delegate` call's result. Its `messages` are messages as above, one level deep: a helper's
messages never hold an `agent-ref`, and a record that nests one is invalid.

**Web tools.** A web search or a web page read is saved as a `hosted-tool` part of the helper's
assistant message, in the helper's conversation inside its `agent-ref`, with the pages it found:

```json
{
    "origin": "web",
    "sources": [{ "title": "Eiffel Tower", "url": "https://en.wikipedia.org/wiki/Eiffel_Tower" }],
    "status": "done",
    "tool": "web-search",
    "type": "hosted-tool"
}
```

A record whose `sources` hold an address that is not `http` or `https` is invalid. `"web"` parts
are what makes a conversation hold web content (see
[what web content may not do](./ai-assistant#what-web-content-may-not-do)), so that survives a
reload. When the model reads them again, they are marked as data, never as instructions.
`getAiConversation()` gathers each assistant message's sources from these parts into its
`sources`.

**Code.** A `run_code` call is an ordinary `tool-call` (`command: "run_code"`,
`arguments: { code }`), and its result an ordinary `tool-result` (`origin: "graph-data"`) whose
`content` holds what the program returned and logged.

Text the element adds for the model is saved too: facts about the graph beside the reader's
words (`origin: "graph-data"`) and instructions (`origin: "graphty"`). `getAiConversation()` leaves
them out; a page that shows a transcript from an exported record should show only `"reader"` and
`"model"` text.

**`providerState`** may appear on `tool-call`, `reasoning` and `hosted-tool` parts:
`{ engine, provider, model, data }`. It is the one opaque field, data a provider needs back on
the next turn (a signature over the model's reasoning, for instance). It is sent back only to the
same engine, provider and model, and any reader may drop it: a conversation without it continues.

## Pending entries

Each entry has `kind`, `id`, `messageId` (the message waiting), `claim` (`null` until a tab or
element takes it, so only one resolves it) and `createdAt`.

| `kind`      | Fields                                                                                                                                                                                                                                  |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approval`  | `gate` (open), `calls` (`{ callId, command, arguments }`), `preview` (as `AiApprovalRequest.preview`), `graph` (`dataKey`, `fingerprint`, `nodes`, `edges` when it was held), `historyRevision`; `agent` when a helper's calls are held |
| `question`  | `callId` (the `ask_reader` call the answer becomes the result of), `question`, `choices` (2 to 10), `multiple`                                                                                                                          |
| `plan-step` | `plan` (`{ steps: [{ agents, order? }] }`, as the router made it), `next` (the index of the step to run once what holds the message ends)                                                                                               |

A `plan-step` entry sits beside the approval that holds a plan's step: it is what is left of the
plan, and it ends with that approval.

A conversation reopened after a reload checks a waiting approval against the loaded graph: a
different `fingerprint`, or a different `dataKey`, makes it stale (`AI_APPROVAL_STALE`,
`reason: "graph-changed"`).

## What is never in a record

- **No API key given to the element.** Any key passed to `enableAiControl` or `setApiKey` while
  the page was open is replaced with `[api-key]` wherever it appears.
- **No audio.**
- **No framework or vendor shapes.** Messages are in this format only, whichever provider wrote
  them, so a conversation can move between providers and releases.

See the [privacy notes](./ai-assistant#privacy) for where records are kept and how to delete them.
