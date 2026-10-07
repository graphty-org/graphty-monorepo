# Tier 2: how each missing capability is built

Written 2026-10-07. Tier 2 is the common work a returning user does: filter the graph, find the
shortest chain between two people, keep notes, load two spreadsheets as one network, have every
analysis read the weight chosen at load, and rerun the work when the data file changes. An audit of
the current build (the served app at `https://dev.ato.ms:9366/?next`) found most of this missing
from the app, some of it missing from graphty-element, and five defects on the way:

- Clicking a Shortest path row in the Graph tree replaces the whole app with an error page. The
  run inspector draws a histogram of every run's first field, and a path's first field is a yes/no.
- Typing `=weight > 3` in Find does nothing visible. graphty-element refuses the rule (a number
  must be written between backticks) and the refusal escapes as an uncaught script error.
- A filter on an edge attribute leaves 0 nodes and 0 edges.
- Selected edges get no mark on the canvas, and a click on an edge reads as a click on empty
  canvas.
- Runs read the loaded weight inconsistently: community detection and shortest path read it,
  PageRank does not unless told to, and the shortest path's notes call the column "weight" whatever
  it is named. One column is a strength to community detection and a distance to shortest path.
  The owner decided that the weight chosen at load is used by every run. This is required.

This document decides, for each capability, where it lives, how it behaves, its words, what
graphty-element supplies, and why. The source designs are the refined structure B spec
(`ux-storyboards-mocks-and-study/design/ui/prototype/tmp/structure-b-refined.md`) and the glossary
(`design/ui/framework/glossary.md`). Where they disagree, the glossary wins on words.

The rules every part follows: graphty-element computes and returns neutral facts and refusals as
`{ code, params }`; the app writes every word. Appearance goes through style layers. A shared
control that is wrong is fixed in compact-mantine. A new or changed public API of graphty-element
is built minimally, recorded in `../owner-decisions.md`, and its pull request carries `hold` and
`needs-decision`.

## What is in, and what waits

In, because a tier 2 task needs it or a defect blocks one: filters, shortest path, notes, two
tables as one network (one node table and one edge table, which the element already loads), the
loaded weight with a meaning and per-run overrides, replace a file and see what went out of date,
neighborhood distance, edge selection, and the Find rule errors.

Waits, each with its reason:

- **Several node types joined on a key column** (Links to, Subtype, One edge per Pair, Combine).
  No tier 2 task needs it: the two-spreadsheet task is one node table plus one edge table, which
  the element and the app already load. It is also the largest public format in the list, so it
  goes to the owner as a design before anything is built.
- **Node weight.** Nothing in graphty-element reads a node weight yet. A Weight role on node tables
  would promise something that does nothing ("no unbuilt item is drawn"). It arrives with its first
  reader.
- **The Select where dialog** (Query and Ids tabs, Replace, Add, Remove, Within). Find with a
  leading `=` already selects by rule; a second home for the same job breaks "one home per
  feature". Find gets the error line and the hint instead. Revisit if the tier 2 study shows people
  needing Add or Within.
- **Several path queries under one run row.** That needs a run that holds several queries, a new
  public API, for a tidiness gain. Each query stays its own row.
- **"Add as steps"** (one group row per hop) and **"Select edges between"**. No task needs them.
- **The selection bar.** Each of its verbs has a home already (P, N, G and the node menu). No round
  showed people missing it.
- **OR and NOT between filter steps.** Steps combine with AND only, which is what the element's
  filter composes today.

## 1. Filters

**Where it lives.** A Filters section in the Data place, between Sources and Attributes. A filter
chip in the header, drawn only while at least one step is on, opens that section.

**Interaction.**
- "+" in the section header opens the step editor in the inspector. Its first field is **Keep**:
  "an attribute's value", "the largest component", or "the neighbors of the selection" (the last
  only with a selection). Then the attribute, the comparison and the value. Committing adds the
  step, on.
- Each step row reads as a sentence and, while on, its outcome. It has an **Apply this step**
  checkbox at the end of the row; an unticked step is grayed and its row says "off" in words.
  Enter on a row opens it in the editor; the row menu has Delete.
- Steps combine with AND, so their order does not change the result: there is no reordering.
- An attribute's menu (in the Data place and the inspector) gets "Filter to...", which opens the
  editor with that attribute filled.
- A step on an edge attribute keeps the edges that pass and the nodes at their ends.
- Adding, ticking, unticking, editing and deleting a step are each one undoable step. Undo works
  as everywhere else (it reverses the act), and the undo notice names the step.

