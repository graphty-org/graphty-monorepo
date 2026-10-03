# What a Run Painted

When an algorithm run finishes, graphty-element draws its result for you: a ranking colors the
nodes, communities get one color each, a route is highlighted. Each of these is a _suggestion_
the run makes, and the element decides once, when the run first completes, whether to paint it.

`session.runs.painting(runId)` tells you what that decision was, so your app can show the reader
what changed, or say why nothing did. It reports facts (ids and codes), never sentences: the words
are yours to choose.

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;

const result = await element.run("louvain");
for (const s of session.runs.painting(result.runId)?.suggestions ?? []) {
    if (s.outcome === "painted") {
        console.log("painted", s.suggestion.channels);
    } else if (s.outcome === "suppressed") {
        console.log("hidden by layer", session.styles.get(s.byLayerId)?.name);
        // Paint it anyway, on top of that layer
        if (s.suggestion.as === "encoding") await session.styles.encode(s.suggestion.spec);
    }
}
```

The decision is ready as soon as `await` returns.

## The outcome of each suggestion

Every suggestion the run made gets one entry in `suggestions`, with an `outcome`:

| `outcome`      | What happened                                                                          | Also carries                       |
| -------------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| `"painted"`    | Its layers were added to the style stack                                               | `layerIds`, maybe `beneathLayerId` |
| `"suppressed"` | Not added: a layer you wrote already sets that channel on every element                | `byLayerId`                        |
| `"merged"`     | Not added: it was in a batch, and a later member's suggestion for the channel was used | `intoRunId`                        |
| `"refused"`    | Not added: the style stack refused it, and the same error went to `style:problem`      | `code`                             |

Every entry also carries `suggestion`, the suggestion itself: `suggestion.channels` names what it
would paint (such as `"node.color"`), and `suggestion.spec` is what `styles.encode()` or
`styles.highlight()` takes, so you can apply it yourself.

`beneathLayerId` is set when a layer you wrote colors some of the same elements. The run's layer
goes directly beneath yours, so your choice still shows where you made it and the run paints the
rest.

More outcomes may be added in a minor release, so keep a default branch when you switch on
`outcome`.

## Why a run did not decide anything

`painting.state` says whether `suggestions` holds a decision:

| `state`           | Meaning                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `"decided"`       | `suggestions` is the decision; empty when the run had nothing to draw |
| `"pending"`       | The run has not finished, or it is in a batch that has not finished   |
| `"opted-out"`     | The run was started with `{ style: false }`                           |
| `"not-succeeded"` | The run failed or was canceled                                        |
| `"no-styles"`     | The session has no style stack, so nothing is ever painted            |
| `"restored"`      | The run was recorded without a decision, so none is known             |

`painting()` returns `undefined` only for a run id the session does not hold. More states may be
added in a minor release.

## Where a run's layers go

A suggestion goes on top of the style stack, above earlier runs, unless a layer you wrote sets
the same channel:

- If your layer sets it on every element (its selector is `{ match: "everything" }`), the
  suggestion is suppressed. Your layer would hide it anyway.
- If your layer sets it on some elements, the suggestion is painted directly beneath your layer.

Layers that came from earlier runs never hold a later run back.

## What the decision does not tell you

- It is a snapshot of the run's first completion. Running the same algorithm again with the same
  settings keeps the first decision, because a re-run does not repaint. Undo takes the decision
  away with the run, and redo brings it back.
- `"painted"` means the layer was added, not that it is visible now. A layer added later may
  cover it. `session.styles.legend()` describes what the drawing shows now, and
  `session.styles.explain()` says which layer set each channel of one element.
- A run started from a configuration, or by another part of your app, has the same decision.
  Listen for `run:changed` and read `runs.painting(change.run.id)` there.

All of these types are exported from `@graphty/graphty-element` and
`@graphty/graphty-element/session`: `RunPainting`, `SuggestionOutcome` and `StyleSuggestion`.
