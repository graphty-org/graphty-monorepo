# Timeline prototype: studio decisions (2026-10-22)

The design studio reviewed the timeline prototype on branch `feat/timeline-prototype` (built from
golden with the tier 3 app redesign) in four lenses: interaction and Figma conventions, visual
design and accessibility, three persona walks (cybersecurity analyst, intelligence analyst,
historian), and a red team. Their screenshots are under
`tmp/timeline-prototype/review/{interaction,visual-a11y,personas,red-team}/` of the worktree. This
file is the director's ruling on what changes. The design it builds on is
`design/data/timeline-attribute.md`.

Rules applied: every confirmed defect is fixed; a design recommendation is taken when it serves
every domain, adds no concept the product lacks, keeps owner-approved UI and the owner's 2026-10-22
decisions, and does not flip an earlier studio decision without strong evidence. A capability goes
in graphty-element (neutral `{ code, params }` facts); words and arrangement go in the graphty
app; a shared control's defect goes in compact-mantine. Severity runs 1 (worst) to 4.

Where a reviewer's claim rests on code, it was checked: `RunsApi.reuse` throws `E_DUPLICATE_ID`
for a named run whose identity changed with the window; `TimeApi` re-runs inside
`Promise.allSettled` and skips runs in `staleBefore`; Auto step is `(extent.to - extent.from) / 20`
(`TimeApi.ts:680`, `:734`); sliding playback ends on `next.from >= extent.to` (`:903`); the dock
computes `width = max(1, round(span / 100))` and `max = from + width * 100`
(`TimeDock.tsx:56-57`).

## Decisions

Each item: what, why, owner package, and how to check it is done. Ordered by severity, then by
dependency (the element facts the app items read come first).

### Runs and results

**TL-01. A re-run after the window moved keeps its id.** (Severity 1; interaction 1, personas 1,
red team 1.)

- What: `run.rerun()` and the automatic re-run reuse the run's id over the new visible scope,
  named or unnamed; the scope is not part of the id check in `RunsApi.reuse`. An automatic re-run
  that fails publishes a run error `{ code, params }` instead of being swallowed by
  `Promise.allSettled`.
- Why: Rerun is the only recovery from "Mark out of date", and it throws; commit 89f4c97 fixed only
  unnamed runs.