**Words.**
- Step: "weight is at least 4". Outcome: "22 to 9 nodes".
- Edge-attribute step, one line in the editor: "Keeps edges that pass and the nodes at their ends."
- Checkbox accessible name: "Apply step: weight is at least 4".
- Chip: "9 of 22 nodes", accessible name "Filter: 9 of 22 nodes".
- Empty section: "No filters." with the "+" beside it.
- Status line on a change: "Filter on: 9 of 22 nodes, 14 edges".

**graphty-element supplies.**
- The edge-attribute defect fixed: an attribute leaf on an edge attribute speaks edges, and the
  step keeps the nodes at their ends. Grow an existing leaf (`range`, `categories`) before adding
  one. The choice "keep only the ends" versus "keep every node" is an option with the current
  behavior as its default.
- **Filter steps as element state (public API).** The visibility filter becomes an ordered list of
  steps, each `{ id, on, rule }`, stored in the visibility slice, saved in the project file, one
  undoable step per change. `plan()` reports per-step counts (nodes and edges left after each step
  that is on). Why in the element: an unticked step is graph state the project file must keep, and
  an app that held the list and composed the rule itself would own graph state.

**Why.** Refined B section 7.2 decides the section, the sentence rows and the checkbox (not an eye,
because a filter changes what is computed while the eye only hides). The chip is drawn only while
a step is on because "Full graph" at rest spends words on nothing a reader can act on (the 50-word
budget). No reorder because AND makes order meaningless. Standard undo because every other act
undoes that way; one rule.

## 2. Shortest path

**Where it lives.** One Path popover, opened from three doors: the P key, "Path between..." on a
node's canvas menu, and the existing Analyze entry. The result is a run row in the Graph tree, as
today.

**Interaction.**
- **From** and **To** are pick fields. Each is a combobox over node names (type a name and pick
  from the list, as in Find), and pressing the field's pick button and then clicking a node on the
  canvas fills it. With one node selected, From is filled and focus is in To; with two, both are
  filled and focus is on Find path.
- **Follow** (Out | All) appears only on a directed graph.
- **Weight** is the shared Weight line (section 5).
- Committing adds a run row and selects it. Each query is its own row.
- The run's inspector shows the route instead of a histogram: the nodes in order, hops, and the
  total when a weight was read.

**Words.**
- Popover title "Shortest path"; button "Find path".
- Row summary: "3 nodes, 2 edges". Inspector: "Ava, Kofi, Lee", then "2 hops", then "Total
  distance 5" only when a distance weight was read.
- No path: "No path from Ava to Lee." from the element's code.
- Status line: "Shortest path added: Ava to Lee, 2 hops".
- Never "route" (a rejected synonym).

**graphty-element supplies.** Nothing new for the crash: the shape contract already says a path
publishes `onPath` and `order` per node and `length`, `cost` and `hops` for the graph, and that its
layer is a highlight, not a measure. The app picks the inspector from the shape. The weight comes
from section 5.

**Why.** The crash is the app guessing every run is a measure; reading the element's shape is
consuming, not guessing. Pick fields replace Shift-click, which failed on unlabeled nodes; the typed
combobox is the keyboard path (WCAG 2.1.1). "Follow" is the glossary's word for which edges are
followed; "direction" is the graph's own property.

## 3. Notes

**Where it lives.** A Notes place on the rail, below Data. Note counts on inspector headers.

**Interaction.**
- Doors: the N key, "+" in the Notes place header, and "Add note" on the node, edge,
  several-elements and graph menus. Every door writes about whatever the inspector shows; with
  nothing selected the note is about the graph.
- The editor opens in place at the top of the list, focus in the text. Mod+Enter saves; Esc
  discards an empty editor (and asks nothing of a filled one: it keeps the draft until saved or
  cleared).
- Each note shows its text, its target chips, and a meta line with the time (", edited" when
  changed). A chip opens its target in the inspector. A target the current filter hides reads "Not
  in the current graph" in words.
- The list is one Tab stop; Up and Down move between notes. After a delete, focus goes to the
  next note, or to "+" when the list is empty.
- Notes are saved in the project file and come back on reopen.

**Words.** Place name "Notes". Empty: "No notes." with "+" beside it. Inspector: "2 notes" as a
link to the Notes place; the inspector never repeats a note's text. Status line: "Note added about
Ava".

**graphty-element supplies.** Nothing new: `session.notes` already lists, counts, marks filtered
targets, and is written into and read from the project file (`graphty-notes`). The unit proves the
round trip in the app before building anything on it.

**Why.** Refined B section 8 decides it. Left out of this batch: Cites chips, the author line,
the "notes" paint row in the Graph tree, and the filter by target. Each is one more thing on
screen, and no tier 2 task asks for it.

