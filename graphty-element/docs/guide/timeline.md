# Timeline

Show a graph as it was over time: pick the column that holds each element's time, then move a window
along it. Only what falls inside the window is drawn.

Everything on this page needs the `timeline` experiment. Switch it on with `features="timeline"` on
the element, or see [Experiments](./experiments) for the other ways. The JavaScript snippets below
assume it is on, and `g` is the element and `time` is `g.session.time`.

## Your first timeline

A file of emails, one edge per row, with a `sent` column:

```csv
source,target,sent
ann,bob,2026-01-01T09:00:00Z
bob,cid,2026-01-02T09:00:00Z
```

```html
<graphty-element
    features="timeline"
    data-source="url"
    data-source-config='{"url": "emails.csv"}'
    edge-time-path="data.sent"
></graphty-element>
<button id="play">Play</button>
<script type="module">
    import "@graphty/graphty-element";
    const g = document.querySelector("graphty-element");
    await new Promise((r) => g.addEventListener("data-loaded", r, { once: true }));
    const { time } = g.session;
    await time.ready; // the time field is indexed
    document.querySelector("#play").onclick = () => (time.playing ? time.pause() : time.play({ step: "day" }));
    g.session.on("time:step", (s) => console.log(s.from, s.to, s.entered.edges));
</script>
```

Play opens a window one day wide at the start of the data and slides it to the end, then stops.
Nodes follow their edges: a node shows while one of its edges is in the window. `from` and `to` are
epoch milliseconds, and `to` is excluded.

## Choosing the time column

`edge-time-path` and `node-time-path` name the column; `edge-time-unit` and `node-time-unit` say how
to read numbers. A column is named by itself (`sent`) or as `data.sent`; the two are the same. From
code:

```js
await g.session.time.setField({ edges: { start: "sent" } });
```

Text in ISO 8601 form and numbers are read directly. Left out, the unit comes from the values: whole
numbers from 1000 to 2999 are years, epochs are seconds or milliseconds, and any other numbers are
plain ordered steps (`"ordinal"`). `time.candidates()` lists the columns that read as time, and
`time.notices()` reports values that did not.

Before a load, a draft says which columns look like time, and applies nothing. A column looks like
time when every sampled value is a strict date, or when its name speaks of time (`date`, `time`,
`timestamp`, `year`, `start`, `end`, `created`, `sent`, `when`, `period`) and every sampled number
fits an epoch or a calendar year.

```js
const draft = await g.session.data.prepare({ type: "csv", config: { url: "emails.csv" } });
const found = draft.findings.find((f) => f.code === "time.found");
if (found) {
    console.log(found.params.column, found.params.from, found.params.to);
    await draft.load({ mapping: { tables: { [found.params.table]: { time: found.params.column } } } });
}
```

`from` and `to` are epoch milliseconds, the earliest and latest instant the column reads as once
designated. Each such column also has `looksLike: "time"` in `draft.tables`. A column the element
already gave a role is not reported, and a load with no `time` role designates nothing. The mapping
works the same on a file whose format sets its roles, such as JSON or GraphML: on those tables it
takes `time` and `timeUnit` and nothing else.

## Elements that exist for a span

A tenure, a contract or a lease has a start and an end. `node-time-end-path` and `edge-time-end-path`
name the end column, beside the start:

```html
<graphty-element
    features="timeline"
    data-source="url"
    data-source-config='{"url": "tenures.csv"}'
    node-time-path="hired"
    node-time-end-path="left"
></graphty-element>
<script type="module">
    import "@graphty/graphty-element";
    const g = document.querySelector("graphty-element");
    await new Promise((r) => g.addEventListener("data-loaded", r, { once: true }));
    await g.session.time.ready;
    await g.session.time.window({ from: "2020-01-01", to: "2021-01-01" });
</script>
```

An element is inside a window when it starts before `to` and ends after `from`, so one that ends
exactly at `from`, or starts exactly at `to`, is out. A missing end means it is still going. A missing
start means it was always there, when an end is present. A row with neither has no time and follows
`missing`. An end at or before its start reads as an instant at the start.

An element that comes and goes has spells: a column holding a list of `{ start, end }`, `[start, end]`
or bare instants. Spells have no attribute, so they go through `setField`:

```js
await g.session.time.setField({ nodes: { start: "start", end: "end", spells: "spells" } });
```

A row with a non-empty list is timed by that list alone, whatever `start` and `end` hold, and is inside
while any of its spells overlaps the window. It leaves in a gap between spells and comes back after,
and `time.changes()` says so. The `start` column may be absent. GEXF's open-bound flags (`startOpen`,
`endOpen`) are ignored: they move a bound by one tick.

When nodes and edges both name an `end`, or both name `spells`, they must name the same column, or
`setField` refuses with `reason: "time-paths-differ"` and `field` naming which. A kind naming neither
keeps instants.