- Owner: graphty-element (fix, error event); graphty (stop discarding rejections in `retune`, the
  window setters and the brush handler; show the element's error code in words).
- Check: a real-input test in graphty runs Degree with id `degree`, presses Step forward, presses
  Rerun in the layer inspector, and reads the result as current with no page error; an element
  test does the same with a named run via the API.

**TL-02. Choosing "Re-run" catches up runs already out of date.** (Severity 2; interaction 5,
personas 1, red team 4.)

- What: under `results: "rerun"`, every run over the visible graph that is out of date because of
  the window re-runs on a move, including runs that went out of date before the setting changed,
  and the setting change itself re-runs them.
- Why: of the owner's three choices, the automatic one did not work in practice.
- Owner: graphty-element.
- Check: element test: run, move with `"stale"`, set `"rerun"`, assert the run is current over the
  new window without a further move.

**TL-03. Out-of-date facts name the window and what changed.** (Severity 1 to 2; interaction 7,
personas 2, red team 3 and 15.)

- What: `Caveats.window` records `{ attribute, from, to }` and the run's visible node and edge
  counts; the stale reason for a window move is `{ code: "window-moved", params: { from, to,
nodes, edges } }`. Staleness compares the window, not only the node count, so a run made on
  Jun 3-12 reads out of date on May 16-25 even when all 48 nodes are visible in both.
- Why: today the note compares node counts only; when edges carry the time, nodes stay visible, so
  a stale result reads as current, and the legend calls a windowed run "full graph".
- Owner: graphty-element (facts); graphty (layer row, legend, inspector and result rows show an
  out-of-date mark while stale and name the window a result came from, "Degree, Jun 3 - Jun 12",
  also under "Keep"; `rowName` stops writing "full graph" for a windowed run).
- Check: real-input test: run Degree on one window, step twice, step back to a window with the same
  node count; the layer row, legend and inspector all show the mark and the run's window.

### Designation

**TL-04. A column with no times is refused as the time field.** (Severity 1; interaction 2,
personas 5, red team 11.)

- What: `time.setField` refuses a column where no value reads as time, `E_BAD_COMMAND` with
  `reason: "no-times"`. For the designated column the attribute summary counts values that parse,
  not values present.
- Why: today "team" or "topic" become "Time, all have a value" beside a notice saying none are
  times, and the dock vanishes while a window still hides the graph.
- Owner: graphty-element; graphty words the refusal and the row from the parsed counts.
- Check: element test for the refusal; real-input test picks `team` and the field stays as it was
  with the refusal shown.

**TL-05. Changing or clearing the field clears or rebuilds the window.** (Severity 1; interaction 2,
red team 2.)

- What: `setField(null)` clears the window; designating another column, or changing the unit,
  clears the window (the next play or step opens a new one on the new field). Re-designating a
  column keeps the unit the reader chose for it.
- Why: the canvas stayed limited to 11 of 48 nodes with no dock or chip left to clear it.
- Owner: graphty-element.
- Check: element test: window on, `setField(null)`, `visibility.window` is null and every node is
  visible; same after a unit change; re-designation returns the earlier unit.

**TL-06. The designated column is time on every surface.** (Severity 3; interaction 9, visual-a11y
16, personas 12.)

- What: the element reports the designated column's measurement as `time` wherever the app reads a
  measurement (owner decision 2). The app's inspector, Data place and Edges table read it from
  there and format its values with the timeline's date words. Delete the app-side precedence added
  in commit 530c136 (`data-place/words.ts`): it is a workaround of exactly this defect.
- Owner: graphty-element; graphty.
- Check: after "Set as time", the attribute inspector says Time, a selected edge shows
  "Jan 31, 2025", the Edges table shows the same words; `words.ts` has no time special case.

**TL-07. The element ranks the columns that read as time.** (Severity 2 to 3; interaction 2 and 17,
personas 10 and 11.)

- What: `time.candidates()` returns each column with its parsed and total counts and a suggested
  unit, most parsed first; the designed `time.found` finding uses it. The Time field menu lists
  columns that parse first, then the rest under a divider. The Overview gets the `time.found` row
  with one "Set as time" action.
- Why: a timed sample gives no sign it has time, and the menu offers id, name and team beside
  `sent`. This is discovery for every domain, using a finding the design already has.
- Owner: graphty-element; graphty.
- Check: opening Office email shows the Overview row; pressing it designates `sent`; the menu's
  first entry is `sent`.

**TL-08. Year-like whole numbers suggest Number.** (Severity 2 to 3; personas 3, red team 10 and
19.)

- What: `time.unit-suspect` also suggests `"ordinal"` when every value is a whole number between
  -5000 and 3000. The notice is never applied by itself (design 8.1: detection only suggests). The
  app shows it as a compact notice with an action button that sets the suggested unit ("Number",
  "Epoch s"), no sentence; the import screen shows Unit for a numeric column marked "Date or time".
- Owner: graphty-element; graphty.
- Check: designating `year` in Paper citations shows the notice with a "Number" button; one press
  gives readouts "1995" to "2024".

**TL-09. Designating at import gives the same notices; stray numbers in a date column are
unparsed.** (Severity 2; red team 9.)

- What: designation through the import plan produces the same `time.unparsed`,
  `time.parsed-loosely` and `time.unit-suspect` notices as `setField`, and the app shows them after
  the load. In a column whose values are mostly date strings, a bare number counts as unparsed
  instead of epoch milliseconds.
- Why: one `1.10` stretched the timeline to 1970 with no notice.
- Owner: graphty-element; graphty.
- Check: load `odd-times`-style CSV with the column marked at import; the notice appears and the
  extent starts at the first real date.

### Window, step and playback

**TL-10. Playback and stepping stop at the end of the data.** (Severity 2; interaction 3, red
team 5.)

- What: sliding playback ends when `current.to >= extent.to`; `stepBy` clamps at both ends and
  publishes `time:end`. `time.current` and `time:step` carry `atStart` and `atEnd`; the app
  disables Step back and Step forward from them.
- Owner: graphty-element; graphty.
- Check: element test plays Office email to the end and the last window ends on Jun 30; the dock's
  Step forward is disabled there.

**TL-11. Auto step is a calendar step.** (Severity 2; interaction 4, red team 12.)

- What: Auto picks the calendar step (hour, day, week, month, year) closest to span / 20, or a
  1-2-5 number for `ordinal`, aligned to its boundaries, and reports the chosen step in
  `time.current.step`. The app shows "Auto (Week)" and adds Auto as a Step option.
- Owner: graphty-element; graphty.
- Check: playing Office email on Auto gives readouts that never repeat a day; Auto can be picked
  again from the Step menu.

**TL-12. Step and mode are settings, not window fields, and survive "Show all time".**
(Severity 2; interaction 6, visual-a11y 2.)

- What: `results`, `mode` and `step` move to playback settings held with the field
  (`time.settings`, read and set; saved in the project as `visibility.playback`, the key design
  section 7 already planned). `time.window(null)` clears only the bounds. A window still accepts
  them as overrides for one call. This changes where design 8.2 put `results`; the owner's decision
  (an option with three values) is unchanged.
- Owner: graphty-element; graphty (Step, Mode and Results read `time.settings`).
- Check: set Keep, Cumulative, Week; press "Show all time"; the three controls still read Keep,
  Cumulative, Week; reload restores them.

**TL-13. One rule for Step: it is the window's length and move.** (Severity 3; interaction 10 and
12, personas 15, red team 14.)