## 4. Two tables as one network, and the Sources list

**Where it lives.** The Data place's Sources section, and the header's graph line.

**Interaction.** Sources lists one row per load still in the graph, each with its tables as
children. A source row's menu holds Edit source... and Replace with file... (section 7); no task
needs Remove, so it is not added. Edit source... opens the Data page on that source's own tables with their roles,
not an empty "Add to" page.

**Words.** The header line reads "From friends.csv" for one source and "From 2 files" for more.

**graphty-element supplies.** **Every source, not the last (public API).** Today the graph slice
keeps one source descriptor and each load overwrites it. A `data.sources()` list (each source's
name, format, tables, and the counts it added) keeps every load, saved in the project file and
moved by undo. `data.source()` stays and returns the last one, for existing consumers.

**Why.** The two-spreadsheet task ends with "make sure every person and every link arrived";
a Sources list that forgets a file contradicts that. Several node types wait (see above).

## 5. Weight chosen at load and used by every run (required)

**Where it lives.** The Data page (the meaning of the weight), Analyze and the Path popover (one
Weight line per entry that reads a weight), the run's Made with (what it read), and the graph
inspector (the loaded weight).

**Interaction.**
- On the Data page, an edge table whose Weight role is set shows a segmented control
  **Higher means: Closer | Farther | Capacity**, starting unset (a weight picked automatically
  says "auto" and has no meaning until chosen; the glossary rejects guessing a role from a name).
  A table with no weight shows "Weight: none (each edge counts 1)".
- Every Analyze entry the element marks as reading a weight shows one Weight line: a select listing
  the loaded weight first, then None, then the other number columns, each with its meaning. An
  override applies to that run only.
- An entry that reads no weight shows nothing about weight (no line saying "not read": words at
  rest).
- Made with shows what the run read, from its caveats.
- The graph inspector shows "Loaded weight: weight (closer)".
- Opening a CSV with "Open project or file..." while a project is open goes through the Data page,
  so its weight is chosen like any other load.

**What a run does with the loaded weight.** Every algorithm that has a weighted form reads the
loaded weight by default. An algorithm reads weights in one sense:
- similarity readers (PageRank, community detection, and the like) read a weight whose meaning is
  closer or unset;
- distance readers (shortest path, weighted closeness and betweenness) read only a weight whose
  meaning is farther. Given a similarity or unset weight, they count hops and say so with a code.
  They never read a similarity as a distance (that is a wrong answer, not a wording problem);
- capacity readers (flow) read a capacity.

An algorithm with no weighted form (degree, and others) reports that it read no weight.

**Words.**
- Data page: "Higher means" with Closer, Farther, Capacity; under it the glossary gloss of the
  chosen one ("larger = closer").
- Weight line: "Weight: weight (closer)"; options "weight (closer, loaded)", "None", "emails".
- Made with: "Weight: emails (closer)", or "Weight: not read -- weight means closer, and a path
  needs a distance", from the code.
- Graph inspector: "Loaded weight: emails (closer)".

**graphty-element supplies (public API).**
- A weight meaning chosen at load: the edge table's mapping takes a meaning (`"strength"`,
  `"distance"`, `"capacity"`, or unset), kept with the graph and saved in the project file. The
  existing `WeightMeaning.meaning` (`"distance" | "strength"`) grows `"capacity"`; it is not
  renamed. The app writes "closer" for `strength`.
- A fact for the loaded weight: its column and meaning (or none).
- A catalog fact per algorithm: which meaning it reads (`strength`, `distance`, `capacity`) or
  none.
- One uniform `weight` run option across algorithms: absent means the loaded weight, `null` means
  unweighted, a column name (with a meaning) overrides. PageRank's default changes from
  unweighted to the loaded weight.
- Caveats name the column actually read (never a hardcoded "weight"), and a skipped weight carries
  a code with the column and its meaning.

**Owner question, recorded with the API.** Should a distance reader convert a similarity (1/w,
1 - w, or -log w, which the glossary lists) instead of counting hops? This build counts hops and
says so, because inventing a conversion picks one of three answers silently.

**Why.** The owner's rule. The meaning lives in the element because the same column is otherwise
a strength to one algorithm and a distance to another, which is a graph fact, not a word.

## 6. Neighborhood distance