`extent()` covers the finite bounds, and open ones do not stretch it; an element with only an end
starts the extent one unit before that end, so the extent as a window shows it. A bar of `bins()` counts the
spans overlapping it, so a long element counts in every bar it crosses, and an element with two spells
in one bar counts twice there.

## Files that declare their time

Some formats say which columns hold time, and the element designates them as the file loads, in the
load's own step: undoing the load takes the field back with it. A time field already set, by an
attribute or a saved project, is kept.

- **GEXF** with `mode="dynamic"`: on each of nodes and edges that has times, `start`, `end` and
  `spells`, or `timestamp` and `timestamps` with `timerepresentation="timestamp"`. A `timestamps` list
  reaches each record as a list of instants, so a window holds an element when one of them is inside.
  `timeformat="date"` and `"dateTime"` read as dates, `"integer"` and `"double"` as plain steps.
- **XGMML** (Cytoscape DynNetwork): `start` and `end`, on a kind that has both.

```js
g.session.on("time:field", ({ field }) => console.log(field));
await g.session.data.import({ type: "gexf", config: { url: "dynamics.gexf" } });
```

A reader of your own format ([Custom data sources](./extending/custom-data-sources)) declares its
time the same way, by calling its protected `declareTime` before it yields the parsed rows:

```js
class SpansSource extends DataSource {
    async *sourceFetchData() {
        const { nodes, edges } = parse(await this.getContent()); // your parser
        this.declareTime({ edges: { start: "from", end: "until" } });
        yield* this.chunkData(nodes, edges);
    }
}
```

`DataSource.fromImporter` takes a `time` option instead: a function of the imported graph returning
the field, or null.

## Reading the data's time

After `await time.ready`, these answer at once:

```js
const extent = time.extent(); // { from, to, nodes, edges }, or null when nothing has a time
const bins = time.bins({ count: 50 }); // [{ start, end, nodes, edges }, ...]
```

A column of 50,000 rows or more is indexed in the background, a few milliseconds at a time, so the
page keeps drawing. Until it is done, and during a load at any size, `extent()` and `bins()` return
null and `notices()` returns none: wait on `time.ready`, or redraw on `time:ready`. `time.ready` also
waits for a load or a `setField` running, and if the field or the data changes meanwhile it waits for
the index of what is there now. A window set in the meantime is applied at once, and `parse()` and
`spanOf()` finish the build to answer, which holds the page for as long as the rest of it takes. Rows
added later are merged into the index without reading the rest of the column again; a field with an
end or spells reads its columns again instead.

`time.bins({ count: 50, scope: "visible" })` counts only what passes your filters. The window does
not narrow it, so a bar outside the window keeps its filtered count: draw the two kinds of bar
differently from the window's bounds. The counts are kept until the filter, the data or the bins
change, so reading them on every step costs nothing.

## Moving the window

```js
await time.window({ from: "2026-01-01", to: "2026-02-01", step: "day" }); // set it
await time.stepBy(1); // one step on
await time.seek("end"); // to the last window
await time.window(null); // clear it
```

Each of these is undoable, and the window is saved in the project. Moves made in quick succession
merge into one undo step, as a drag does; `await time.commit()` always records its own step. `play`
records one step for the whole play. It takes `step`, `mode` (`"sliding"`, or `"cumulative"` to grow from the start),
`interval` (milliseconds per step, default 1000), `loop`, `motion`, `timeZone` and `waitForRender`.

With `motion: "steps"`, a play keeps to its timer even if drawing falls behind. Pass
`waitForRender: true` to wait for each step to be drawn before timing the next. Nothing stops a play
for long when no frame is coming, such as on a hidden page.

While a window is moving without being recorded, as in a smooth play or a `seek` with `commit: false`,
the two windows differ: `time.current` is the window on screen, and `time.committed` is the one undo
and the project file hold. `await time.commit()` records where a `seek` left it. A stepped play
(`motion: "steps"`, reduced motion, or `results: "rerun"`) records each window in the play's one
history step, so `time.committed` follows every step.

A move of the window redraws only what entered and left it. The exception is an edge drawn through a
support point (`edge.supportModel`): support points settle together, so a move that reveals, hides or
repaints one visits every edge. Repainting includes `outside: "ghost"` turning such an edge into a
ghost or back.

## Settings

`time.settings` holds the choices that go with the field, every default filled in, and
`time.setSettings` changes any of them as one undoable step, saved in the project:

```js
await time.setSettings({ step: "week", mode: "cumulative", results: "rerun", missing: "outside" });
```

- `step`: the window's width and how far it moves. `"auto"` (the default) picks the calendar step
  closest to a twentieth of the data's span; `time.current.step` says which.
