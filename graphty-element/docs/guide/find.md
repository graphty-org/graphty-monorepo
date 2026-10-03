# Finding

A find box lists what matches as the reader types, and selects only what the reader picks.
`session.data.find(text)` answers the list: the nodes and edges whose id or values contain the
text, best match first, and one row per matched value with how many elements carry it. It never
changes the selection or the undo history.

## Quick start

```typescript
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
await session.data.addNodes([
    { id: "n1", name: "Valjean", group: 2 },
    { id: "n2", name: "Javert", group: 2 },
    { id: "n3", name: "Fantine", group: 3 },
]);
// Name nodes by their "name" attribute rather than their id
await session.config.set({ data: { knownFields: { nodeLabelPath: "name" } } });

const found = session.data.find("val", { limit: 10 });
found.elements; // [{ kind: "node", id: "n1", label: "Valjean", matched: { path: "data.name", value: "Valjean" } }]
found.total; // 1: how many nodes and edges matched before the limit

// The reader picks a hit: select it
const [hit] = found.elements;
await session.selection.apply(hit.kind === "node" ? { nodes: [hit.id] } : { edges: [hit.id] });

// Or a value row, "group is 2 (2 nodes)": select every node carrying it
const [row] = session.data.find("2", { kinds: ["value"] }).values;
await session.selection.apply({ where: row.where }); // n1 and n2
```

## What a hit says

Each entry in `elements` is one node or edge:

- `label` is what to show. A node's label is its label attribute (the `nodeLabelPath` setting)
  when one is set, else its id. An edge's label names its two ends, `"Valjean -> Javert"` on a
  directed graph and `"Valjean -- Javert"` otherwise.
- `matched` says where the text was found: `{ path: "id", value }` for the id, or an attribute
  path such as `{ path: "data.name", value: "Valjean" }`.
- `excludedBy: "filter"` is present when the visibility filter or the time window leaves the
  element out, so the list can say "hidden by a filter" instead of selecting something the
  reader cannot see.

Matching ignores case. Hits are ordered: an exact label or id first, then a label or id that
starts with the text, then a label or id that contains it, then an exact attribute value, then
any other value containing the text. Within each tier they keep the order the graph holds them in.

## Value rows

Each entry in `values` is one attribute value the text matched, such as `group` is `2`:
`{ kind, path, value, count, where }`. `count` is how many nodes (or edges) carry exactly that
value, the number `session.scope.count({ where })` gives, and `where` is the rule that selects
them. Ids and labels are listed as element hits, not as value rows.

## Options

| Option  | Default                     | What it does                                                       |
| ------- | --------------------------- | ------------------------------------------------------------------ |
| `limit` | 20                          | The most element hits, and the most value rows. `Infinity` for all |
| `kinds` | `["node", "edge", "value"]` | What to list                                                       |

Blank text finds nothing. A `limit` that is not a whole number of zero or more, or a kind not in
the list, is refused with a `GraphtyError` coded `E_OPTION_RANGE`.