- What: on a sliding window, choosing a step snaps the window to the step's boundary and length.
  With no window, choosing a step only stores it; the first play or `stepBy(1)` opens the first
  window at the start of the data (not the second).
- Owner: graphty-element.
- Check: from all time, pick Week: the canvas still shows all 2,102 edges; press `.`: the readout
  is the first week of the data. On a 9-day window, pick Week: the window becomes one aligned week.

**TL-14. Cumulative grows from the start of the data.** (Severity 2 to 3; interaction 11, personas
8, red team 7.)

- What: `mode: "cumulative"` anchors `from` at `extent.from`; switching to it re-fits the window;
  switching back to sliding restores a one-step window ending where the cumulative one ended.
- Owner: graphty-element.
- Check: element test; in Paper citations on 1998, Cumulative reads "1995 - 1998".

**TL-15. Untimed elements are counted and the reader can hide them.** (Severity 2; red team 8.)

- What: `time:step` and `time.extent()` carry untimed counts. The Time section shows an "Untimed"
  segmented control (Show, Hide) setting the existing `missing` option, only when untimed > 0. The
  default stays `"inside"` (the neutral reading: a missing value is not a reason to hide).
- Owner: graphty-element (counts); graphty (control).
- Check: in a file with blank times, the control appears; Hide removes them from every window.

### The dock: histogram and brush

**TL-16. A shared histogram brush in compact-mantine.** (Severity 2; interaction 14 and 15,
visual-a11y 1, 3 and 5, personas 9, red team 6.)

- What: compact-mantine's `HistogramRow` gains an optional range brush on the same horizontal
  scale as its bars: two thumbs and a draggable body (drag moves the window), a click on a bar
  outside the window jumps there, `aria-valuetext` from a value-text function, 44 px thumb hit
  areas under a coarse pointer, and each bar's existing label on hover and on focus. The app
  replaces its stacked `HistogramRow` plus `RangeSlider` with it, and the readout follows the drag
  live (commit on release stays one history step). The brush's Tab order puts the thumbs before
  the dock's close button.
- Why: the brush and bars disagree by about one bar, the body resizes instead of moving, the
  thumbs read epoch milliseconds, and they are 12 px on an iPad. A shared component fixes it for
  every caller; no local workaround.
