# What a Run Painted

When an algorithm run finishes, graphty-element draws its result for you: a ranking colors the
nodes, communities get one color each, a route is highlighted. Each of these is a _suggestion_
the run makes, and the element decides once, when the run first completes, whether to add it to
the style stack.

`session.runs.painting(runId)` tells you what that decision was, so your app can show the reader
what changed, or say why nothing did. It reports facts (ids and codes), never sentences: the words
are yours to choose.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;

const run = element.run("louvain");
await run;
for (const s of session.runs.painting(run.id)?.suggestions ?? []) {
    if (s.outcome === "added") {
        console.log("added", s.suggestion.channels);
    } else if (s.outcome === "suppressed") {
        console.log("hidden by layer", session.styles.get(s.byLayerId)?.name);
        // Paint it anyway, on top of that layer
        if (s.suggestion.as === "encoding") await session.styles.encode(s.suggestion.spec);
        else await session.styles.highlight(s.suggestion.spec);
    } else console.log(s.outcome); // "superseded", "refused", or one added later
}
```

The decision is ready as soon as `await run` returns. Pass the run's `id`; the value `await run`
resolves to carries the same id as `runId`.

## The outcome of each suggestion

Every suggestion the run made gets one entry in `suggestions`, with an `outcome`:

| `outcome`      | What happened                                                                          | Also carries                             |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------------- |
| `"added"`      | Its layers were added to the style stack                                               | `layerIds`, maybe `placedBeneathLayerId` |
| `"suppressed"` | Not added: a layer your app wrote already sets that channel on every element           | `byLayerId`                              |
| `"superseded"` | Not added: it was in a batch, and a later member's suggestion for the channel was used | `byRunId`                                |
| `"refused"`    | Not added: the style stack refused it, and the same error went to `style:problem`      | `code`                                   |

Every entry also carries `suggestion`, the suggestion itself:

- `suggestion.as` is `"encoding"` or `"highlight"`: which of `session.styles.encode()` or
  `session.styles.highlight()` applies it.
- `suggestion.spec` is what that method takes, already bound to the run (its `run` is the run's
  id), so passing it back applies the suggestion yourself.
- `suggestion.channels` is an array of `Channel` values (the type is exported from
  `@graphty/graphty-element/catalog`), such as `["node.color"]`. A route
  highlight names two, `"node.color"` and `"edge.color"`.

`layerIds` lists every layer the suggestion added: one for an encoding, two for a highlight that
paints nodes and edges. Each id works with `session.styles.get(id)`, which returns the layer (or
`undefined` once it is removed), and with every other `session.styles` method that takes a layer
id.

`byLayerId` and `placedBeneathLayerId` always name a layer your app wrote, never one a run added,
so its `name` is the one your app gave it, or `undefined` if your app gave it none.

`placedBeneathLayerId` is set when a layer your app wrote colors some of the same elements. The
run's layer was placed directly beneath that layer, so your choice still shows where you made it
and the run paints the rest.

More outcomes may be added in a minor release, so keep a default branch when you switch on
`outcome`.

## Why a run did not decide anything

`painting.state` says whether `suggestions` holds a decision. When it is anything but
`"decided"`, `suggestions` is empty.

| `state`           | Meaning                                                                         |
| ----------------- | ------------------------------------------------------------------------------- |
| `"decided"`       | `suggestions` is the decision; empty when the run had nothing to draw           |
| `"pending"`       | The run has not finished, or it is in a batch that has not finished             |
| `"opted-out"`     | The run was started with `{ style: false }`                                     |
| `"not-succeeded"` | The run failed or was canceled                                                  |
| `"no-styles"`     | The session has no style stack; the session on `element.session` always has one |
| `"unknown"`       | The run was restored without its decision, so none is known                     |

A batch is several runs started together with `session.runs.batch([...])`. Its members are
painted together when the whole batch finishes, so a member reads `"pending"` until then. A run
from `element.run()` that you awaited is never `"pending"`.

A run started in this session never reads `"unknown"`; it is kept for a run brought back from
saved state that did not carry its decision. `painting()` returns `undefined` only for a run id
the session does not hold. More states may be
added in a minor release.

## Where a run's layers go

A suggestion goes on top of the style stack, above earlier runs, unless a layer your app wrote
sets the same channel:

- If your layer sets it on every element (its selector is `{ match: "everything" }`), the
  suggestion is suppressed. Your layer would hide it anyway.
- If your layer sets it on some elements, the suggestion is placed directly beneath your layer.

Layers that came from earlier runs never hold a later run back.

## What the decision does not tell you

- It is a snapshot of the run's first completion. Running the same algorithm again with the same
  settings keeps the first decision, because a re-run does not repaint. Undo takes the decision
  away with the run, and redo brings it back.
- `"added"` means the layers went on the stack, not that they show now. A layer added later may
  cover them. `session.styles.legend()` describes what the drawing shows now, and
  `session.styles.explain()` says which layer set each channel of one element.
- A run started from a configuration, or by another part of your app, has a decision too. Listen
  for `run:changed`, whose event carries the run as `change.run`, and read
  `runs.painting(change.run.id)` once `change.phase` is `"end"`:

```ts
session.on("run:changed", (change) => {
    if (change.phase === "end") console.log(change.run.id, session.runs.painting(change.run.id)?.state);
});
```

All of these types are exported from `@graphty/graphty-element` and
`@graphty/graphty-element/session`: `RunPainting`, `SuggestionOutcome`, `StyleSuggestion`,
`EncodingSuggestion` and `HighlightSuggestion`.
