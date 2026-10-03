# The project file (decision item 10): persona review

Item 10 of element-api-decisions.md (lines 450-563) proposes `session.project` with `save()`,
`open()`, `name`, `rename()`, `dirty` and `app`, and a new JSON file, `format: "graphty-project"`,
extension `.graphty`. Each persona below was given a concrete task that needs the API. Every
section stands alone.

## The finding that overrides the rest: a graphty file format already exists

`design/documents/container.md` specifies a graphty document: `kind: "graphty-document"`,
`version: 1`, saved as `<name>.graphty.json`, media type `application/vnd.graphty+json`
(container.md:8-13), holding typed members (`graphty-style`, `graphty-recipe`, `graphty-data`,
`graphty-notes`, container.md:31-40), reverse-domain `extensions` for third-party state
(container.md:154-157), content sniffing instead of file names (container.md:52-75), a round-trip
rule that keeps unknown members in place (container.md:318-325), privacy defaults that leave data
and notes out unless asked (container.md:333-341), a 64 MB limit (README.md:418), and the calls
`session.data.openDocument()` / `saveDocument()` (container.md:214-299). The element's notes guide
already tells readers to save notes as `*.graphty.json` and that #301 is coming
(graphty-element/docs/guide/notes.md:321-326).

Item 10 never mentions any of it. It adds a second envelope (`format` instead of `kind`), a second
extension one suffix away (`.graphty` vs `.graphty.json`), a second media type
(`application/vnd.graphty.project+json`), a second extension slot (`app: unknown` instead of
reverse-domain `extensions`), a second unknown-key rule, and a second open/save pair on a
different object (`session.project` vs `session.data`). Every persona below hits the seam. The fix
is to make the project file a graphty document: new member kinds (results, view, positions,
selection, sets, views, visibility) inside the existing container, opened and saved by the calls
container.md already specifies, with "project" meaning "every member, data and notes included".

## Analyst Alex (app user): reproduce last month's analysis on this month's data

Task: Alex ran Louvain and betweenness on a vendor network, styled by community, saved the
project. A month later the vendor list has 40 new rows. He wants the same analysis on the new data
(persona goals: "Reproducible analyses", "No way to save analysis patterns").

- **Fails the task.** Results are stored as values, "columns by node order", so a reopen
  recomputes nothing. The new rows have no community and no betweenness, and re-importing data into
  the reopened project shifts every stored column by node order onto the wrong node, silently. The
  container already has the right tool for this, a recipe member (README.md:9-10, "so the same
  analysis runs on the next dataset"); item 10 stores runs without one.
- **Nothing detects stale columns.** `data.fingerprint()` exists (graphty-element/src/session/types.ts:472)
  and says when two graphs differ in node order. The file does not store it, so `open()` cannot
  refuse or warn when results do not match their data.
- **Selection loss on close.** The owner wants the selection saved (tier1-design.md:800-802), but
  the selection is not project state (types.ts:771-773) so changing it never makes `dirty` true.
  Alex selects his 12 suspects, closes the tab with no prompt, and the file has last week's selection.
- **Undo history.** tier1-design.md:808 asks the element for "a whole-session document (runs,
  styles, positions, history)"; item 10 says "a fresh history". The design and the decision disagree.
- **Files the app must sort.** The app's intake promises "A data, recipe or style file is added to
  this project; a project file opens in its place" (tier1-design.md:94-96). `open()` accepts only
  project files and nothing says what it does with a `.graphty.json` style or notes file, so the
  app must sniff the file type itself, which the architectural principles forbid.

## Knowledge engineer (Dr. Kim): a joined graph shared with stakeholders

Task: build the badge-access graph by joining door entries to people and buildings (three
sources, joined on columns that are not the node id), save it, send it to a security stakeholder,
and refresh it nightly from the source systems.

- **The join cannot be recorded.** `data` stores records plus one `source`, and
  `data.source()` returns one `DataSourceDescriptor | null` (types.ts:455, 558-567). Three sources
  and the join keys have nowhere to go, so the project cannot be refreshed; it can only be redone
  by hand.
