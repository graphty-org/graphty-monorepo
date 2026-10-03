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
builds an index in one pass over the graph; every later call reads it. `element.session` exists as
soon as the element does, and `find` answers from whatever data is loaded when it is called: before
the data arrives it finds nothing.

The types are exported from `@graphty/graphty-element` (and `@graphty/graphty-element/session`):
`FindHit`, `FindResult`, `FindOptions`, `FindKind`, `FindEnd` and `FindValueRow`.

## What a hit says

`found.records` holds the hits, best first. (The field is `records` because the result has the
same page shape as `session.data.nodePage()`.) Every hit has:

- `kind`: `"node"` or `"edge"`. More kinds (runs, layers, notes) may arrive in a later release.
  The type lists only today's kinds, so in TypeScript a `default` branch sees `never`: skip the
  hit there rather than reading it, as in the example below.
- `id`: the node's id, or the edge's element-assigned id.
- `match`: where the text was found, `{ path, value }`. `path` is `"id"` for a node's id,
  otherwise the attribute's column key as `session.data.attributes()` reports it, such as
  `"data.name"`.
- `target`: a selection target naming exactly this element, for `session.selection.apply`.
- `excludedBy: { kind: "filter" }`, only when `session.visibility` hides the element. The time
  window is part of that filter, so it is reported the same way. Hidden elements are still found
  by default; your list decides how to show them. Pass `scope: "visible"` to leave them out
  instead, and then no hit carries `excludedBy`.

A node hit also has `name`: the value of the label column (the
`data.knownFields.nodeLabelPath` setting) when one is set, otherwise the id as text. An edge hit
has `ends: { source, target }`, each `{ id, name }`, so you can write the edge however your
interface writes edges. `session.data.statistics().directedness` says whether the graph is
directed. Note the two different `target`s on an edge hit: `hit.target` is what to select, and
`hit.ends.target` is the node the edge points to.

```typescript
import type { FindHit } from "@graphty/graphty-element";

function label(hit: FindHit): string | null {
    switch (hit.kind) {
        case "node":
            return hit.name;
        case "edge":
            return `${hit.ends.source.name} -> ${hit.ends.target.name}`;
        default:
            return null; // a kind this code does not know yet: leave it out of the list
    }
}
```

The result is a page: `records`, `offset`, `total` (every hit, not just this page) and `revision`
(it changes when the data does: call `find` again and compare, so a list held across an undo can
tell it is stale). When `total` is more than `offset + records.length`, there are more hits to
page to.

## What is searched

- A node: its id, its name and its attribute values.
- An edge: its own attribute values only. Its id is an opaque string the element assigned, so it
  is not searched; and typing a node's name does not list every edge at that node.
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

`find` reads the same prefixes as `session.selection.apply({ text })`. An attribute can be typed
by its name (`group:`) or by its column key as `match.path` reports it (`data.group:`).

| Typed                   | Finds                                                                   |
| ----------------------- | ----------------------------------------------------------------------- |
| `val`                   | any id, name or value containing "val"                                  |
| `exact:val`             | only an id, name or value that is exactly "val"                         |
| `group:2`               | only the `group` attribute (or `id:` for the id); text matches anywhere |
| `regex:^Val`            | nothing: sets `notSearchable: "regex"`                                  |
| `` =data.group > `2` `` | nothing: sets `notSearchable: "expression"`                             |

`notSearchable` means "this text is a pattern for the reader to commit, not text to find". A
regular expression or an expression is not run while the reader types, because a half-typed
pattern is usually invalid and some patterns are slow. Run it when the reader commits, with
`session.selection.apply({ text: box.value })`.

The two do not match alike yet. `selection.apply({ text })` searches nodes only, by id and
attribute values; with an attribute prefix it wants the whole value (ignoring case), and
`exact:` is case-sensitive. A later major release moves it onto the matcher `find` uses.

## Options

| Option   | Default            | What it does                                                            |
| -------- | ------------------ | ----------------------------------------------------------------------- |
| `limit`  | 20                 | The most hits returned. `Infinity` for all                              |
| `offset` | 0                  | How many hits to skip, for paging                                       |
| `kinds`  | `["node", "edge"]` | What to list                                                            |
| `scope`  | the whole graph    | Where to search, any scope `session.scope` accepts, such as `"visible"` |

Blank text finds nothing. A `limit` or `offset` that is not a whole number of zero or more, or an
unknown kind, is refused with a `GraphtyError` coded `E_OPTION_RANGE`.