**Where it lives.** The neighbor list G opens (and the Degree row's route), as today.

**Interaction.** G still selects one hop at once and opens the named list; that route went from
failing to 8 of 8 in round 2. The list's header gets **Hops 1 | 2 | 3** and, on a directed graph
only, **Follow: Out | In | All**. A change reselects and relists at once. A **Filter to neighbors**
button adds one filter step ("neighbors of Ava within 2 hops"). "Grow by one hop" leaves the
toolbar's "..." menu and the canvas menu: the neighborhood has one home.

**Words.** "Hops", "Follow", "Filter to neighbors". Status line: "14 nodes within 2 hops of Ava",
once per change.

**graphty-element supplies.** Nothing new: depth and direction exist, and the `neighborhood`
filter rule exists.

**Why.** The header keeps the route that works and replaces a hidden menu item; a popover in front
of the list (refined B) would add a step to the route that passed.

## 7. Replace a file and see what went out of date

**Where it lives.** A source row's menu, and run rows.

**Interaction.**
- "Replace with file..." opens the file picker, then the Data page titled "Replace: friends-v2.csv"
  with every role and the weight meaning carried over. When every column matches, focus lands on
  Load. It is offered on a source that is the graph's only source and has one table; that covers
  the rerun task, and replacing one source among several needs per-source rows the element does
  not track (a known ceiling).
- Runs, styles and notes are kept. A run computed on the old data gets the out-of-date mark on its
  row and a state bar in its inspector with "Rerun". Nothing reruns by itself: a run the reader did
  not start must not start.
- The Data page's load report says what changed: "Was 20 nodes, 60 edges; now 22, 74".

**Words.** State bar: "Data changed since this run" with "Rerun". Row: the shared out-of-date mark,
and "out of date" in its accessible name. Status line: "friends.csv replaced: 22 nodes, 74 edges.
3 rows out of date".

**graphty-element supplies (public API).** The stale fact today compares counts only, so a file
with the same nodes but new weights is not flagged. The stale note gains a reason code
(`data-changed` or `scope-changed`), and staleness compares the data's content revision as well as
the scope. A replacing load keeps runs, styles and notes (the unit confirms whether it already
does).

**Why.** Refined B sections 7.1 and 11.3 decide the door and the carried-over roles. No automatic
rerun and no "Rerun all": both start work unasked, and one-at-a-time is enough for the task.

## 8. Edge selection

**Where it lives.** The canvas, and the edge inspector the app already has.

**Interaction.** Clicking an edge selects it; Shift-click adds. Selected edges are drawn with a
mark. The edge inspector shows the two ends, the weight and the edge's values, and a "Select
endpoints" command.

**Words.** Inspector title "Ava -- Kofi" (undirected) or "Ava -> Kofi" (directed). Status line: "1
edge selected".

**graphty-element supplies.** `elementAt` already promises `{ kind: "edge", id }` in its type; it
returns only nodes today. The fix: edge picking at the canvas, a click on an edge selecting it, and
the element's selection layer giving selected edges a mark at 3:1 contrast. No new public names.

**Why.** "A result the user cannot see is a fatal flaw": an edge selected from the table that shows
nothing on the canvas is the screen disagreeing with itself.

## 9. Rules in Find

**Where it lives.** The Find box.

**Interaction.** While the text starts with `=`, one gray line under the box shows the rule as the
element reads it, and Enter selects its matches. A rule the element refuses gets one line under the
box, tied to the field (`aria-invalid`, `aria-describedby`), and nothing escapes as a script error.

**Words.** Hint: "Rule: press Enter to select matches". Refusal for an unquoted number: "Put
numbers in backticks: weight > `3`". Other refusals: "Not a rule Find can read (at character 9)".

**graphty-element supplies (public API, small).** The refusal already carries a code
(`E_BAD_SELECTOR`) and the position; it gains a reason in its details (for example
`number-needs-backticks`) so the app never parses the message.

**Owner question, recorded with the API.** Should the rule language accept bare numbers
(`weight > 3`)? That changes a published query language. Until he decides, the refusal teaches the
backtick form.

## Build order

1. graphty-element: the edge-attribute filter; filter steps; the weight meaning at load; every run
   on the loaded weight; selector refusal reasons; edge picking and the selected-edge mark; every
   source listed; staleness by content.
2. compact-mantine: nothing planned. A unit that finds a shared control wrong fixes it there.
3. The app: the path row crash and the Find error line (no element wait for the crash); the CSV
   intake through the Data page; Filters; the weight on the Data page, Analyze and the inspector;
   the Path popover; the neighborhood header; Notes; Sources; Replace; edge selection.
4. The studio: tier 2 tasks, answer key, returning-user personas, and a preflight of every decision
   above on the served build. The owner starts the study.

Several app units edit the same files (the inspector, the Data place, the menus and the command
registry), so they run in series where they overlap.
