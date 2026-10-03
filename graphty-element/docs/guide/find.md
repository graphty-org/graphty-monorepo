# Finding

A find box lists what matches as the reader types, and selects only what the reader picks.
`session.find(text)` answers that list. It never changes the selection or the undo history: hand
a hit's `target` to `session.selection.apply` when the reader picks it.

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const box = document.querySelector<HTMLInputElement>("#find")!;
const list = document.querySelector<HTMLUListElement>("#hits")!;

box.addEventListener("input", () => {
    const found = element.session.find(box.value, { limit: 10 });
    list.replaceChildren(
        ...found.records.map((hit) => {
            const li = document.createElement("li");
            li.textContent = hit.kind === "node" ? hit.name : `${hit.ends.source.name} - ${hit.ends.target.name}`;
            li.onclick = async () => {
                await element.session.selection.apply(hit.target);
                await element.zoomToSelection();
            };
            return li;
        }),
    );
});
```

`find` is synchronous, so it can run on every keystroke. The first call after the data changes
builds an index in one pass over the graph; every later call reads it.

## What a hit says

`found.records` holds the hits, best first. Every hit has:

- `kind`: `"node"` or `"edge"`. More kinds (runs, layers, notes) may arrive in a later release,
  so give a `switch` on `kind` a `default` branch.
- `id`: the node's id, or the edge's element-assigned id.
- `match`: where the text was found, `{ path, value }`. `path` is `"id"` for a node's id,
  otherwise the attribute's column key as `session.data.attributes()` reports it, such as
  `"data.name"`.
- `target`: a selection target naming exactly this element, for `session.selection.apply`.
- `excludedBy: { kind: "filter" }`, only when the visibility filter or the time window hides the
  element. Hidden elements are still found; your list decides how to show them.

A node hit also has `name`: the value of the label column (the
`data.knownFields.nodeLabelPath` setting) when one is set, otherwise the id as text. An edge hit
has `ends: { source, target }`, each `{ id, name }`, so you can write the edge however your
interface writes edges.

The result is a page, in the same shape as `session.data.nodePage()`: `records`, `offset`,
`total` (every hit, not just this page) and `revision` (it changes when the data does, so a list
held across an undo can tell it is stale).

## What is searched

- A node: its id, its name and its attribute values.
- An edge: its own attribute values only. Its id is a counter the element assigned, and typing a
  node's name does not list every edge at that node.
- Results of algorithm runs are not searched. Select those with `{ where }` or `{ top }`.

Matching ignores case and accents. Text matches anywhere in a value, except that a number or a
boolean value matches only as a whole, so typing `2` does not find `12` or `0.25`.

The order promises three things: an exact name or id comes first; name and id matches come before
attribute values; and ties keep the order the graph holds the elements in. Finer ordering may
improve in a minor release.

## Value rows

`found.values` lists at most three attribute values the text matched, the commonest first:
`{ kind, path, value, count, target }`. `count` is how many nodes (or edges, by `kind`) in the
search scope carry exactly that value, and `target` selects exactly those, of that kind only.
Ids and names are listed as hits, not as value rows.

```typescript
const [row] = element.session.find("2").values; // { kind: "node", path: "data.group", value: 2, count: 3, ... }
await element.session.selection.apply(row.target); // the three nodes, and no edges
```

## Prefixes

`find` reads the same prefixes as `session.selection.apply({ text })`:

| Typed        | Finds                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| `val`        | any id, name or value containing "val"                                  |
| `exact:val`  | only an id, name or value that is exactly "val"                         |
| `group:2`    | only the `group` attribute (or `id:` for the id); text matches anywhere |
| `regex:^Val` | nothing: sets `notSearchable: "regex"`                                  |
| `=group > 2` | nothing: sets `notSearchable: "expression"`                             |

A regular expression or an expression is not run while the reader types, because a half-typed
pattern is usually invalid and some patterns are slow. Run it when the reader commits, with
`session.selection.apply({ text: box.value })`.

## Options

| Option   | Default            | What it does                                                            |
| -------- | ------------------ | ----------------------------------------------------------------------- |
| `limit`  | 20                 | The most hits returned. `Infinity` for all                              |
| `offset` | 0                  | How many hits to skip, for paging                                       |
| `kinds`  | `["node", "edge"]` | What to list                                                            |
| `scope`  | the whole graph    | Where to search, any scope `session.scope` accepts, such as `"visible"` |

Blank text finds nothing. A `limit` or `offset` that is not a whole number of zero or more, or an
unknown kind, is refused with a `GraphtyError` coded `E_OPTION_RANGE`.
