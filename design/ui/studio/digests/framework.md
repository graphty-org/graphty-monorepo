# Digest: the graphty UX framework, for a first-time user's core path

What this is: a dense summary of the design framework the graphty app is designed against, the
earlier object-first exploration it superseded, and the requirement personas and workflows, cut
toward one question: what must a first-time user's core path (arrive, load, look, try one
analysis, decide) honor. Every claim names its source. Paths are relative to the repository root;
`fw/` means `design/ui/framework/`, `ofx/` means `design/ui/object-first-ux/`, `dl/` means
`design/designloom/`. The framework files in the studio worktree are identical to origin/master
(checked with `git diff origin/master`).

## 0. Read this first: six facts that shape every tier 1 decision

1. **Two packages, one owner of graph logic.** graphty-element (the web component) owns every
   graph capability: loading, styling through style layers, algorithms, layouts, selection,
   results, the project file, and the facts behind every reader-facing string (see item 5). The graphty app
   is only chrome: panels, menus, settings, the start screen. A design that puts graph logic,
   graph words or graph probing in the app is wrong, and an app workaround for an element defect
   is forbidden (`CLAUDE.md`, "Architectural Principles"; `fw/README.md` opening; `fw/content-design.md` 1, "The owner test").
2. **The design target is the intermediate weekly analyst, not the novice.** Other skill levels
   are served only by aids everyone gets: undo, working defaults, (i) icons on technical terms,
   tooltips that wait, Quick actions with friendly aliases, sample graphs, the "Additional
   labels" toggle, documentation. "No persona-specific features, modes or panels" is a fixed rule
   (`fw/principles.md`, intro, "How every skill level is served", "Rules, not principles").
3. **No first-run interface.** Onboarding coach marks, "What's new" dialogs and the dismissible
   promotional card are explicitly listed as Figma weaknesses not to copy. An element that
   "exists because a beginner might not know, or appears only the first few times, fails"
   (`fw/principles.md` 0, "Not copied" item 6; "How every skill level is served", Test). This
   directly contradicts the `guided-onboarding` capability (welcome modal, 5-7 step spotlight
   tour) in `dl/capabilities/guided-onboarding.yaml`; the framework wins, because designloom
   personas and workflows "validate the framework and never generate features" (`fw/README.md`).
4. **Figma is the chrome grammar.** Panels, rows, menus, keys, editing and the frame copy the
   Figma editor; every difference is a row in the departures ledger with a forcing graph fact
   (`fw/principles.md` 0; `fw/figma-crosswalk.md` 4). Graph behavior follows graphty's own model.
5. **A newer owner rule overrides the framework on words.** The worktree's `CLAUDE.md`,
   "graphty-element is neutral about presentation" (owner, 2026-10-03), says the element returns
   neutral facts (`{ code, params }`, values, descriptors) and never reader-facing sentences,
   default English text, headings, groupings or choices of what to show; the app writes all
   words. `fw/content-design.md` 1 ("The owner test") and the owner's 2026-09-28 decision
   "Host names for reader text" (`fw/decided-doors.md`) still say graph-fact strings and an
   unpublished English default ship from the element. Where they differ, `CLAUDE.md` wins; the
   framework text is stale on this point. The same `CLAUDE.md` also adds "Easy things easy, hard
   things possible" for public APIs.
6. **Everything is a hypothesis.** No top-task vote, tree test, card sort, first-click test or
   teach-back has run; all 25 workflows and the personas are `validated: false`. Only the outline
   (`fw/information-architecture.md` 4.1) and the object map (`fw/conceptual-model.md` 1.3) are
   frozen; the freeze lifts on the owner's single-rater ranking, a paper trace of the outline
   against the 25 workflows, and a five-person hallway pilot (dated 2026-10-10)
   (`fw/README.md`, "The freeze"; `fw/research/study-schedule.md`, "Pilots and decision studies").

## 1. Principles, ranked (`fw/principles.md`)

Each is "A even over B". A principle stays only if it wins a real conflict nothing else settles.

