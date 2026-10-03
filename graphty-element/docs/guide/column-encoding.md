# Coloring by a Column

Color or size the graph by a column of your own data in one call. graphty-element picks the
scale, the palette and the size range from what the column measures, and writes them into the
layer it adds.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;
await session.data.import({ config: { url: "/staff.graphml" } });
const department = session.data.attributes().find((a) => a.kind === "node" && a.name === "department")!;

// Department codes 1..14 are groups, not amounts. Numbers are drawn as a ramp unless you say so.
await session.data.declare(department, { measurement: "categorical" });
await session.styles.encode({ column: department, channel: "node.color" });

for (const block of session.styles.legend()) {
    for (const swatch of block.swatches) console.log(swatch.value, swatch.color, swatch.role);
}
```

A column is named with a [`ColumnRef`](./vocabulary#a-column-of-your-data-columnref),
`{ kind, name }`. Every entry of `session.data.attributes()` is one, so you can pass it as it is.
`attributes()` lists the columns of the data loaded now: it is empty before the first load, so
await the load first. `declare` and `encode` name a column the graph already has.

## What a column measures

Every attribute reports a `measurement`:

| `measurement`    | Meaning                                  | How `encode` draws it          |
| ---------------- | ---------------------------------------- | ------------------------------ |
| `"categorical"`  | names of groups, with no order           | one color per value            |
| `"ordinal"`      | groups with an order (low, medium, high) | colors and sizes in that order |
| `"quantitative"` | amounts                                  | a color ramp, or a size range  |
| `"time"`         | points in time                           | no default yet: name a scale   |

The element infers it from the value type alone: strings and booleans are `"categorical"`,
numbers are `"quantitative"`. It never infers `"ordinal"` or `"time"`, and it never guesses from
how many distinct values there are, so a column does not change meaning when next month's file is
longer. `measurementSource` says who decided: `"inferred"`, or `"declared"` once you say so. The
type also lists `"catalog"` and `"file"`, which no data column reports today; they are reserved for
algorithm results and for file formats that write a column's measurement down.

The values are an open set: treat one you do not know as no measurement.

## Saying what a column measures

`session.data.declare(column, declaration)` overrides the inference, as one undoable step:

```ts
await session.data.declare({ kind: "node", name: "department" }, { measurement: "categorical" });
await session.data.declare(
    { kind: "node", name: "risk" },
    { measurement: "ordinal", order: ["low", "medium", "high"] },
);
```

An ordinal declaration lists its values, lowest first. A column the graph does not have throws
`E_UNKNOWN_ATTRIBUTE` with the nearest names in `details.candidates`; a malformed declaration
throws `E_BAD_COMMAND`. Undo takes a declaration back. A declaration is saved with the project, and
the [`project:changed`](./undo#following-changes) event, which names each part of the project that
changed, names it `"attributes"`.

A declaration changes the layers you create afterwards, never one that already exists.

## What `encode` chooses

`styles.encode({ column, channel })` also takes `palette`, `scale`, `range`, `overflow`,
`missing`, `reverse` and `name` (the type `EncodingOptions`). Whatever you leave off is chosen
here:

| Measurement  | Color channel                                                              | `node.size`, `edge.width`         | Shape, line pattern                                  |
| ------------ | -------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| categorical  | `ordinal`, the smallest categorical palette that fits, `overflow: "other"` | refused                           | `ordinal`; values past the list are left as they are |
| ordinal      | each declared value mapped, in order, to the default sequential palette    | each value mapped to sizes 1 to 3 | refused                                              |
| quantitative | `linear`, the default sequential palette                                   | `linear`, `range: [1, 3]`         | refused                                              |
| time         | refused                                                                    | refused                           | refused                                              |

`ordinal` in the color column is a scale, not a measurement: a lookup from each value to its
own color. It implies no order, so a categorical column drawn with it is not treated as ordered.

Text channels such as a label read the value as it is. Naming a `scale` yourself skips the table,
and every refusal below, and writes what you asked for; that is how a time column is drawn today.

**The choice is written into the layer.** `styles.get(layer.id)?.encode` shows exactly what was
chosen (`get` returns undefined for an id the stack does not hold), and the layer keeps drawing that whatever happens to the data, a declaration or a later
release's defaults. The layer paints only the elements that carry the column.

## Asking first

`styles.proposeEncoding(spec)` answers what `encode` would store, without storing anything. It
is synchronous and cheap, so a menu can ask it for every column and channel to show only what
will draw. You need not call it before `encode`, which refuses with the same code:

```ts
const proposal = session.styles.proposeEncoding({ column: department, channel: "node.size" });
if (proposal.ok) {
    console.log(proposal.binding); // what encode() would write: { by: "data.department", scale, ... }
} else {
    console.log(proposal.refusal.code, proposal.refusal.params);
}
```

The binding is what a layer stores for one channel: `by` is the column's path in a record
(`"data.department"` for the node column `department`), and the rest is the scale, palette,
range and overflow chosen above. It can go straight into a layer you write with `styles.add()`.

A refusal is a [coded fact](./vocabulary): a `code` and its `params`, never a sentence, so your
application words it. Params are strings, numbers or null. Every refusal's params carry `kind`,
`name` and `channel`, and:

| `code`             | Why                                                                                       | Extra params                       |
| ------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| `"E_BAD_LAYER"`    | the layer `encode` would build cannot draw this column on this channel (groups on a size) | `measurement`, null with no values |
| `"E_CAP_EXCEEDED"` | a categorical column has more distinct values than the element counts, `limit` (256)      | `limit`                            |
| `"E_UNSUPPORTED"`  | a time column has no default yet                                                          | `measurement`                      |

`encode` rejects with the same code, carrying the params as `error.details`.

## The legend's "other" row

When a categorical color has more values than its palette, the smallest groups share one gray.
The legend lists that bucket as its last row, with `role: "other"`, the values it holds as an
array in `value` and how many elements carry them in `count`. Word that row yourself from those
facts rather than printing its `label`. It is kept even when the rows above it are
capped at twelve; `overflow.hidden` counts only the rows that did not fit. An ordinal column's
rows are listed in its declared order. A legend block's `kind` (`"categorical"`, `"sequential"`,
...) names the kind of palette drawn, not what the column measures.