- Owner: compact-mantine; graphty.
- Check: compact-mantine real-input tests: drag the body moves both ends by the same amount; the
  accessibility tree reads date words on both thumbs; thumbs measure at least 44 px with
  `(pointer: coarse)`; a thumb's x equals its bin's left edge.

**TL-17. Shared slider fixes: value text, touch size, contrast.** (Severity 2 to 3; visual-a11y 1,
3 and 6.)

- What: compact-mantine's Slider and RangeSlider put the value text onto the thumb nodes (Mantine
  8.3 drops `aria-valuetext` passed through `thumbProps`), size thumbs for a coarse pointer in the
  theme, and draw the filled bar at the darker brand step (4.51:1 on white) with a thumb outline of
  at least 3:1. Delete the dead `.mantine-Slider-thumb` rule in `graphty/src/workspace/time/time.css`.
- Owner: compact-mantine; graphty (the deletion).
- Check: compact-mantine test reads `aria-valuetext` from the accessibility tree; contrast measured
  at 3:1 or more in light and dark.

**TL-18. Bins come from the element, aligned and sized to the dock.** (Severity 2 to 3;
visual-a11y 11, personas 4 and 6, red team 6 and 13.)

- What: `time.bins({ maxCount })` returns calendar-aligned bins (a 1-2-5 step for `ordinal`)
  covering exactly the extent, at most `maxCount`, with the step it chose. The app asks for
  `maxCount = dock width / 3` and sets the brush's min, max and step from those bins and the
  window step; it computes no widths itself. A bar is lit only when it holds an instant inside the
  window.
- Owner: graphty-element; graphty.
- Check: Paper citations with Number fills the dock from 1995 to 2024; a one-day window lights one
  bar; no bar is lit while the readout says 0 edges.

**TL-19. The bars read without color alone, and with the other filters.** (Severity 2 to 3;
visual-a11y 4, interaction 16.)

- What: with no window, no bar is marked. With a window, bars outside it are dimmed (lightness
  differs, not only hue). Bars are drawn as full-data counts ghosted under `bins({ scope:
"visible" })` counts, so a filter shows in the histogram.
- Owner: compact-mantine (`HistogramRow` dim and ghost layers); graphty.
- Check: in-window against outside bars measure 3:1 or more in light mode; with "team is Design" on,
  the solid bars are lower than the ghosts.

**TL-20. The selection's activity draws over the histogram, not in a new row.** (Severity 2;
interaction 8, visual-a11y 8, personas 14.)

- What: `HistogramRow` takes an overlay line; the app passes `bins({ of })` of the selection and
  names it with the selection's label (accessible name). The `SparklineRow` row is removed.
- Why: the canvas resizes on every select and deselect, which breaks "the drawing moves only when
  the reader asks" (tier 3 `decided.md`).
- Owner: compact-mantine; graphty.
- Check: selecting and deselecting a node leaves the canvas size and every node's screen position
  unchanged.

**TL-21. Dock text and controls.** (Severity 2; visual-a11y 10, 15, 17 and 18, red team 16.)

- What: the readout at body size, weight 500, with tabular figures; axis labels at caption size,
  hidden with no window; "UTC" after readouts finer than a day; the field name removed from the
  dock (the Data place and header chip show it); Speed moves from the Time section into the dock as
  a small text button cycling 1x, 2x, 4x beside Play (design 6.6 already places it there); "Show
  all time" uses a widen-range icon, not X.
- Owner: graphty.
- Check: screenshots in light and dark at 1180x820 and 820x1180; the Time section no longer has a
  Speed row.

**TL-22. Exact range entry.** (Severity 2; personas 13.)

- What: pressing the readout opens a popover with From and To inputs (`TextInput` for dates,
  `NumberInput` for `ordinal`) that write `time.window`. Parsing the typed text is the element's:
  `time.parse(text)` returns an instant or null with the field's unit and zone.
- Owner: graphty-element (`parse`); graphty.
- Check: real-input test types "Mar 9, 2025" and "Mar 19, 2025" and the readout shows that range.

### Keyboard and focus