**0. Baseline, unranked: Figma's way, even over a locally better idea.** Conventions copied:
selection drives the inspector, and with nothing selected the inspector belongs to the graph;
"+" adds first with defaults, configure afterwards; no confirmations, every act is one silent,
exact undo step; one home per capability (context menu, main menu and Quick actions are doors to
it, never second implementations); one overlay at a time; edits commit on Enter, Tab or blur;
**the app never starts work unasked** (opening a file shows the file; at Load only O(n+m)
readings fill, everything else reads "Not computed"); help on request ((i), waiting tooltips with
name plus shortcut, "Additional labels"). Not copied from Figma: inaccessible layers tree and
right-click-only menus; a second Escape that deselects; mouse-down firing; uneven rail panels; one
word for two meanings; promotional and first-run interface. "Ours is clearer" is taste, not
evidence; a departure needs a graph fact, a WCAG criterion, a named failing workflow, a
convention of Gephi/Cytoscape/NetworkX for keys, or a platform fact. Target under 40 forcing facts.

**1. A value never misstates what it describes, even over a quiet screen.** Every value lets the
reader tell its scope, freshness, exactness and producer. Marks only on departure from the
reference state (full graph, exact, current). Scope is marked once at the smallest container:
the **filter chip** ("Filtered: 1,204 of 5,310 nodes"), always visible, is the one statement of
the filtered count. Caveats are one of five kinds (scope, freshness, exactness, variant, violated
precondition). Copying a single value copies the raw number.

**2. The method named is the method run, even over a faster default.** Exact is the default at
every size; a cheaper (sampled) method is offered as a variant, never swapped in; a command
expected to take 10 s or more shows its cost band word before the run; the estimate comes from
graphty-element, never the app.

**3. Graph objects are the work, even over giving everything a place.** Primary objects: graph,
node, edge, kept sets and paths (groups and found paths are reached through their result). Only
Create set, Create path and the set operations add object-list rows. Reading (Find, Select
neighbors, Compare) adds nothing to the object list.

**4. The field's standard terms, even over friendlier words or Figma's words.** Betweenness,
degree, PageRank, connected components, modularity, density, transitivity, and so on
(`fw/glossary.md` 12). "Group" names a part of a partition, never a container. (i) defines in at
most two sentences and never recommends. Friendly words live only as search aliases.

**5. The data speaks, even over the app explaining itself.** App-text budgets with "Additional
labels" off: a selected object's inspector about 30 words, 40 max, 3 words per heading; **the
whole screen at rest with a graph loaded and nothing selected: at most 50 words** (left panel 8,
graph inspector about 32 including Statistics, 10 for header, toolbar, chip, legend title and
not-drawn line). Graph inspector at rest: at most three sections plus Statistics. Counting method:
`fw/content-design.md` 7.

**6. The drawing stays where the analyst left it, even over a better layout.** Positions change
only when the analyst acts. The first placement of never-placed nodes (open without positions,
first 3D entry) is not a move.

**Ranking:** 1 over 5; 2 over 5; 4 over 5; 1, 2, 3, 4 and 6 over the baseline, only through a
departures row. Other pairs unranked.

