# Timeline

Show a graph as it was over time: pick the column that holds each element's time, then move a window
along it. Only what falls inside the window is drawn.

Everything on this page needs the `timeline` experiment. Switch it on with `features="timeline"` on
the element, or see [Experiments](./experiments) for the other ways. The snippets below leave it out.

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
to read numbers. From code:

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
const draft = await g.session.data.prepare(source);
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
added later are merged into the index without reading the rest of the column again.

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
`interval` (milliseconds per step, default 1000), `loop`, `motion` and `timeZone`.

While a window is moving without being recorded, as in a smooth play or a `seek` with `commit: false`,
the two windows differ: `time.current` is the window on screen, and `time.committed` is the one undo
and the project file hold. `await time.commit()` records where a `seek` left it. A stepped play
(`motion: "steps"`, reduced motion, or `results: "rerun"`) records each window in the play's one
history step, so `time.committed` follows every step.

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
last element is inside the window.