**TL-23. Jump to start and end.** (Severity 2; interaction 20, visual-a11y 13.)

- What: Shift+comma and Shift+period jump to the first and last window. `time.seek` accepts
  `"start"` and `"end"` so the app computes no positions.
- Owner: graphty-element; graphty (`time/commands.ts`, switchable single keys).
- Check: real-input test: Shift+period then the readout ends on Jun 30.

**TL-24. The dock is an F6 region.** (Severity 2; visual-a11y 12.)

- What: while the dock is shown, F6 cycles six regions with the dock after the canvas. This extends
  the tier 3 five-region rule; it does not replace it.
- Owner: graphty.
- Check: real-input test presses F6 from the canvas and focus lands on the brush.

**TL-25. The header time chip focuses the brush and clears.** (Severity 4; interaction 19.)

- What: clicking the chip moves focus to the brush; it carries a clear (x) like the filter chip.
- Owner: graphty.
- Check: click the chip, focus is on the brush's start thumb; its x clears the window.

**TL-26. The header does not jitter during playback.** (Severity 2; visual-a11y 9.)

- What: the time chip gets a fixed minimum width with tabular figures, so the chips after it stay
  put. The tier 3 header order is kept.
- Owner: graphty.
- Check: the Autosave chip's x is identical across four play steps.

### Panels and words

**TL-27. The Overview treats the window like a filter.** (Severity 2; visual-a11y 7, personas 7,
red team 13.)

- What: the Graph inspector's Overview shows visible-of-total counts whenever a window or a filter
  is on, read from `visibility.summary`; the degree and density figures it shows are taken over the
  visible scope from the element (graphty-element adds the visible scope to those statistics if it
  lacks it, so the app computes nothing).
- Owner: graphty-element; graphty (`GraphValues.tsx`).
- Check: with a one-week window, the Overview reads "Edges 70 of 2,102" and its degree range equals
  the legend's.

**TL-28. A time window is a Filters row.** (Severity 3; interaction 18.)

- What: the Filters list shows the window as a row (design 6.6), with its counts; switching it off
  clears the window. It is the same element state, not a second window.
- Owner: graphty.
- Check: with a window and "team is Design" on, Filters lists both and the header filter count
  includes the window.

**TL-29. Undo names the time steps.** (Severity 3; interaction 13.)

- What: history words for `time.field`, `time.clear-field`, `visibility.window` and
  `visibility.clear-window`.
- Owner: graphty.
- Check: undo after "Set as time" reads "Undid setting the time field."

**TL-30. Time section layout.** (Severity 2; visual-a11y 14.)

- What: Mode, Untimed and any segmented control sit in a `FieldRow` like the selects, so the
  section has one right edge.
- Owner: graphty.
- Check: every control in the Time section ends at the same x.

**TL-31. Nodes are called by their label in the timeline samples.** (Severity 2; personas 12.)

- What: the Office email sample's nodes carry `name` as their label (the tier 3 rule "a node is
  called by its label" already holds for labelled data; the sample left it unset), and the sample
  cards use the standard "N nodes, M edges" line.
- Owner: graphty (sample manifest and `scripts/write-timeline-samples.ts`).
- Check: the Edges table's From and To and the node header show names; the card reads
  "48 nodes, 2,102 edges".

**TL-32. Autosave waits for a pause.** (Severity 1 of 4 impact; personas 19.)

- What: during playback autosave holds and writes once on pause or `time:end`.
- Owner: graphty-element.
- Check: no "Autosave: saving..." during a 10-step play; one write after pause.

## Owner feedback, 2026-10-22

