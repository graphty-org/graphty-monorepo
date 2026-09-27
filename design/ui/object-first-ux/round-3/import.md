# Round 3: getting data in

This document closes the fourteen "getting data in" gaps of the gap register
(`design/ui/object-first-ux/round-3/gaps.md`, cluster 2): every way a graph gets into the app,
every way that can go wrong, and what the app does with a graph too large to draw. It extends
the round-2 object-first design (`design/ui/object-first-ux/round-2/revision.md`) and uses its
frame: one window with the object tree on the left, the inspector on the right, the canvas
between, the floating toolbar, the bottom dock, the file menu behind the dataset name, and the
status bar.

Mocks: `design/ui/object-first-ux/mocks/v2/screen-N.png`, generated from
`tmp/object-first/gen/screens/screen-N.mjs`. This document changes screens 1 and 14 and adds
screens 22 to 32.

## Terms used below

- **Import dialog.** The one modal dialog of the app (round-2 screen 14): a 480 px card over a
  dimmed canvas. A _modal_ dialog blocks the rest of the window until it is closed.
- **Peek.** Reading the start of a file (its column names, a few rows, a row count) before
  loading it, so the dialog can show a preview and fill its selects. The element call is
  `session.data.peek(file | url | text)`, proposed in `revision.md` section 9.3.
- **Column role.** What a column means to the graph: node id, label, source, target, weight,
  time, type.
- **Render ceiling.** The most nodes this machine draws at once. The element publishes it as
  `DEFAULT_LIMITS.renderCeiling` (200,000 by default; `graphty-element/src/session/limits.ts`).
- **Segmented control.** A row of mutually exclusive buttons that look like one control
  ("File | URL | Paste | A source").
- **Radio group.** A list of choices of which exactly one is on. The mocks draw it with
  round markers, one choice per row.
- **Status chip.** One item of the status bar, with an optional link ("Loading 42% [Cancel]").
- **Side card.** In a mock, a faded card beside a dialog that shows another state of the same
  surface (the failure, the "before"). It is a drawing device, not a UI element: in the app
  only one of the two states is on screen at a time.

## 1. The one Import dialog

Every way in opens the same dialog. Its rows, top to bottom, appear only when they apply:

| Row                                                              | When                                                    | What it holds                                                                                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| From [File \| URL \| Paste \| A source]                          | always                                                  | where the bytes come from; switching keeps the rows below that still apply                                                                 |
| Into (radio group)                                               | only when a graph is open                               | Replace <name> / Add to current graph / Add attributes to its nodes / Open beside to compare (section 2.1)                                 |
| the source's own rows                                            | per tab                                                 | nothing for File (the title names the file); Address and Fetch for URL; the text area for Paste; the source's connection rows for A source |
| Format [<name>, detected v] with the peek's counts               | after a peek                                            | lists what `catalog.formats()` lists                                                                                                       |
| Options (disclosure, summary "comma, header row, UTF-8")         | when the format declares options                        | section 2.5                                                                                                                                |
| the preview                                                      | after a peek                                            | three to five rows as the file has them                                                                                                    |
| Columns: Node id, Label, Source, Target, Weight, Time, Direction | after a peek                                            | selects listing the file's columns, "none" first where optional                                                                            |
| "Nodes: none [Add a nodes file...]"                              | an edge-list file                                       | section 2.4                                                                                                                                |
| a size section                                                   | when the peek counts more nodes than the render ceiling | section 2.10                                                                                                                               |
| the outcome sentence                                             | always last                                             | "Will load 1,204 nodes and 5,830 edges."                                                                                                   |
| footer [Cancel] [<verb>]                                         | always                                                  | the primary button names what it will do: Load, Add 26 nodes and 62 edges, Join, Replace, Open beside, Load subset, Load and skip 12 rows  |

Keyboard: Enter presses the primary button when it is enabled; Esc cancels the running step
(a fetch, a test connection) and then closes the dialog; Tab moves through rows in order.
Ctrl+O opens the dialog on File, with Replace chosen when a graph is open. Ctrl+V on the canvas
opens it on Paste (section 2.3).