**Fixed rules (never traded), the tier 1 ones:** all graph logic in graphty-element; WCAG 2.2
AA in the default state (table and inspector are the canvas's text equivalent); appearance only
through style layers; an algorithm's suggested layers paint only its own result; color follows
the category, never its size rank; imported data never silently altered; anything counted but not
drawn says so; the marks are a closed list; no persona-specific features; plain ASCII.

**Decided elsewhere and relevant to tier 1:** 2D is the desktop opening view, 3D one click away
(`fw/decided-doors.md`, "Decided, and not doors"); default scope of a run is the filtered graph
frozen at start.

## 2. Top tasks and success measures (`fw/top-tasks.md`)

Ranked for the weekly analyst (Analyst Alex). Provisional targets "set by the first vote round":

| # | Task | Success rate | Time from rest |
|---|---|---|---|
| 1 | Characterize the whole graph ("What have I got, and did it load right?") | 90% | 30 s |
| 2 | Rank nodes by a centrality metric | 85% | 45 s |
| 3 | Detect communities and characterize them | 80% | 90 s |
| 4 | Find a node, inspect it, explore its neighborhood | 90% | 30 s |
| 5 | Take a note | 85% | 30 s |
| 6 | Filter to a subgraph, then characterize | 80% | 60 s |
| 7 | Make the layout readable | 85% | 45 s |

Bookends: **Load a graph** (fields map with little effort; the import report is reached from
task 1; Open starts a new project), **Start from a recipe**, **Export** (a figure carries its
legend and scope). Most sessions: 8 color or size by a value (legend produced; scale follows
measurement level), 9 sets, 10 compare, 11 shortest path, 12 reuse an analysis. Tail: layout
choice, 2D/3D/VR/AR, saved views, and more.

Task 1 success: with nothing computed first, the analyst reads size, direction, density,
components and isolates, degree distribution and an attribute profile, and a broken import
(wrong direction, weight read as text, negative weights, a flood of isolates) is visible before
any algorithm runs. Rules for the ranking: rank buys prominence, never a control of its own;
cost of error overrides rank (checking the import, declaring what an edge weight means, a weight
threshold, how a result read the edges stay visible); tasks 2 to 7 must be about equally
reachable until a vote.

## 3. The first-time path in the framework: journey 1 and flow 2

**Journey 1, "The first look"** (`fw/user-journeys.md` 1): "What is this file, and is it any
good?" One sitting that may never repeat; small to medium graphs; sensemaking stage: foraging.
Drawn from W01, W18, W14 (activation: "User runs at least one analysis") and W02; Explorer Elena
("No guidance on where to start").

| Stage | Goal and doubt | Task | Served by | Trust question | Leaves behind |
|---|---|---|---|---|---|
| Arrive | "Where do I put this?" or "Can I try it on something first?" | load | start screen; a sample; the load step | Did it read my columns as I meant? | a data version and its import report |
| Triage | "Is this the right file, did it load right?" | 1 | graph's Statistics under the overview recipe; the Last import row | Is a broken import visible before anything runs? | nothing |
| Sample | "Do the rows mean what I think?" | 4 | inspector and table | Am I reading raw values or paint? | a selection |
| Try a measure | "Which measure answers my question?" (pain: "Don't know what questions to ask of the data") | 2, 3 | the catalog by family; Quick actions' search by question word | Does this measure fit this graph? | a result |
| Decide | "Go on, clean it, or find better data?" | 5 or load again | a note; the project's data | Will I remember why I stopped? | a note |

**Flow 2, "Load, then characterize under the overview recipe"** (`fw/task-flows.md` 2). Rest is
the graph's inspector with nothing selected and the rail on Graph. Desk count: a file is 3 steps
(Open...; the file; Load); a sample is 1 step (Open sample; samples never pass the load step);
characterizing is 0 steps once loaded. First failures: the file will not open (the load step
stays open on the error), or it opened wrongly (edge list read as node list, weight read as text).
Trust checks after load: the Last import row (direction, isolates, self-loops, parallel edges)
and the weight role on the attribute. Element gaps on this path (`fw/element-needs.md`): a load
preview before commit, a graph's size read from the file, Filter at import, Re-map columns,
reading a dropped file's profile, the overview recipe itself. Walkthrough questions to test:
does "Overview: General" read as a label with Replace beside it, or as jargon?

**Flow 3, run a measure and read it** (`fw/task-flows.md` 3) and **flow 6, find, inspect and
expand** (`fw/task-flows.md` 6) serve the Try-a-measure and Sample stages.

**What runs at Load** (`fw/files-and-recipes.md` 2, the one statement): graphty-element ships
**General overview** and runs it at load (owner decision, `fw/decided-doors.md`). Only O(n+m)
readings fill: counts, density, direction, components, isolates, self-loops, parallel edges,
degree family, reciprocity on directed graphs. Every other row reads **Not computed** with its
cost band; **Compute the overview** runs them all. **An overview never paints**: the first
drawing is the element's neutral grays; color arrives only when the analyst or an applied recipe
chooses it. The floor of readings that expose a broken import is never removed by any recipe.

## 4. Conceptual model and vocabulary (`fw/conceptual-model.md`, `fw/glossary.md`)

**The model in one paragraph** (conceptual-model, "The model in brief"): a **project** holds
**graphs** of **nodes** and **edges**, both carrying **attributes**. **Algorithms** run over a
stated **scope** and keep values under a **result**, which offers its **groups** and **found
paths** until the analyst keeps one by **Create set** or **Create path**. **Filter steps** narrow
what every computation reads; **style layers** paint, top layer winning; **Hide on canvas**
changes only what is drawn; a **layout** arranges positions; **notes** record conclusions; a
**saved view** captures working state. Every change is one undoable **operation**; a **recipe**
carries an analysis without its data.

**The concept budget for tasks 1 to 4: twelve concepts on screen**: graph, node, edge,
attribute, Statistics, catalog entry, result, group, set, selection, filter step, style layer.
Everything else (run, item, offer, record, operation, data version, recipe, derived graph) is met
only from its own object. A thirteenth concept for tasks 1-4 must be named and justified there.
The word "recipe" waits behind Replace; the overview row reads "Overview: General".

**The object map, the one list of types** (frozen; section 1.3):
- Content (selected, can be a scope): Graph, Node, Edge, Set (fixed, rule, path; offered or
  kept), Path. A group and a found path are a set and a path in their offered state.
- Definitions (edited from a row, never selected): Result, Style layer (kinds: ordinary,
  highlight, Overrides, Base style), Filter step, Layout settings, Saved view, the Look, Note,
  Comparison.
- Values: Attribute, Pair. History: Data version, Run. Files and catalog: Project, Recipe, Set
  collection, Catalog entry.

Rules beneath it (1.4): every change is an undoable operation; looking leaves nothing behind;
every number names the graph it was computed on, and outside it is missing, never 0; no
algorithm reads a style layer and no style layer changes a number.

**Word tiers** (`fw/glossary.md` 1): Screen (interface and docs), Docs (docs and API only), Design
(framework only). Every on-screen word is a Screen term, a field term (section 12) or an interface
word (section 13). Rejected synonyms bind screen strings (a defect if used) and live only as
search aliases (section 16).

Key Screen terms: project (not "workspace", "session"); graph (not "dataset"; "network" alias);
node ("vertex" alias); edge ("link" alias); set, with **fixed** and **rule** kinds (not
"static/dynamic", "smart"); path (derived kind Cycle, Simple path, Trail, Walk); **group** (part of
a partition; community, component, k-shell, cluster, category, hierarchy level are kinds of
group, never synonyms); found path; result; style layer; filter step; filter chip; Statistics;
Last import; Not computed.

**States and their one verb** (`fw/glossary.md` 10), the ones a first session meets: Queued,
Running / Cancel; Failed / Re-run; Not run / Run; Not computed / its cost band, then Run; Out of
date / Re-run. **Closed marks:** "~" estimate; "at least"/"at most" bound; "not converged", "first N"; a variant
word ("(sampled)", "(unweighted)", "weakly"); a precondition phrase of at most three words;
"Filtered:"; "<channel> set by <layer>"; "missing attribute"; "<N> hidden"; "canvas not available".

**Voice** (`fw/content-design.md` 2; who writes the words is overridden by section 0 item 5): like a methods section. States facts and offers the next
verb; never praises, apologizes, encourages or recommends. Purpose test: every string says what a
value is, whether to trust it, or what to do next. Graph-fact strings belong to graphty-element
and are published as keys (`graphty.<area>.<message>`); the app never rewords a graph fact. The
app owns only chrome strings, including "the start screen's empty line" (content-design 1).

## 5. Information architecture (`fw/information-architecture.md`, `fw/interface-specification.md`)

**Orientation (IA 1):** graphty has no layer tree; nodes and edges are found through **Find**,
**the table** and **kept sets and paths**. The freed Layers slot holds the **style stack**.
Placement sources in order: the object map, the glossary, top-task rank, Figma's placements.
The app draws; the element supplies every collection.

**Placement rules (IA 2):** one output, one home, many routes; a home is where the output is
read, its detail opens from its row; inspector shows one thing, table shows many; definitions
edited, content selected; options live with what they configure (a result's options are rows of
its editor; layout options are the graph's Layout row). Four cost-of-error checks have a home at
rest: the import (Last import row in Statistics), the weight's meaning (Edges row), a weight
threshold, how a result read the edges.

**The frame** (README "The frame at a glance"; interface-specification 1.1, 1.2):
- **Rail** (~56 px): main menu, then Graph, Assistant, Results, Notes. **The rail opens on
  Graph** (IA 5).
- **Left panel** (~240 px) under a persistent **left panel header**: project name, save state,
  and the **filter chip** ("Full graph" until filters exist). Graph panel sections: Graphs, Sets
  and paths, Styles (the style stack, Overrides first, Base style last), Views.
- **Canvas** (graphty-element): drawing, selection marks, tooltip, note markers, minimap, one
  legend bottom-left with the not-drawn line, state cards.
- **Right inspector** (~240 px): sections chosen only by the selection's kind.
- **Bottom dock**: the table (Nodes, Edges, item tabs) and time slider.
- **Floating toolbar** (bottom center): Select (Lasso and Hand in flyout), Path, Note, Quick
  actions, view mode. Secondary bar above it for an armed tool.
- **Header**: Export... (the one filled button), the zoom and view menu. **Help** bottom right
  (Shortcuts, Open sample, Documentation).
- One toast slot for notices.

**Inspector kinds** (interface-specification 4.0, six provisional): Nothing (the graph's
inspector), One node, One edge, Several elements, Set, Path; Set and Path have offered variants
(group, found path) kept only by explicit Create set / Create path. Eight scored branches for the
tree test.

**Places** (IA 4) each answer one question; tier 1 meets four: Start screen "How do I start?"
(recents, samples, front doors; App), Inspector "What is this?", Canvas "Where is it, and what is
it next to?", Results panel "What have I computed, and what can I compute?" (this project's
results, then the catalog).

**Front doors (IA 6):** after any door, three questions are answerable without navigating: what
graph is this (inspector), what is it computed on (filter chip), what has been done (Results
panel). **Open lands in a new project**; bringing data into an open project is an explicit
command (Add data..., Replace data..., Apply recipe...) or a drop that offers the same choices.
**The load step** is a modal device on every data door, the one place a mapping is set; projects
and samples never pass it; Re-map columns is the one route afterward. Data opened lands on the
graph's inspector with the overview readings and the Last import row.

**Start screen template** (`fw/interface-templates.md` 19): recents first, then samples by name
and thumbnail, then one Open... that also accepts a drop, with Connect to data source... beside
it. Tab order in that order. First-run state: no recents, so that section is absent. Chrome only.
**Load step template** (`fw/interface-templates.md` 20a): format row; mapping rows (source,
target, id columns; each column's kind and role); issues list, blocking first; sample table;
counts; footer with a reason slot. Detection, mapping, issues, sample and counts are the
element's preview; the app draws them. Currently blocked on the element's load preview.

**Navigation (IA 5):** almost every number is a link (counts select, "N more", Used by, Created
from); every relationship is walkable both ways; what is selected, what mode, and what the
numbers are computed on are answerable without navigating.

**Findability (IA 7):** **Find** looks up nouns (node ids, names, attribute values, object names);
**Quick actions** looks up verbs (commands, algorithms, layouts), with rejected synonyms as
aliases ("brokers" finds betweenness). Each hands off to the other when nothing of its kind
matches. Below the drawing limit the canvas leads; above it Find leads and opens the table.

**Empty states** (`fw/state-matrix.md` 4.9): an empty collection shows its header with "+" and
nothing else, as a new Figma file's Layers does; Graphs always has a row; the style stack ends in
Base style; a value not yet computed shows the not-computed slot, never 0; small graphs keep
every behavior.

## 6. Interaction patterns (`fw/interaction-patterns.md`, `fw/interaction-pattern-entries.md`)

- **Selection (3.1):** click replaces; Shift+click toggles on canvas; Mod+click also toggles (a
  departure backed by Gephi and Cytoscape); marquee on empty canvas with Select; in the table,
  Shift+click ranges and Mod+click toggles; in object lists the same gestures **focus** rows
  rather than select. "Selected" is used only for the canvas selection. A number, legend entry
  or histogram bar selects what it stands for (4.3).
- **Commit (3.2):** a scrub or drag is one undo step; a purely visual field silently reverts bad
  input; a field that changes meaning keeps the typed text, marks it invalid, states the bound in
  the element's words, and blocks Run.
- **Cost (3.3):** response classes: under 0.1 s direct; 0.1-1 s nothing extra; 1-10 s running
  state on the object's row; over 10 s background, cancellable, band word before and during. A
  single Catalog click runs; a "few minutes or longer" run is created unrun with Run focused. In
  the first release every option and layout-parameter edit waits for Run; every editor shows a
  Run line saying "waits for Run" or "applies as you edit".
- **Undo instead of asking (3.4):** every command is one labeled undo step; nothing asks "Are you
  sure?"; Undo labels read the element's `history.nextUndo`; undo of a queued or running first run
  cancels it and removes the result; no Save command and no unsaved-changes prompt (autosave).
  The only questions left: overwriting an outside file, and contacting a network host a file
  names. Choice steps (a drop on a loaded graph, recipe binding) are not confirmations.
- **Feedback with the object (3.5):** lowest visible level first: the change itself; the
  object's row state; the two whole-project lines (not-drawn line, save state); one notice with at
  most one action, only when the effect is out of sight. No modal errors or confirmations; the
  load step, choice step, binding step and Export are modal dialogs because each commits
  something that cannot be left half set.
- **Esc ladder (3.6):** Figma's three rungs (close, leave the edit or tool, deselect), one rung per
  press; an Esc that closes an overlay does nothing else.
- **Behavior map (section 2):** per object type, what a row click, the primary command, Select,
  Enter to members, Add with defaults, Delete, Reorder and Edit do. Notable: a Catalog entry click
  runs it within its cost line; deleting a set keeps its members; a filter step turns off by a
  checkbox, not an eye, because it changes what is computed.
- **Pattern library** (`fw/interaction-pattern-entries.md`; index at interaction-patterns 1.4):
  for tier 1 the relevant entries are Select (4.1), a number or legend entry selects what it
  stands for (4.3), Paste and drop (4.5), Add with defaults (6.1), Edit in the inspector and one
  popover (6.2), context menu and tooltips (6.7), long-running work (7.1), errors at the smallest
  scope (8.1), keyboard and assistive technology (9; plain arrows orbit the camera, the canvas
  walk uses neighbor-walk keys, an owner decision). Owed: Re-map columns; placing nodes by
  attribute; a layout's fresh start; readings under a replaced overview.

## 7. Build order and what tier 1 can rely on (`fw/implementation-mapping.md` 9; `fw/one-way-doors.md`, "The queue")

Status line: graphty-element 2.6.1 at origin/master `9fc948ee`; the undo design is unmerged
(PR #553, branch feat/element-undo), so slices needing undoable steps wait. Slices, each one PR
across packages, element first:

- **0** open a node (`open-and-inspect-a-node`); **1** open and characterize plus the keyboard
  floor (task 1: element-owned command registry, read-only "Full graph" chip, General overview,
  component-size list, keymap, Esc rungs, live regions, tooltip; tests `open-and-characterize`,
  gate `keyboard-floor` on a bare embed); **2** find, inspect, table (task 4); **2b** menus and
  Quick actions; **3** reopen where I left off; **4a** rank (task 2); **4b** color by value (task
  8, waits for undo); **4c** Assistant parity; **5** sets, paths, shortest path, notes; **6**
  filters and layout (waits for undo); then the switch from the old shell; **7** recipes, notes,
  export; **8** comparison and version history.

Doors of slices 1 and 2 were decided by the owner on 2026-09-28 (`fw/decided-doors.md`): General
overview runs at load; theme and motion via `colorScheme`/`reducedMotion`; reader text as
published message keys; one canvas mark schema; default keymap and tools in the element; selection
over a cap drawn as a hull; a focused node with its own event; the session trimmed to its nouns.

**Sessions after each slice** (`fw/research/study-schedule.md`, "Sessions after each build
slice"): five think-aloud participants per slice, one keyboard-only (slice 1 adds a screen-reader
session); the task is the slice's done task; Single Ease Question after each task; RITE-style
fixes between sessions; findings feed the next slice and never gate the one tested.

The real app under study runs at `/?next` (the tier 1 workspace; the parameter goes away when it
becomes the default), driven by `design/ui/studio/tool/real.mjs` against the production build in
`graphty/dist` (`design/ui/studio/tool/README.md`).

## 8. The earlier object-first exploration (`ofx/`; superseded, kept as record)

`ofx/README.md`: an exploration organized like Figma around made things (groups, paths,
rankings, filtered sets), with mocks in `ofx/mocks/` (round 1 screens 1-8; round 2-3 gallery of
102 generated screens in `ofx/mocks/v2/`, built by `ofx/gen/build.mjs`). Rounds: round 2 settled
the frame without a rail; round 3 drew 99 missing functions; round 4 (`ofx/round-4/revision-round-4.md`)
brought the rail back and shrank the toolbar. The framework supersedes it where they disagree
(`fw/README.md`), but its novice findings are the only first-time-user evidence on record.

**Novice walkthrough, "Elena's first ten minutes"** (`ofx/critique/novice-walkthrough.md`), on
round-1 mocks with Karate Club: overall discoverability 3 of 5; she met all four W14 success
criteria but with three wrong turns. Scores: load the sample 5; understand the tree 3; color a
group 3; find a path 2; export a picture 4. Findings still worth testing against the real app:
1. unlabeled toolbar icons with a 1 s tooltip delay were the steepest moment, where she might quit;
2. the natural first click to recolor a group (the inherited swatch) did nothing;
3. "Colour this node..." made a one-node set instead of coloring her group;
4. the plain-language reading of a result was hidden behind "Made by" and "?";
5. nodes had no labels and no hover label on a fresh load, so picking nodes was guesswork;
6. the verb clicked ("Find groups") did not match the row name produced ("Communities (Louvain)");
7. the legend was off by default after the first grouping;
8. suggestion rows vanished after the first object;
9. "Share" was the only route to image export;
10-17 are minor: legend inclusion in export uncertain; two words for appearance; suggestion rows
read as data; the eye read as "hide" but meant "stop painting"; unexplained resting words
(Density, Mean links, Parts); an overwhelming Path flyout; three count formats; unclear export
areas.
"What to change first": let the toolbar speak (labels or no-delay tooltips); make the first click
on a color do the obvious thing; put a result's reading on its surface; hover labels on nodes;
legend switches on with the first grouping. Also: `ofx/round-2/critique-novice.md` and
`ofx/round-2/walkthroughs.md` (a novice's first ten minutes on round 2).

Note on fit with the framework: suggestion rows and a self-enabling legend would need checking
against principle 5 (budget) and the no-first-run rule; toolbar labels map to the "Additional
labels" toggle, and the label of a result's reading maps to principle 1 and the result's state line.

## 9. Personas and workflows for the first-time path (`dl/`)

16 personas, 25 workflows, all `validated: false`. Placement of every workflow is in
`fw/user-journeys.md`, "Workflows and where they run".

**Explorer Elena** (`dl/personas/explorer-elena.yaml`), the first-time user: product manager, no
graph training, novice, low time pressure, as-needed use, laptop, voluntary. Quote: "Just show me
something interesting - I'll figure out what questions to ask once I can see the shape of the
data." Behaviors: loads data and looks at the picture immediately; clicks prominent nodes;
searches for entities she knows; follows connections outward; relies on size and color for
importance; takes screenshots to share; **abandons tools quickly if the learning curve feels
steep**. Goals: visualize a network; understand what graph analysis can do; learn her data's
structure; load and see a visualization quickly. Frustrations: overwhelming options, unclear
terminology, no guidance on where to start, fear of breaking things. Workflows W01, W02, W14, W18.

**Analyst Alex** (design target; weekly, Gephi/NetworkX, frustrated by clicks and by no way to
save analysis patterns) and **Expert Emma** (daily, keyboard-driven, wants a command palette,
hates forced wizards) also run W01, W02 and W18 (`dl/personas/analyst-alex.yaml`,
`expert-emma.yaml`).

**W14 First-Time User Onboarding** (`dl/workflows/W14.yaml`; journey 1, Arrive). Phases: arrival
(clear call to action, not an empty canvas); data loading (file, URL, paste, sample; preview;
confirm); first visualization (rendered, basic node/edge counts); guided exploration (zoom,
select, layout); first analysis (e.g. community detection); next steps. Pain points: overwhelming
interface; no idea where to start; cryptic load errors; not knowing what to ask; feeling stupid.
**Success criteria: time to first visualization under 2 minutes; the user can describe what they
see; the user feels capable of exploring further; activation: the user runs at least one
analysis.** Its suggested `onboarding-wizard` component and the `guided-onboarding` capability
conflict with principle 0's "Not copied" item 6 and the no-persona-features rule; the framework's
answer is samples, working defaults, (i), tooltips, Quick actions aliases and Additional labels.

**W01 First Exploration - Quick Data Assessment** ("triage"; journey 1, all stages): size,
structure, degree distribution, sample rows, attribute completeness. Success: basic understanding
under 15 minutes; all major quality issues flagged; the user can say why they proceed or not.
**W18 Data Import and Validation** (journey 1, Arrive): detection, mapping, preview, load,
quality report. Pains: unrecognized format; edge list treated as node list; no progress on large
files; cryptic errors. Success: common formats load without manual intervention; major issues
flagged before the user proceeds. **W02 Visual Exploration - Overview to Detail** (journey 1,
Triage and Sample): overview, zoom, filter, details on demand. Pains: hairball; lost orientation.
Success: at least one structural pattern found; the user can say where they are in the whole.

**Capabilities** (`dl/capabilities/`): `sample-datasets` asks for Karate Club (34 nodes, 78
edges), Les Miserables (77, 254), a medium ego network, a 10,000+ node citation network, a 2-3
sentence description per dataset, pre-computed basic metrics, one-click load within 1 second, open
licenses. `guided-onboarding` (status planned) asks for the welcome modal and tour, which the
framework rejects (section 0, item 3).

## 10. Candidate success criteria for a tier 1 study, assembled from the sources

Not decided anywhere; offered so the studio can choose. Each names its origin.
- Time to first visualization under 2 minutes, sample or own file (W14).
- Activation: runs at least one analysis unprompted (W14; journey 1, Try a measure).
- Can describe what they see, including size and whether it loaded right (W14; task 1 success).
- Task 1 characterize: 90% success, 30 s from rest; a broken import visible before any run
  (`fw/top-tasks.md`).
- Sample load is 1 step; file load is 3 steps (`fw/task-flows.md` 2).
- After any front door: what graph, computed on what, what has been done, answerable without
  navigating (`fw/information-architecture.md` 6).
- Screen at rest with a graph loaded: at most 50 words of app text; selected object's inspector
  about 30, 40 max (`fw/principles.md` 5).
- No run the user did not start; no confirmation dialogs; every act undoable (`fw/principles.md` 0;
  `fw/interaction-patterns.md` 3.4).
- Every on-screen graph term is a glossary Screen term; values carry marks only on departure
  (`fw/glossary.md`; `fw/principles.md` 1).
- WCAG 2.2 AA in the default state; a keyboard-only and a screen-reader participant per slice
  session (`fw/principles.md`, rules; `fw/research/study-schedule.md`).
- Single Ease Question per task; five think-aloud participants; fixes between sessions
  (`fw/research/study-schedule.md`, "Sessions after each build slice").

## Sources

`CLAUDE.md`; `fw/README.md`; `fw/principles.md`; `fw/top-tasks.md`; `fw/user-journeys.md`;
`fw/task-flows.md`; `fw/conceptual-model.md`; `fw/files-and-recipes.md`; `fw/glossary.md`;
`fw/information-architecture.md`; `fw/interface-specification.md`; `fw/interface-templates.md`;
`fw/interaction-patterns.md`; `fw/state-matrix.md`; `fw/content-design.md`;
`fw/implementation-mapping.md`; `fw/one-way-doors.md`; `fw/decided-doors.md`;
`fw/research/study-schedule.md`; `fw/research/key-insights.md`; `ofx/README.md`;
`ofx/critique/novice-walkthrough.md`; `ofx/round-4/revision-round-4.md`;
`dl/personas/explorer-elena.yaml`, `analyst-alex.yaml`, `expert-emma.yaml`;
`dl/workflows/W01.yaml`, `W02.yaml`, `W14.yaml`, `W18.yaml`;
`dl/capabilities/guided-onboarding.yaml`, `sample-datasets.yaml`; `design/ui/studio/tool/README.md`.