**TL-27. Year numbers read as years; every unit moves.** (Owner: "the timeline shows up but I can't
move it -- it's stuck at 1970".)

- What: a number column designated with no unit takes its unit from its values: whole numbers
  from 1000 to 2999 read as calendar years (new unit `"year"`: 1995 is Jan 1, 1995 UTC), epochs
  in seconds as `"s"`, epochs in milliseconds as `"ms"`, any other numbers as `"ordinal"` (plain
  numbers: steps, ticks; no calendar anywhere). Auto steps finer than a quarter hour use a 1-2-5
  number of milliseconds, so a short span never sits in one window that cannot move. The Unit row
  offers Year, Epoch ms, Epoch s and Number; the reader switches a year column to Number there.
  Supersedes "Pre-select the unit the element suggests" for numbers; `time.unit-suspect` now
  suggests `"year"` for four-digit years read as milliseconds.
- Owner: graphty-element; graphty.
- Check: Paper citations, Node time = year, reads "1995 - 2024" and steps a year at a time.

**TL-28. Time detected from the values.** Text columns whose values are nearly all (95%) plain
dates (ISO 8601 with at least a year and month, or a month name with a four-digit year) report
measurement `"time"`, so the data UI shows Time and the time pickers list them first. Never from
the column name; bare numbers never. Detection does not designate the timeline field.

**TL-29. Ghosts.** `time.settings.outside`: `"hide"` (default, today's behavior) or `"ghost"`,
which keeps elements outside the window drawn in the element state `"ghosted"`
(`{ match: "state", state: "ghosted" }`) and not visible (no count, run or export includes them).
With `startingRows` on, designating a field adds the Ghost starting row (grey `#9E9E9E`, nodes at
opacity 0.2, edges 0.15), pinned to the top directly below Selected; clearing the field removes it.
The time card has an Outside row: Hide, Ghost.

**TL-30. Timeline toggle.** The toolbar's Timeline button (`timeline.toggle`, key T, shown only
while a time field is set, pressed while the dock shows) hides and shows the dock; designating a
field shows it.

## Rejected

- **Pre-set the field, unit and step on the two timeline samples (red team 17).** It breaks
  "nothing pre-done in a first session"; TL-07's Overview row and TL-08's Number button give the
  same result in two presses.
- **A "Time" chip on timed sample cards (personas 18, interaction 17 part).** Adds UI to the
  owner-approved Samples dialog; TL-07 does the discovery after open.
- **Pre-select the unit the element suggests (personas 3 part).** Design 8.1: detection only
  suggests; TL-08's one-press button covers it.
- **Relabel "Results" to "Runs on move" (personas 17).** A one-persona word change; TL-03's per-run
  mark shows what it applies to.
- **Leave untimed edges out of the dock's counts (red team 8 part).** The counts would then
  misstate what is visible; TL-15 lets the reader hide them instead.
- **Do not count a playback move as an unsaved change (red team 18).** The window is saved project
  state; calling a changed project unchanged would be untruthful.
- **The T key to show or hide the dock (interaction 20 part).** Superseded by owner feedback on
  2026-10-22: see TL-30.
- **A notice for values far from the rest (red team 9 part).** TL-09's parse rule removes the case
  that was seen; an outlier detector is a new concept.
- **An optional "entered this step" style layer (visual-a11y 19).** Already designed as phase 5
  (`timeline.entered`); not in the prototype's scope.
- **Pass the reader's time zone to the window (red team 16 part).** The `timeZone` option is a
  ponytail in the prototype; TL-21 names UTC instead.

## For the owner (one-way doors once released)

None blocks the prototype; all are unreleased and decided as written here unless the owner objects.

1. **Where the Results option lives (TL-12).** Moved from `TimeWindow.results` to the field's
   playback settings, `time.settings: { results, mode, step }`, saved as project key
   `visibility.playback`. Values stay `"keep" | "stale" | "rerun"`; the default stays `"stale"`
   (what a window move did before the option existed).
2. **New API names:** `time.settings`, `time.candidates()`, `time.parse()`,
   `time.seek("start" | "end")`, `bins({ maxCount })`, `atStart` / `atEnd` on `time.current` and
   `time:step`, untimed counts on `time:step`.
3. **New codes:** `E_BAD_COMMAND` reason `"no-times"`; stale reason code `"window-moved"`; the
   `"ordinal"` suggestion on `time.unit-suspect`.
4. **Changed behavior inside the prototype's own API:** cumulative anchors at the start of the
   data; Auto is a calendar step; a field or unit change clears the window.