The doors: the Welcome sheet (drop zone, Choose a file, and the left panel's four rows "Open a
file...", "Paste data...", "From a URL...", "From a database or service..."); a drop anywhere
on the canvas; the Dataset inspector's "+" (Add data); the file menu's Open... and Add data...;
Ctrl+O; Ctrl+V on the canvas. The file menu itself is drawn by the file and session cluster
(screen 16); this document only relies on its two rows.

Why one dialog: the decisions (where from, which columns mean what, replace or add) must be
made before anything exists, and splitting them over several dialogs would give the same
column selects several homes.

## 2. The gaps, one by one

### 2.1 Drop a file onto a loaded graph (screen 26)

**Design.** While a file is dragged over the canvas, the whole stage takes a dashed brand
outline and one centred line, "Drop karate-2020.graphml to import it". Dropping never loads by
itself when a graph is open: the Import dialog opens with the **Into** radio group:

- _Replace Karate Club_ -- the old dataset and its tree go; the unsaved-work prompt of the file
  and session cluster (screens 16 and 17) runs first.
- _Add to current graph_ -- merges nodes and edges (section 2.2). Default for a drop, for the
  Dataset "+" and for Add data...
- _Add attributes to its nodes_ -- the file is a table of node properties; continues in the join
  design of the editing and joining cluster (screen 37), with its match count.
- _Open beside to compare_ -- keeps both graphs; continues in the two-graphs design of the file
  and session cluster (screen 21).

The primary button follows the choice: "Replace", "Add 26 nodes and 62 edges", "Join 34 of 60
rows", "Open beside". Open... and Ctrl+O preselect Replace; the Dataset "+" and Add data...
preselect Add. Dropping two files at once lands in section 2.4. An unreadable drop lands in
section 2.9.

**Element API.** Loading exists (`loadFromFile`, `addDataFromSource`). Missing: an
add-into-current load that reports a dry run first (see 2.2). The drop overlay and the dialog are
app chrome.

### 2.2 Add data with a rule for ids that already exist (screen 26)

**Design.** With Add chosen, a dry run counts the overlap: "Dry run: 34 of the 60 node ids and
78 of the 140 edges are already in Karate Club." Under it, "Same id [Skip v]" with its note
"keep Karate Club's values":

- _Skip_ (default): an existing node or edge keeps its values; only new ones are added.
- _Replace_: the new file's record replaces the old one whole.
- _Update fields_: only the fields the new file carries are written; new fields are added.

Then "Will add 26 nodes and 62 edges. One undo step." and "The 3 objects in the tree go stale
and say so; nothing re-runs by itself" (the stale rule of `revision.md` section 4). The add is
one History entry, so Ctrl+Z removes it whole.

**Element API.** Today `addNodes` throws `E_DUPLICATE_ID` on an existing id. Needed:
`data.add(source, { onExisting: "skip" | "replace" | "merge", dryRun: true })` returning the
overlap counts. Skip and the dry run are **small** (the dry run is the planned `data.add`,
issue #337); Replace and Update fields need attribute updates after load (issue #297,
**medium**).

### 2.3 Load a graph from a URL (screens 1, 14, 22)

**Design.** "From a URL..." on the Welcome sheet, or the URL segment in the dialog. Rows:
Address [field]; Format [Detect from address v] with what it detected ("CSV, from .csv");
[Fetch] (Enter in the Address field). While fetching: a progress row "1.2 of 3.4 MB" with
Cancel, mirrored in the status chip "Fetching email.csv 35% [Cancel]" (bytes only when the
server gives no length). The preview and the column roles fill in once enough is read; Load is
disabled until then. Failures sit under the Address field, in plain words, each with its way out:

- _Probably blocked (CORS)_: "data.example.org does not let other sites read this file."
  [Use the File tab] [Retry]. "Probably", because the browser reports a blocked read and a
  dropped connection the same way; the element says "probably blocked" when the machine is
  online.
- _Not found (404) or offline_: [Edit address] [Retry].
- _Not graph data_ (an HTML page came back): Format [Pick... v].

**Element API.** `loadFromUrl(url, { format })` and a fetch with retry exist; failures surface as
`E_FETCH_FAILED` and `E_UNKNOWN_FORMAT`. Missing: `peek(url)` (part of the proposed `peek`,
**small**); a failure `reason` of "blocked", "not-found", "offline" or "not-graph" on
`E_FETCH_FAILED` (**tiny**); Cancel (issue #296, see 2.10).

### 2.4 Paste graph data, and Ctrl+V on the canvas (screens 1, 14, 23)

**Design.** "Paste data..." on the Welcome sheet or the Paste segment shows a monospace text area
and one line of accepted forms: "an edge list (source target [weight], one per line), CSV or
TSV with a header, JSON, GraphML, GML, DOT". The format is detected as the text changes ("Edge
list, detected 10 lines, 3 fields"), and the same preview, column roles, Into choice and
outcome sentence follow ("Will add 6 nodes and 10 edges; 12, 30, 34 already exist."). **Ctrl+V
on the canvas** (with focus on the canvas, not in a field) opens this tab pre-filled with the
clipboard; it never loads without the reader pressing the primary button. A line that does not
parse is marked with its number, its text and the reason ("Line 7 has 4 fields; the other
lines have 3") with [Skip line 7]; the primary button stays disabled until the text is fixed or
the line skipped.

**Element API.** `addDataFromSource(format, { data: text })` exists, and so does content
sniffing (`graphty-element/src/data/format-detection.ts`). Missing: `peek(text)` (with the
proposed `peek`); a whitespace edge-list reading if the CSV variant detector does not already
cover it (**tiny**).

### 2.5 Load a nodes file and an edges file together (screens 14, 24)

**Design.** On an edge-list file the dialog shows "Nodes: none, only the ids in from and to
[Add a nodes file...]". Choosing a second file (or dropping both at once) turns the dialog into
two stacked sections, "Edges email.csv 5,830 rows" and "Nodes people.csv 1,204 rows", each
with a remove button, a two-row preview and its roles (Source, Target, Time on the edges; Node
id, Label, Type on the nodes). A section "How they match" gives "1,190 node ids appear in both
files" and one choice per mismatch: "14 alone [Keep them v]" (people with no edges) and "3
missing [Create them v]" (endpoints absent from the nodes file; the other choice drops their 9
edges). The outcome sentence totals it: "Will load 1,207 nodes and 5,830 edges."

**Element API.** The CSV reader already takes `nodeFile` + `edgeFile` (and `nodeURL` +
`edgeURL`). Missing: the match counts from a peek of both files (**small**, with `peek`); a
"drop edges whose endpoint is not in the nodes file" option (**tiny**; today such an edge
creates the node).

### 2.6 Choose the node id and label columns at import (screen 14)

**Design.** "Node id" and "Label" sit above Source and Target in the Columns section. On an
edge-list file alone, Node id reads "from and to" and Label "the id", each with a note pointing
at the nodes file; with a nodes file they list its columns (screen 24). Type (the node-type
role) joins them when a nodes file is present. After the load the same rows are the Dataset Data
tab's "Made by" mapping.

**Element API.** Exists: the known-field mapping (`nodeIdPath`, label, and the endpoint paths)
listed in `round-2/coverage.md` section 1. The Type role is issue #299 (proposed).

### 2.7 Parsing options before the first load (screens 14, 25)

**Design.** A disclosure "Options" under Format, closed, whose summary states the current
choices ("comma, header row, UTF-8"). Open, it lists the format's own options from its
descriptor. For CSV: Separator [Comma v] (with "was Comma, detected" after a change), Quote
["], Header row [switch], Skip lines [0], Encoding [UTF-8 v], Missing values [empty, NA]. For
JSON: Variant [Cytoscape v] (Cytoscape, D3, node-link), Nodes at, Edges at, Id at (paths into the
file). Every change re-runs the peek, so the preview answers at once. After a load the same
rows are Dataset "..." > Import options... (editing and joining cluster, screen 34).

**Element API.** CSV `delimiter` and the variant detector exist; JSON paths exist
(`nodeIdPath` and the endpoint paths). Missing: publishing every reader's options through
`FormatDescriptor.options` so the dialog can draw them without app knowledge (**small**; named in
`round-2/coverage.md` section 13).

### 2.8 Import that hits unreadable rows (screen 25)

**Design.** Two cases. (1) A wrong separator: when every row reads as one column, the dialog says
"Every row read as 1 column -- check the separator", and "check the separator" opens Options
with Separator focused; Load stays disabled because Source and Target cannot both be set.
(2) Rows that still do not read: a section "Unreadable rows 12" listing up to three with Line,
Text and Why ("no such date", "no target", "quote not closed"), a link "All 12 rows, and copy
them", and the primary button "Load and skip 12 rows". The skipped rows are then in the Import
report on the Dataset's Overview (editing and joining cluster, screen 33).

**Element API.** The readers already collect errors (`ErrorAggregator`, `errorLimit`) and emit
`data-loading-error` with `line` and `canContinue`. Missing: the peek returning the first N
rejected lines with their raw text and reason, and a one-column warning (**small**, with `peek`).

### 2.9 A load that fails entirely (screen 27)

**Design.** The failure is said where the load started, and nothing is half-built:

- From the Welcome sheet or a drop: a short error card over the sheet, "Could not open
  email.xlsx", in plain words (what the file is, what the app reads, what to do), with [Pick
  the format...] and [Choose another file] (a read or network error offers [Try again]
  instead), and a Details disclosure with the error code and [Copy].
- Inside the Import dialog: the problem sits on the row it is about ("No column looks like a
  target. Pick one.") and the primary button stays disabled.
- After the card closes: the status chip "Load failed: <reason> [Details]" until the next load.

If a graph was open, it is still open and unchanged; if not, the Welcome sheet is.

**Element API.** Error codes exist (`E_UNKNOWN_FORMAT`, `E_PARSE_FAILED`, `E_FETCH_FAILED`,
`E_EDGE_ENDPOINTS_UNRESOLVED`, `E_OUT_OF_MEMORY`). Missing: a guarantee that a failed or
cancelled load leaves the previous graph untouched, by reading into a staging store and
swapping on success (**medium**; it must be checked against how `Graph` clears data today).

### 2.10 Load progress with Cancel (screen 28)

**Design.** From Load until the first paint: a loading card on the stage ("Loading big.csv",
a bar with the percentage, "Read 256 of 610 MB", "Rows 1,806,000 so far", Cancel); the pending
name in the tree and the inspector, whose summary reads "Loading 42% [Cancel]" and whose tabs
wait; every tool at 30 percent; the status chip "Loading big.csv 42% [Cancel]", or rows read
when the size is unknown. Cancel (any of the three, or Esc) restores exactly the state before
Load and the chip says "Load cancelled" for a few seconds.

**Element API.** `data-loading-progress` exists (bytes, percentage when the total is known,
records so far). Missing: cancellation through an `AbortSignal` on every load call (issue #296,
**small**), and the staging swap of 2.9 so a cancel restores the old graph.

### 2.11 A file above the render ceiling: choose a subset first (screen 29)

**Design.** When the peek counts more nodes than the render ceiling, the dialog adds a section
"Larger than the app draws at once": "The file has 350,000 nodes; this machine draws 200,000 at
once." and "All of it needs about 3.1 GB of memory; this tab has about 4 GB." Then a radio group
**Load**, each choice with its estimate:

- the busiest N nodes by connections (default, N = the ceiling);
- the largest connected part;
- around one node within N hops (Node id and Hops fields);
- a time window of the time column;
- everything (lands in 2.12).

Primary button "Load subset". After the load, Dataset > Overview says which subset is loaded
("Loaded: the busiest 200,000 of 350,000 [Change...]"), and Change... reopens this section.

**Element API.** Missing, and the largest item here: a subset load,
`load(source, { subset: { by: "degree", n } | { part: "largest" } | { around: id, hops } |
{ time: [from, to] } })`, which needs a streaming first pass to count degrees or find parts
(**medium to large**). A memory estimate from counts, `limits.estimate({ nodes, edges })`
(**small**). The ceiling is published today but not enforced (issue #302).

### 2.12 Large-graph state (screen 30)

**Design.** Three places say it. The status bar's limit chip "Drawing 200,000 of 350,000"
(amber). The Dataset Overview section "Drawing 200,000 of 350,000": "All 350,000 are loaded:
measures, filters and the table use every node. The canvas draws the 200,000 busiest.", with
[Focus on a smaller set...] (opens the Filter tool) and "Change ceiling..." (Settings >
Performance). A Performance mode switch, on by itself above 100,000 nodes (the element's
`largeGraphThreshold` is 10,000 for detail; this is the app-visible switch), with what it turns
off: labels capped ("Labels: top 500 by degree"), hover highlight off (the tooltip stays), VR off
with its reason ("takes up to 10,000 nodes"), which is also the greyed VR button's tooltip.

**Element API.** The limits are published (`DEFAULT_LIMITS`). Missing: drawing only the top N by
a measure when over the ceiling, with a `drawn` count in `status.counts` (issue #302,
**medium**); a performance-mode flag that caps labels and turns off hover highlight (**small**).

### 2.13 Load from a source that needs a connection (screens 1, 31)

**Design.** A fourth row on the Welcome sheet's left panel, "From a database or service...",
and the fourth segment "A source" in the dialog. Source [Neo4j v] lists every registered source
whose descriptor declares connection options. The rows come from that descriptor: for Neo4j,
Server, Database, User, Password (masked), a Cypher query (monospace text area) and a row Limit;
[Test connection] answers in place ("Connected: Neo4j 5.18, 2.1 M relationships"); then the
preview counts and, with a graph open, the Into choice. A failure sits under the field it is
about ("Password: authentication refused for reader") and Load stays disabled. The password is
kept for this session only, never written to a project file. STRING asks for a gene list
(text area), Species, a minimum score and a number of partners to add, and lists unmatched
names before Load.

**Element API.** Missing: a connection group in `FormatDescriptor.options` (**small**); a
`test()` call on a source (**small**); the Neo4j server reader and the STRING reader (proposed
readers, issues #303 to #308; **medium** each). The element today reads Neo4j only as a CSV
export variant.

### 2.14 Reload a URL-backed dataset and recover when it fails (screen 32)

**Design.** A dataset that came from a URL shows "Source example.org [Reload]" on its Overview;
Reload is also in the Dataset "..." menu and on Ctrl+Shift+R. A successful reload is one undo
step and marks objects stale if the data changed. A failed reload keeps the last good copy: the
row under Source says "Could not reach example.org/karate.gml (404 Not Found). Showing the copy
loaded at 10:42." (red), with [Retry] [Change source...] and a Details disclosure ("HTTP 404 at
10:57"); the status chip reads "Reload failed [Details]". No object goes stale, because nothing
under it changed.

**Element API.** Missing: `data.reload()` that re-reads the recorded source and swaps only on
success (**small** once the staging swap of 2.9 exists), and the source address and load time on
`lastImport()` (**tiny**).

## 3. Element work this cluster adds

| Item                                                                                                                                           | Size                                                                   | Gaps               |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------ |
| `session.data.peek(file \| url \| text)` extended: counts for both files of a pair, the first rejected lines with reason, a one-column warning | small (on top of the proposed peek)                                    | 2.3, 2.4, 2.5, 2.8 |
| Staging load: a failed or cancelled load leaves the previous graph untouched                                                                   | medium                                                                 | 2.9, 2.10, 2.14    |
| Cancel through `AbortSignal` (issue #296)                                                                                                      | small                                                                  | 2.3, 2.10          |
| `data.add(..., { onExisting, dryRun })`                                                                                                        | small for skip and dry run (#337); medium for replace and merge (#297) | 2.1, 2.2           |
| Reader options through `FormatDescriptor.options`, including a connection group, and `test()`                                                  | small                                                                  | 2.7, 2.13          |
| A reason on `E_FETCH_FAILED` (blocked, not found, offline, not graph data)                                                                     | tiny                                                                   | 2.3                |
| Subset load (busiest N, largest part, neighbourhood, time window) and a memory estimate                                                        | medium to large; estimate small                                        | 2.11               |
| Enforce the render ceiling and report `drawn`; performance mode (#302)                                                                         | medium                                                                 | 2.12               |
| Neo4j server and STRING readers (#303 to #308)                                                                                                 | medium each                                                            | 2.13               |
| `data.reload()` and the source on `lastImport()`                                                                                               | small                                                                  | 2.14               |
| Drop edges whose endpoint is missing from the nodes file                                                                                       | tiny                                                                   | 2.5                |

All of it belongs in graphty-element: a third-party page that embeds the element needs the same
peek, cancel, add rule, subset and reload, and the app only draws them.

## 4. Screens

| Screen       | Shows                                                                                                 | Gaps               |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------------------ |
| 1 (changed)  | the Welcome sheet's fourth way in, "From a database or service..."                                    | 2.13               |
| 14 (changed) | From [File \| URL \| Paste \| A source], Options collapsed, Node id and Label, "Add a nodes file..."  | 2.3, 2.4, 2.6, 2.7 |
| 22           | URL tab: address, fetching with Cancel, the three failures                                            | 2.3                |
| 23           | Paste tab from Ctrl+V on a loaded graph; a line that does not parse                                   | 2.4                |
| 24           | an edges file and a nodes file, with the match choices                                                | 2.5                |
| 25           | Options open, a wrong separator fixed, 12 unreadable rows                                             | 2.7, 2.8           |
| 101          | a file dragged over a loaded graph: the drop outline                                                  | 2.1                |
| 26           | a file dropped on a loaded graph: Into, dry run, same-id rule                                         | 2.1, 2.2           |
| 27           | a load that fails: the error in the Welcome sheet, the in-dialog failure (inset), the red status chip | 2.9                |
| 28           | a load in progress with Cancel                                                                        | 2.10               |
| 29           | a file above the render ceiling: choose a subset                                                      | 2.11               |
| 30           | a graph drawn over the ceiling                                                                        | 2.12               |
| 31           | A source: Neo4j, with STRING beside it                                                                | 2.13               |
| 32           | a URL reload that failed, the last copy kept                                                          | 2.14               |

Rows of other documents that this one supersedes, to be merged by whoever integrates round 3:
`revision.md` section 6.12 rows "Load progress and Cancel a load" (now 2.10) and "SIF, CX2,
STRING, BioGRID, Neo4j APOC readers" (now 2.13, a fourth tab rather than Open...);
`round-2/screens.md` screen 1 (four rows, not three) and screen 14 (the From row, Options,
Node id and Label, the nodes-file row); `object-model.md` section 9 "Import" (From has four
segments, and Into is a four-way choice rather than "Replace or Add"); `round-2/coverage.md`
section 1 rows "Load from a URL", "Load from a named source", "Load progress", "Cancel a load",
"Incremental add", "Large-graph limits" and section 13 "Awkward" rows for named sources and
incremental add, whose Mock column becomes the screens above.

## How the mocks draw it

The four ways in are the dialog's tabs; Into is a radio group; pasted text, a Cypher query and a
gene list are monospace fields; errors sit under the field they are about in red; Load is drawn
disabled where it waits; the status bar's failure and limit chips are red and amber; a load that
fails is said inside the Welcome sheet; a load in progress is a centred card with the pending name
greyed in the header; VR is greyed with its reason as a tooltip on screen 30. The second state of
a screen (a failure beside the normal case, the JSON options, STRING) is an inset with a dark tag.
The drop outline is its own screen, 101, because it is the moment before screen 26's dialog.