- `mode`: `"sliding"` (the default) or `"cumulative"`, a window that grows from the start of the data.
- `results`: what a window move does to algorithm results computed over the visible graph.
  `"stale"` (the default) marks them out of date, `"keep"` leaves them current, and `"rerun"` runs
  them again over each new window, a play waiting for them at every step.
- `missing`: `"inside"` (the default) keeps elements with no time in every window; `"outside"` hides
  them.
- `outside`: `"hide"` (the default) or `"ghost"`, which keeps elements outside the window drawn in the
  `"ghosted"` element state (`{ match: "state", state: "ghosted" }` in a style layer), never counted
  as visible.
- `timeZone` and `ageFade`: see [Time zones](#time-zones) and [Fading older edges](#fading-older-edges).

## Fading older edges

`ageFade` fades the edges in the window by how long ago they started, so the newest stand out
while a window plays:

```js
await time.setSettings({ ageFade: 0.2 }); // older edges in the window fade toward 20%
time.play();
```

An edge starting at the window's first instant draws at `ageFade` times its opacity, one at the
window's end at full opacity, and those between in proportion. The default, 1, draws no fade. The
setting is saved in the project and leaves the window where it is. A value outside 0 to 1 is refused
with `E_BAD_COMMAND`.

It applies to edges timed by an instant or by a start and an end, with `outside: "hide"`. Elsewhere it
draws nothing, and `time.notices()` holds `time.age-fade-inactive` with a `reason`:
`"no-edge-time"` (the field times only nodes), `"spells"` (the edges carry spells or lists of
instants) or `"ghost"`. A line drawn with `line.blending` false stays opaque. Straight animated lines
(`line.animationSpeed`) and patterned lines keep their opacity, except a dash or dot line that bends
or curves, which fades. Arrowheads keep their opacity too.

## Every window at once

`time.series` counts every window of a step without moving what is on screen, for a chart over time:

```js
const { rows } = await time.series({ step: "month", measures: ["density"] });
for (const row of rows) console.log(row.from, row.visible.edges, row.values.density);
```

Each row has `from`, `to`, the `visible` counts of nodes and edges, what `entered` and `left` since
the row before (in the first row, everything it shows entered), and a value for each measure in
`values`. The measures are `"nodes"`, `"edges"` and `"density"`, which is null under two nodes.

Each window is one step wide, or in `"cumulative"` mode grows by a step, whatever the width of the
window in force: the windows stepping shows from the first window of that step, under the same
filter. `step`, `mode` and `timeZone` left out come from the window in force, else the settings.
`from` and `to` cover part of the data, and default to its start and end whatever the window in
force. A series holds at most 10,000 windows.

`series` returns a run: `run.progress` says how many windows are done and `run.cancel()` stops it.
You can also pass `signal` and `onProgress`.

## Time zones

Every instant is held in UTC, and everything reads in UTC unless you name a zone. A zone matters in
two places. Text with no offset, such as `2026-01-15T09:00:00` or `2026-01-15`, reads in the field's
`parseZone`, which only `setField` takes. Calendar steps and bins read in `timeZone`:

```js
await time.setField({ edges: { start: "sent", parseZone: "America/New_York" } });
await time.setSettings({ step: "month", timeZone: "America/New_York" });
await time.stepBy(1); // the first calendar month, midnight to midnight in New York
const days = time.bins({ step: "day" }); // bars start at local midnight
```

`window`, `bins` and `play` each take `timeZone` too. A call's zone wins, then the window's, then the
setting's. A new zone in `setSettings` snaps a sliding window to the new boundaries, as a new step
does, and a new `parseZone` clears the window. A zone is an IANA name; any other name is refused with
`E_BAD_COMMAND`, reason `"time-zone"`.

Days and longer follow the zone's clock, so a day across a clock change is 23 or 25 hours; an hour is
always 60 minutes. A time a change skipped reads as the same distance past the gap, and a time it
repeated reads as the first of the two. A year column (`unit: "year"`) always reads in UTC, so 1995
stays 1995 everywhere.

`time.timeZone` is the zone the timeline reads in now, with all of that settled. Write dates in it and
they match the bins and the window.

`time.parse` reads in `parseZone`. If you show dates in another zone, pass it, so a date a reader
types means what they see:

```js
const at = time.parse("2026-03-08", { timeZone: "Asia/Kolkata" });
```

## Jumping to the selection

`spanOf` gives the time span of any elements, ready to pass to `window`. With `incident`, the edges at
the given nodes count too, so a selected node works over edge time:

```js
const { nodes, edges } = g.session.selection;
const span = g.session.time.spanOf({ nodes, edges, incident: true });
if (span !== null) await g.session.time.window(span);
```

`span` is null when none of the elements has a time. Its `to` is just past the last instant, so the
last element is inside the window. It covers all of an element's spans, and an open start or end stops
at the data's `extent()`, so it is always a window you can pass on.
