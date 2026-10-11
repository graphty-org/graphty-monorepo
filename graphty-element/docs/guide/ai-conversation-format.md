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

A message is `{ id, role, parts }`, with `role` one of `"user"`, `"assistant"` or `"tool"`, and an
optional `agent` naming the helper that wrote it. Each part has a `type` and an `origin`, which
says where its content came from: `"reader"`, `"model"`, `"graph-data"` (the graph's own data, as
a tool read it), `"graphty"` (the element) or `"web"`.

| `type`            | Fields                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `text`            | `text`; `via` (`"text"` or `"voice"`) for the reader's words                                                                     |
| `tool-call`       | `callId`, `command` (the tool), `arguments`                                                                                      |
| `tool-result`     | `callId`, `code`, `params`, `content` (the text the model read, at most 8,000 characters)                                        |
| `hosted-tool`     | `callId`, `tool` (open), `status` (`"done"` or `"result-unavailable"`), `sources` (`{ url, title? }`, `http:` and `https:` only) |
| `reasoning`       | `text`, when the provider returned the model's reasoning in the clear                                                            |
| `agent-ref`       | `agent`, `conversationId` (a helper's own conversation), optional `code` and `params`                                            |
| `live-transcript` | `text` of a live voice exchange                                                                                                  |

Text the element adds for the model is saved too: facts about the graph beside the reader's
words (`origin: "graph-data"`) and instructions (`origin: "graphty"`). `getAiConversation()` leaves
them out; a page that shows a transcript from an exported record should show only `"reader"` and
`"model"` text.

**`providerState`** may appear on `tool-call`, `hosted-tool` and `reasoning` parts:
`{ engine, provider, model, data }`. It is the one opaque field, data a provider needs back on
the next turn (a signature over the model's reasoning, for instance). It is sent back only to the
same engine, provider and model, and any reader may drop it: a conversation without it continues.

## Pending entries

Each entry has `kind`, `id`, `messageId` (the message waiting), `claim` (`null` until a tab or
element takes it, so only one resolves it) and `createdAt`.

| `kind`              | Fields                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `approval`          | `gate` (open), `calls` (`{ callId, command, arguments }`), `preview` (as `AiApprovalRequest.preview`), `graph` (`dataKey`, `fingerprint`, `nodes`, `edges` when it was held), `historyRevision`, optional `agent` |
| `question`          | `question`, `choices`, `multiple`, optional `callId` and `agent`                                                                                                                                                  |
| `plan-step`         | `planId`, `step` (from 0), `agents`, optional `order` (`"parallel"` or `"sequence"`)                                                                                                                              |
| `plan-confirmation` | `planId`, `steps` (`{ agents, order? }`)                                                                                                                                                                          |

This release asks only approvals. The other kinds are part of version 1 so that later features
need no new version.

## What is never in a record

- **No API key.** A configured key anywhere in the text is replaced with `[api-key]`.
- **No audio**, and no raw web pages or search payloads: a hosted tool keeps only its sources.
- **No framework or vendor shapes.** Messages are in this format only, whichever provider wrote
  them, so a conversation can move between providers and releases.

See the [privacy notes](./ai-assistant#privacy) for where records are kept and how to delete them.
