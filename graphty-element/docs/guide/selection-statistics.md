# Neighborhoods in Time and Selection Totals

Two things a panel beside the graph often needs: the neighbors of a node within a date range,
and what the selected nodes and edges add up to. `element.session` is the element's session (see
[the JavaScript API](./javascript-api.md)).

## Select a neighborhood within a date range

Select a clicked node and everything joined to it by an edge dated in 2024:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;

element.addEventListener("graphty-node-click", (e) => {
    void element.session.selection.apply({
        neighborsOf: [e.detail.nodeId],
        window: { path: "data.date", from: "2024-01-01", to: "2025-01-01" },
    });
});
```

`window` takes three values:

| Field  | What it holds                                                                                   |
| ------ | ----------------------------------------------------------------------------------------------- |
| `path` | The edge attribute holding each edge's time, such as `"data.date"`.                             |
| `from` | Where the window starts, inclusive: a number, or date-time text such as `"2024-01-01"`.         |
| `to`   | Where the window ends, exclusive. `to: "2025-01-01"` keeps every edge of 2024 and none of 2025. |

Only edges whose time falls inside the window are followed. An edge's time is read the way a time
column reads it: a number as it is (so `{ from: 1999, to: 2001 }` keeps the years 1999 and 2000
of a numeric `year` column), a `Date` as its time, and text as an ISO 8601 date-time, in UTC when
it names no zone. An edge with no time, or with text that is not a date, is outside every window.

The window goes with every other neighborhood option: `depth` walks that many steps, each one
along an edge inside the window, and `direction` picks which way an edge is followed. With no
`neighborsOf`, the walk grows the current selection. A bound that is not a number or a date-time
is refused with `E_OPTION_RANGE`.

## What a selection adds up to

Show the total, lowest and highest cost of the selected nodes whenever the selection changes:

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const output = document.querySelector("#cost")!;

async function showCost(): Promise<void> {
    const { attributes } = await element.session.selection.statistics();
    const cost = attributes.find((a) => a.path === "data.cost");
    output.textContent =
        cost?.sum === undefined ? "" : `${String(cost.sum)} (${String(cost.min)} to ${String(cost.max)})`;
}

element.session.on("selection:changed", () => void showCost());
```

The words are the example's own: the statistics give you values only.

`statistics()` returns:

| Field            | What it holds                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `nodes`, `edges` | How many nodes and edges are selected.                                                    |
| `inducedEdges`   | Edges of the graph whose two endpoints are both selected.                                 |
| `cutEdges`       | Edges of the graph with exactly one endpoint selected.                                    |
| `degree`         | `{ min, max }`: the lowest and highest degree among the selected nodes. Absent with none. |
| `attributes`     | One entry per attribute the selected nodes carry.                                         |
| `edgeAttributes` | One entry per attribute the selected edges carry.                                         |

Each entry of `attributes` and `edgeAttributes` has a `path` (such as `"data.cost"`), a
`plainName` and a `count` of the elements carrying a value. A numeric attribute adds `sum`,
`mean`, `median`, `min` and `max` over the selection, `graphMean` (the same average over every
node, or every edge, of the graph) and `direction`: `"above"`, `"below"` or `"equal"`, where the
selection's average sits against the graph's. A non-numeric attribute adds `distribution`
instead: `{ value, count }` rows, commonest first.

### Totals of a scope instead of the selection

Pass a `scope` to add up something other than the selection, leaving the selection as it is:

```ts
const shown = await element.session.selection.statistics({ scope: "visible" });
const kept = await element.session.selection.statistics({ scope: { set: setId } });
```

Any scope a selection target takes works: `"visible"` (what the filter leaves shown), `"graph"`,
`"selection"`, `"largest-component"` or a kept set. To compare the steps of a filter, keep each
step as a set and ask for each set's statistics. A scope the session does not hold rejects the
promise with a `GraphtyError`.