- **Leaks by default.** Saving inlines every record and every note. container.md:333-341 makes
  the opposite choice on purpose ("a file for sharing a technique does not carry the data by
  accident"; notes "must not carry them by accident") and its save report lists what the file
  discloses. Item 10 has no `members`/`data`/`notes` option and no disclosure report, so the only
  way to send a style without badge records of named people is to not use the project file.
- **Size.** An enterprise graph inlined as JSON records has no stated limit; the container's 64 MB
  limit (README.md:418) is not referenced, so `save()` either produces a file `open()` refuses or
  there are two limits.

## ML engineer (Chris): carry a recommendation graph into a Python pipeline

Task: a 500k-node user-item graph with a 64-float embedding per node, link-prediction and
Dijkstra results; save the project, then read the scores in Python for offline evaluation.

- **Values change in the round trip.** Dijkstra writes `Infinity` for unreachable nodes
  (graphty-element/src/algorithms/DijkstraAlgorithm.ts:176, BellmanFordAlgorithm.ts:143).
  `JSON.stringify(Infinity)` is `null`, so after reopen "unreachable" reads as "missing" and any
  style or query comparing distance changes behavior. The element's own conformance register
  treats `NaN`/`Infinity` in JSON as not numbers (design/documents/conformance.md:114). Item 10
  claims "a reopen recomputes nothing" without an encoding rule for non-finite numbers.
- **Columns are unreadable outside the element.** "values by node order" means the reader must
  know the element's internal node order. A Python reader has to rebuild it from `data.nodes`
  order and hope it matches; storing the ids or saying "same order as data.nodes" in the format is
  missing.
- **Size and string limits.** 500k nodes x 64 floats as JSON text is roughly 600 MB; JavaScript
  strings top out near 512 MB to 1 GB, so `save()` throws `RangeError: Invalid string length`
  before producing a Blob. The binary alternative is deferred to "version 2", which then means two
  formats every reader supports forever.
- **Node scripts.** The session entry is meant to run in Node; `open(string)` does not say whether
  the string is a path, a URL or the JSON text (the blind author's guess 2), and the notes guide
  teaches `JSON.parse` first (notes.md:317), which compiles against `open()` because `any` passes.

## Plugin data scientist (Marcus): his custom score in a shared project

Task: Marcus registers his influence score with `defineAlgorithm` (src/simple/defineAlgorithm.ts:525),
runs it, saves the project and sends it to a colleague whose dashboard does not register the
plugin, or registers version 2 of it.

- **No rule for unregistered algorithms.** `results.<runId>.run` names an algorithm the reader may
  not have. Item 10 does not say whether the columns are restored (so the colleague sees numbers
  nothing can re-run), refused, or listed in `missing`. `OpenReport.missing` is per `ProjectPart`
  ("results"), so it cannot say which run failed.
- **Version drift is invisible.** The run stores algorithm, params, scope, seed and label but no
  plugin version; a project saved with v1 numbers reopens as if v2 computed them. Marcus's goal is
  numbers "identical to the Python result so nobody questions the dashboard".
- **Error text he cannot act on.** `missing[].reason` is an English sentence with no code. He
  "reads only the first line and searches for it"; a sentence is not searchable across releases,
  and the section's own example shows it to end users.

## Plugin domain researcher (Tomasz): a lab figure in one HTML file

Task: a single HTML file on a shared drive reads the lab TSV through his custom data source and
shows the essentiality score; he wants lab mates to open the saved session without editing code.

- **No script-free path.** There is no attribute such as `<graphty-element project="lab.graphty">`;
  reopening needs a file input, an event listener and `await`. The blind author's minimal example
  is 19 lines, five of them Blob-to-download boilerplate that leaks the object URL
  (review/blind-10.ts). This misses the 15-line target and Tomasz's "copy and change three places".
- **The custom reader is recorded but not needed, or needed but not said.** `data.source` stores
  his source's type; nothing says whether open requires the data source to be registered. If it
  does, his lab mates without the plugin script fail; if it does not, `source` is decoration.
- **Wrong file, unclear error.** A lab mate drags in `team-colours.graphty.json` (the format the
  docs teach). Item 10 names only `E_UNSUPPORTED` for a newer version; wrong kind, malformed JSON
  and data/result mismatch have no code.

## Front-end developer (Sofia): autosave, Recent projects and an unsaved-changes guard

Task: wire Save to the company's storage API, keep a Recent list, show an unsaved-changes dot and a
`beforeunload` guard, and store the app's own panel state.

- **Breaks her existing listener.** `project:changed` is already published as
  `{ slices, cause }` (src/session/types.ts:755, published in events.md, undo.md,
  javascript-api.md). Item 10 redefines it as `{ name, dirty }`. Her autosave listener reading
  `e.slices` breaks at compile time if she is lucky and at runtime with `skipLibCheck` (the blind
  author reproduced TS2717). Use a new event name, such as `project:status`, plus a DOM event
  matching `graphty-history-change` (src/graphty-element.ts:307).
- **Untyped slot.** `app: unknown` forces a cast in every consumer, and the container's answer --
  reverse-domain `extensions` that coexist with other tools' state -- is ignored. Nothing says
  whether `save()` without `{ app }` keeps the opened file's slot or drops it, which decides
  whether a second consumer erases the first one's state.
- **`rename()` returns `Run<void>`.** Her autocomplete offers `algorithm`, `engine`, `caveats`
  (src/session/runs/Run.ts:197-217) on a rename. Return `void` or a plain promise.
- **Autosave cost.** `save()` serializes the whole graph every time; with no size or time figure
  she cannot tell whether autosave on each `history:changed` is safe. The dirty rule also misses
  state that is saved but not in history (selection, camera), so her guard lets real loss through.

## Graph library author (Ines): a 1M-node layout she publishes as a package

Task: her published ForceAtlas variant lays out a 1M-node graph; users save projects that name it
in `layout.id` and reopen in apps that load her package lazily.

- **Order of registration.** `open()` restores `layout: { id, options }`; an app that registers
  the layout after `open()` resolves gets a project whose layout is "missing" with a sentence, and
  no way to re-apply once the plugin arrives. Item 10 has no deferred or "waiting" state; the
  container has one for styles waiting on runs (container.md:265-272).
- **Positions as JSON.** 1M nodes x 3 coordinates at about 18 characters each is roughly 54 MB for
  positions alone, plus records, above the container's 64 MB limit before any data. The only
  scalable alternative is deferred to an unspecified version 2.
- **Forever is long.** "A reader of version N opens any version up to N" commits every future
  element to reading version 1's records-as-JSON plus node-order columns, including whatever
  version-1 bugs files carry. The container instead versions each member, so one member can move on
  without the whole file.

## What to change before approval

1. Build the project file on container.md: one envelope, one extension (`.graphty.json`), one
   media type, `openDocument`/`saveDocument` (or `session.project` as a thin, documented front for
   them), new member kinds for results, positions, view, selection, sets, views and visibility, and
   reverse-domain `extensions` instead of `app`.
2. Store each result column with the data fingerprint, and refuse or flag columns whose
   fingerprint does not match; define the encoding of `Infinity`, `-Infinity` and `NaN`.
3. Store a recipe beside the results so the analysis can be re-run on new data; record plugin
   versions on runs.
4. Keep the container's privacy defaults and its disclosure report, with a "whole project"
   option that turns data and notes on explicitly.
5. Do not reuse `project:changed`; publish a new event and a DOM event; make `rename()` return
   `void`; reuse `ProjectSlice` names instead of a second `ProjectPart` vocabulary; give every
   `missing` entry a code and the run or member it is about.
6. Say what `open()` does over a dirty session, during a running algorithm or layout, with a
   non-project graphty document, and with an unregistered algorithm, layout or data source.
7. Add a `project` attribute on the tag and a one-call download, so the newcomer example fits in
   15 lines.
8. State size limits and measured save/open times for 10k, 100k and 1M nodes before calling
   version 1 a one-way door.
