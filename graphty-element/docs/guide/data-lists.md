# Pie, Chart and Record from Data

A node can draw a pie, a bar chart or a small table (a record) worked out from its own data. You
write a list of **entries** to one channel, and graphty-element reads, counts, formats, orders and
colors them for every node:

| Channel           | Draws                               | Fills                                                                    |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `node.pieData`    | a pie, one slice per part           | `node.pieColors`, `node.pieSizes`, `node.pieOpacities`                   |
| `node.chartData`  | a chart, one bar (or cell) per part | `node.chartValues`, `node.chartColors`, `node.chartMin`, `node.chartMax` |
| `node.recordData` | a record, one row per entry         | `node.labelTable` (table layout) or `node.shapeTexts` (points layout)    |

## A first pie

Each node holds a list of animals, such as `["dog", "dog", "cat", "horse"]`. One entry draws one
slice per animal, sized by how often it occurs (dog 2, cat 1, horse 1):

```ts
import { createGraphSession } from "@graphty/graphty-element/session";

const session = createGraphSession();
await session.data.addNodes([
    { id: "a", animals: ["dog", "dog", "cat", "horse"] },
    { id: "b", animals: ["cat", "horse"] },
]);

await session.styles.add({
    name: "Animals",
    selector: { match: "everything" },
    set: { "node.pieData": { entries: [{ field: "data.animals" }] } },
});
```

Every category has one color on every node: "cat" is the same color on `a` and on `b`.

## Entries

An entry names exactly one source:

| Entry                                | What it gives                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `{ field: "data.amount" }`           | the node's value: one part, or one per item when the value is a list                                        |
| `{ pattern: "expr_" }`               | every number column whose name starts with `expr_` (any case), in natural order (`expr_2` before `expr_10`) |
| `{ pattern: "expr_", except: true }` | every other number column                                                                                   |
| `{ graph: { over, measure, ... } }`  | a value computed over the node's edges, neighbors or members (see "Graph values" below)                     |
| `{ value: 3 }`                       | a fixed number (pie and chart)                                                                              |
| `{ text: "Cluster" }`                | fixed words (record)                                                                                        |

Several entries draw in order, and fixed entries mix with spreading ones in one pie:

```ts
set: {
    "node.pieData": {
        entries: [{ field: "data.card" }, { field: "data.ach" }, { field: "data.animals" }],
    },
}
```

A pattern is read again whenever the data changes, so a column loaded later joins it.

### Lists

A list value spreads by its entry's `each`:

| `each`                              | List of words                            | List of numbers                 |
| ----------------------------------- | ---------------------------------------- | ------------------------------- |
| absent                              | `"count"`: one part per value, its count | `"items"`: one part per item    |
| `"equal"`                           | one part per value, each the same size   | -                               |
| `"sum"`, `"mean"`, `"min"`, `"max"` | -                                        | one part holding that statistic |

An object of numbers, such as `{ in: 2, out: 3 }`, spreads one part per key.

### Name, format and color

Every entry may carry:

- `label`: its name, shown by `dataFacts` and in a record's name cell. Absent, the column's own name.
- `format`: how its value is written (see "Formats" below).
- `color`: the color of its slice or bar, or of a record value's text.

## Graph values

A `graph` entry computes a value over what surrounds each node. Nothing is written to the data:
the value is worked out while the layer paints, once per node.

```ts
// One slice per community among each node's neighbors.
set: {
    "node.pieData": {
        entries: [
            {
                graph: {
                    over: "neighbors",
                    measure: "count",
                    groupBy: { by: "value", path: "data.community" },
                },
            },
        ],
    },
}
```

| Field       | Meaning                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `over`      | `"edges"` (each edge at the node, a self-loop once), `"neighbors"` (each node within `hops`, once, never itself) or `"members"`     |
| `direction` | `"in"`, `"out"` or `"both"` (the default); an undirected graph is always read as `"both"`                                           |
| `hops`      | neighbors only: 1 (the default), 2 or 3                                                                                             |
| `measure`   | `"count"`, `"sum"`, `"mean"`, `"min"`, `"max"`, or `"mode"` (the most common value; ties go to the first in natural name order)     |
| `of`        | what sum, mean, min, max and mode read: `{ path, on? }`; `on` is `"edge"` (the edge walked) or `"node"` (the node at the other end) |
| `where`     | one `range` or `categories` leaf: only what it keeps counts; `whereOn` says whether it reads the edge or the far node               |
| `groupBy`   | one value per group: `{ by: "value", path }`, `{ by: "direction" }` (edges: `"in"` and `"out"`) or `{ by: "time", path, period }`   |

Over edges, `of`, `where` and `groupBy` read the edge unless they say `on: "node"` (`whereOn: "node"`);
over neighbors and members they read the node. A node whose walk keeps nothing has a missing value.

Money out by channel, as one slice per channel:

```ts
{ graph: { over: "edges", direction: "out", measure: "sum", of: { path: "data.amount" },
           groupBy: { by: "value", path: "data.channel" } } }
```

### Members of a group

`over: "members"` walks the nodes whose `parent` is this node (a compound node), or, for a node a
`session.groups.collapse` made, the members it holds. Up and down regulation among a cluster's genes:

```ts
{ graph: { over: "members", measure: "count", groupBy: { by: "value", path: "data.regulation" } } }
```

### Time periods

`groupBy: { by: "time", path: "data.when", period: "month" }` gives one value per month, keyed
`2026-03`. The periods are `"hour"` (`2026-03-05T14`), `"day"` (`2026-03-05`), `"week"` (ISO week,
`2026-W10`), `"month"`, `"quarter"` (`2026-Q1`) and `"year"` (`2026`), all in UTC, so name order is
time order. Every period from the graph's first date to its newest is present: an empty one holds 0
for a count and is missing for every other measure (its entry's `missing` says what it draws).

`window: { last: 12, from: "newest" }` keeps the last 12 periods, ending with the newest date in the
data (`from: "now"` ends with today). A monthly chart of the last year:

```ts
set: {
    "node.chartKind": "bar",
    "node.chartData": {
        order: "name",
        entries: [{ graph: { over: "edges", direction: "out", measure: "sum", of: { path: "data.amount" },
            groupBy: { by: "time", path: "data.when", period: "month", window: { last: 12, from: "newest" } } } }],
    },
}
```

## Order, top N and Other

```ts
set: {
    "node.pieData": {
        entries: [{ field: "data.animals" }],
        order: "largest", // or "listed" (the default) or "name"
        keep: 2, // the two largest parts; the rest merge into one Other part, drawn last
        other: { label: "Other", color: "#686868" },
    },
}
```

## Missing values and empty nodes

An entry's `missing` says what a node without a value draws:

| `missing`  | Effect                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------ |
| `"skip"`   | left out, and out of a pie's total (a pie's default)                                       |
| `"gray"`   | a thin gray slice (1% of the turn, not counted) or a short gray bar (a tenth of the scale) |
| `"zero"`   | read as 0                                                                                  |
| `"gap"`    | an empty place in a chart (a chart's default)                                              |
| `"drop"`   | the record row is left out (a record's default)                                            |
| `{ text }` | the record's value cell holds the text                                                     |

A pie's `empty` says what a node with no value at all draws: `"none"` (the default: nothing, even
when an entry's missing choice is `"gray"`), `"ring"` (the disc with a hole of 0.8 of its radius, or
the node's own `node.pieHole` when larger) or `"slice"` (the whole disc), in `emptyColor` (default
`#BDBDBD`).

A list of numbers with missing items spreads by place, each missing item by the entry's missing
choice. A list of words counts each word; items that are not words (objects, lists) are not counted.

## Category colors

Categories take the colors of `palette` (any palette id from `catalog.palettes()`), or of your own
`colors`, or of the element's default categorical palette. The spread categories take the palette
first, in natural name order over every node of the graph, so a filter never moves a color; then each
non-spreading entry's key takes the next color, in entry order, so adding a plain entry never
recolors a category. Pin or rename one category by its key
without touching the rest:

```ts
set: {
    "node.pieData": {
        entries: [{ field: "data.animals" }],
        palette: "tol-muted",
        categories: { cat: { color: "#ff0000", label: "Cats" } },
    },
}
```

A key is the value as the data spells it, a column's path for a field entry, `value.<place>` for a
fixed value, or a list item's place. A category that appears or disappears shifts the colors of the
unpinned categories after it in name order; pin a category's color to keep it. A category's
`opacity` (0 to 1), or a non-spreading entry's, sets its slice's opacity.

## Pies

- `whole: { max: 100, track: "#eeeeee" }` draws a gauge: each part over 100, the rest in the track.
  A node whose total passes the max draws a full pie of its own shares.
- `labels: "value"` or `"percent"` writes each slice's value (in its entry's format) or its share
  at the slice's middle, after any `node.shapeTexts` the layers beneath give. The texts follow
  `node.pieRotation` and `node.pieRadius` set on the layer or beneath it (not a pie's offset).

## Charts

`node.chartKind` stays its own channel (`bar`, `stacked-bar`, `line`, `box`, `cells`).

```ts
set: {
    "node.chartKind": "bar",
    "node.chartData": {
        entries: [{ pattern: "expr_" }],
        series: { separator: "_" }, // expr_ctrl_1 and expr_ctrl_2 are one series, one color
        scale: { share: "layer", clip: [5, 95], normalize: "raw" },
    },
}
```

- `scale.share`: `"layer"` (one scale over the layer's nodes, the default), `"graph"` or `"node"`.
- `scale.min` and `scale.max` fix the range; `scale.clip` cuts the shared range at two percentiles.
- `scale.normalize`: `"share"` writes each value as its share of its series, `"rank"` its rank.
- Kind `"box"` draws one box per series (by `series.separator`; without one, one box over every
  value), each the five-number summary of its values; a missing value is never in a box. Set the
  kind on the layer holding the spec or beneath it: a kind set by a layer above is not read when the
  values are summarized. Kind `"cells"` colors each value from
  `palette` (or `colors`) read as a ramp, centered on `scale.center`.

## Records

```ts
set: {
    "node.recordData": {
        header: "data.gene",
        entries: [
            { field: "data.degree" },
            { field: "data.logFC", format: { signDisplay: "always", maximumFractionDigits: 2 } },
            { field: "data.padj", label: "p", format: { notation: "scientific" } },
        ],
        rows: "zebra", // or "plain" or "lines"
        most: 5, // past five rows, one "+n" row
    },
}
```

`layout: "points"` draws each value alone at its entry's `at` point (in the frame
`node.shapeTexts` uses), stacking rows that give none. Words from the data are always drawn as
written, never read as label markup.

## Formats

A `format` is the binding number format with a few more fields. Each is the `Intl.NumberFormat`
option of the same name unless noted:

| Field                                             | Example                                                    |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `maximumFractionDigits`, `minimumFractionDigits`  | `{ minimumFractionDigits: 2 }`: 34.00                      |
| `style: "percent"`                                | 0.25 as 25%                                                |
| `style: "currency"`, `currency: "USD"`            | 12.5 as $12.50                                             |
| `notation: "compact"` or `"scientific"`           | 12345 as 12K, or 1.235E4                                   |
| `signDisplay: "always"`                           | 3 as +3                                                    |
| `prefix`, `suffix`                                | `{ prefix: "#" }`: #3 (text values too)                    |
| `date: { style: "absolute", dateStyle: "short" }` | an instant as 3/5/26, in UTC                               |
| `date: { style: "relative" }`                     | "3 days ago", measured against the newest date in the data |

`formatValue(value, format)` from `@graphty/graphty-element/catalog` is the same formatter, for an
editor that previews a format.

## Reading what a node draws

`session.styles.dataFacts(layerId, channel, node)` returns what one node draws: each entry's value,
its text in the entry's format, a spreading entry's parts with their colors, every category in
color order, and `undrawn`, why the node draws nothing, as a code:

| Code                | Params                                                                           |
| ------------------- | -------------------------------------------------------------------------------- |
| `data.noEntries`    | -                                                                                |
| `data.noValues`     | `paths`: every path the entries read                                             |
| `data.notNumbers`   | `path`, `valueKind`: a pie's or chart's value is not a number                    |
| `data.zeroTotal`    | -                                                                                |
| `data.nothingOver`  | `over`: every entry is a Graph value whose walk kept nothing                     |
| `data.patternEmpty` | `pattern`, `except`                                                              |
| `data.paintedOver`  | `layerId`, `filled`: a layer above writes a list this one fills                  |
| `data.notPainted`   | `layerId`: the layer paints no spec on this channel now (hidden, disabled, none) |

Every code also carries `channel`. `session.styles.dataSample(layerId, channel, find, after?)`
finds a node to show: `"first"` that draws, `"next"` after `after`, one that draws nothing
(`"undrawn"`, a node a layer above paints over included) or one with a missing value (`"missing"`);
null when there is none, or when the layer paints no spec now.

`dataFit(channel, value)` from the catalog says whether a readable value fits: `data.needsNumbers`
for words offered to a pie or chart, `data.wrongHalf` for an edge value.

## Stacking

A data channel's lists stand exactly where a layer writing those lists would stand. A layer above
that writes `node.pieColors` wins it; an item address above (`node.pieColors.1`) changes one slice.
`styles.explain({ node })` reports each filled list as `mode: "encoded"`, `from: "node.pieData"`.

## Refusals

`styles.add` and `styles.update` refuse a bad spec with `E_BAD_COMMAND` and `details.reason`:

| `details.reason` | Refused                                                                                                                                                                                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-and-fixed` | a data channel and the fixed lists it fills on one layer (`details.channels`); a chart's `node.chartMin` and `node.chartMax` count                                                                                                                          |
| `entry-source`   | an entry with no source, or two; a Graph value with an unknown `over`, `measure` or `groupBy`                                                                                                                                                               |
| `entry-kind`     | a `text` entry on a pie or chart, or a `value` entry on a record                                                                                                                                                                                            |
| `measure-of`     | a Graph value measuring anything but count with no `of`                                                                                                                                                                                                     |
| `hops`           | hops other than 1, 2 or 3                                                                                                                                                                                                                                   |
| `window`         | a window whose `last` is not a whole number from 1                                                                                                                                                                                                          |
| `where`          | a `where` that is not one `range` or `categories` leaf                                                                                                                                                                                                      |
| `keep`, `most`   | not a whole number from 1                                                                                                                                                                                                                                   |
| `clip`           | not 0 <= lo < hi <= 100                                                                                                                                                                                                                                     |
| `palette`        | a palette that is not known                                                                                                                                                                                                                                 |
| `colors`         | a color that does not parse                                                                                                                                                                                                                                 |
| `shape`          | not `{ entries: [...] }`, or more than 256 entries                                                                                                                                                                                                          |
| `option`         | an option of the wrong type or outside its words: `whole.max` not above 0, an unknown `order`, `labels`, `empty`, `layout`, `rows`, `each` or `missing`, a `label` that is not text, an `opacity` outside 0 to 1, a category override that is not an object |

A spec is one value, so changing it is one `styles.update` and one undo step. A palette a spec names
travels in the saved file, and a column rename follows every path in the spec.
