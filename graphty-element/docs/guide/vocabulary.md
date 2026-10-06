# Columns, Runs and Progress

A handful of small shapes recur across `element.session`: how you name a column of your data,
how you name a run's result, how you hand back an id the element gave you, how the element
reports a fact without choosing words for it, and how it reports progress. They are the same
everywhere they appear, so learning them once covers every method that takes them.

All of them are exported as types from `@graphty/graphty-element` and
`@graphty/graphty-element/session`.

## A column of your data: `ColumnRef`

A column is named by where it lives and its name, exactly as your file spelled it:

```ts
import type { ColumnRef } from "@graphty/graphty-element";

const trips: ColumnRef = { kind: "edge", name: "trips" };
const chapters: ColumnRef = { kind: "edge", name: "shared chapters" }; // spaces are fine
```

The name is never an expression: `a.b`, `min-cut` and `w || x` are just names. Every column
`session.data.attributes()` lists already has `kind` and `name`, so you can pass one straight in:

```ts
const department = element.session.data.attributes().find((a) => a.kind === "node" && a.name === "department");
```

A method that is handed a column the graph does not have throws a `GraphtyError` with code
`E_UNKNOWN_ATTRIBUTE`; `error.details.candidates` lists the nearest names.

Each attribute also has a `path` (`data.department`). It names the same column, unquoted. To put
it inside an expression, quote it first:

```ts
import { quotePath } from "@graphty/graphty-element/session";

await element.session.selection.apply({ where: `${quotePath(department.path)} == 'sales'` });
```

## A run's result: `ResultRef`

A run's output is named by the run and, optionally, one of its fields. Leave the field out and
you get the run's main value (`value` for a ranking, `group` for communities), so you never need
to know what an algorithm calls its number:

```ts
const run = element.session.runs.start("pagerank");
await run;

// The ten highest-ranked nodes, by the run's main value.
await element.session.selection.apply({ top: { run, n: 10 } });
// Or name a field outright.
await element.session.selection.apply({ above: { run, field: "value", threshold: 0.05 } });
```

`run` can be the handle `runs.start()` returned, its awaited result, or its id.

## Ids the element handed you

Node ids can be numbers (karate's are). Any id the element gives you can go straight back into a
selection:

```ts
const ids = element.session.data.nodePage({ limit: 5 }).records.map((node) => node.id);
await element.session.selection.apply({ ids }); // numbers and strings alike
```

An id that names nothing is reported on the result's `unmatched`, as text. A call that needs an
element to exist and is given an id the graph does not hold throws `E_UNKNOWN_ELEMENT`, with
`details.kind` (`"node"` or `"edge"`) and `details.id`.

## Facts, not sentences: `CodedFact`

graphty-element never writes words for your reader. Where it has something to say about the
graph, it hands you a code and the values it is about, and your application decides the wording,
the language and whether to show it at all:

```ts
import type { CodedFact } from "@graphty/graphty-element";

function describe(fact: CodedFact): string | null {
    switch (fact.code) {
        case "example.count":
            return `${String(fact.params.count)} items`;
        default:
            return null; // a code you do not know yet: leave it out
    }
}
```

Each method that returns facts lists its codes and what each parameter holds. New codes can
appear in a minor release, so always keep a default branch. A parameter that came from your data
(a column name, a value) is your data's own text: escape it before putting it into HTML.

## Progress

Loads and algorithm runs report how far they have got on one stream. In a page, listen on the
element; without one (in Node or a worker), listen on the session:

```ts
element.addEventListener("graphty-progress-change", (e) => {
    const { task, phase, completed, fraction } = e.detail;
    bar.hidden = phase === "end";
    bar.value = fraction ?? 0; // null: the total is unknown, show a spinner instead
    label.textContent = `${task}: ${completed}`;
});

session.on("progress:changed", (change) => console.log(change.task, change.phase, change.completed));
```

`task` is `"load"`, `"prepare"` (reading a load draft) or `"run"` (more may be added, so handle one
you do not know); a run's report
also carries `run`, the run's id. Every task sends `phase: "end"` once when it stops, whether it
succeeded, failed or was cancelled. A load cannot know its size in advance, so `completed` counts
the node and edge records read so far and `total` and `fraction` are `null`. On the element,
steps are sent at most every 100 ms per task; the first change and the end always arrive.

A load says more, so a view that did not start it -- a canvas beside a separate file picker --
can follow it from start to finish:

- The first change (`phase: "progress"`, `completed: 0`) arrives as the load begins, before the
  file or URL is read. Show the loading state from here, not from the first record.
- `source` is on every load change: `{ name, url }`, the name the load was given or the file's
  name or the URL's last part, and the URL when it came from one. Either may be absent.
- `outcome` is on the end: `"succeeded"`, `"failed"` or `"cancelled"`. A failure that carried a
  code also has `error: { code, details }`, the same code and details the call that started the
  load rejected with -- for `E_TOO_LARGE`, the `limit`, the `count` and what it counted (`of`).

```ts
session.on("progress:changed", (change) => {
    if (change.task !== "load") return;
    if (change.phase === "progress") card.show("reading", change.source?.name, change.completed);
    else if (change.error?.code === "E_TOO_LARGE") card.show("too-large", change.error.details);
    else card.hide();
});
```
