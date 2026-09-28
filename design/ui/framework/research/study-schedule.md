# Study schedule

**Job.** Plan every study the framework documents rely on, in one place, because studies share
participants. It owns the structure studies' methods, scoring, pass bars, tasks and answer keys;
`information-architecture.md` 12 says only what is validated and by which method. Other canonical
documents keep their own "Validation" sections, and their bars are cited here. **Owner:** UX
researcher. **Status:** started with the information architecture's studies; the top-task vote
(`top-tasks.md`), cognitive walkthroughs (`task-flows.md`) and the whole-product accessibility audit are to be added
by their owners; the options and encodings studies are below.

## Pilots and decision studies

Every study below is one of two kinds, marked in its row or heading.

| Kind | What it does | Size | Can lift the freeze | Can settle a design question |
|---|---|---|---|---|
| **Pilot** | finds gross errors: wording that gives the answer away, a place nobody can reach | about 5 people (Nielsen's qualitative rule), or a paper trace | yes, the freeze on the outline and object map (`README.md`, "The freeze") | no, never on its own |
| **Decision study** | settles a question with a threshold written before any data | tree test and first-click: 50 or more per tree or arm (Spencer; Optimal Workshop guidance); open or hybrid card sort: 15 to 30 (Tullis and Wood); top-task vote: well over 30, hundreds in McGovern's method | no; it re-checks | yes, at its threshold |

**The pilots that lift the freeze, with dates and owners.** Dates are proposed by the design
director and confirmed or moved by the owner; a missed date is recorded, never silently slid.

| Pilot | Owner | Date | Material | If it cannot run by its date |
|---|---|---|---|---|
| The owner's single-rater top-task ranking | the owner, with the UX researcher | sent 2026-09-29; answered by 2026-10-06 | the longlist of `top-tasks.md` as a pick-five form | the current ranking stays, labeled single-rater and unvalidated |
| The paper trace of the outline against the 25 workflows | the information architect | 2026-10-03 | `information-architecture.md` 4.1 and `design/designloom/workflows/` | it has no recruiting to fail |
| A five-person hallway pilot of the outline and the model | the UX researcher | 2026-10-10 | the tree-test tasks below, the teach-back tasks below | the paper trace alone lifts the freeze, labeled as testing reachability only |

**Every decision study with no powered sample is a pilot and says so.** In particular the
style-stack placement study (below) is a decision study only at 50 or more per arm; below that it
reports direction and the left-panel placement stays.

## Structure studies

- **Order.** Now: a qualitative tree-test pilot (5 to 8 participants, a pilot) to catch wording
  that gives the answer away; later, when recruiting exists, the quantitative tree test (a decision
  study, a re-check that gates nothing), and the catalog and layout card sorts in
  separate sessions. Later, once grayscale wireframes exist: the first-click tests, with
  participants who took neither the tree test nor a card sort, because a tree test teaches the
  labels a first-click test measures.
- **Material.** The tree test uses only the outline in `information-architecture.md` 4.1, loaded
  with each node's full path as its identifier. Graph size is not tested there, as a text tree has
  no canvas. First-run tasks use the **first-run variant**: the same outline with "In this project"
  holding only Connected components. The first-click tests use grayscale wireframes with a small
  and a large project seeded from real graphty-element session fixtures.
- **Scenario.** One scenario per study version, worded in its own terms. The first version is
  investigations (accounts, transfers, a Watchlist), because it covers the most personas; a biology
  version (genes, tumour and normal networks) runs only after it passes. The version is recorded.
- **Participants.** Drawn from the analyst personas (`design/designloom/personas/`). Figma
  familiarity and Gephi or Cytoscape familiarity are recorded. The tree test has 39 tasks and each
  participant does at most 10, in random order, with task position recorded, so about 195
  participants give every task at least 50 attempts (Nielsen Norman Group, "Tree Testing"). Card
  sorts take at least 15 each, 20 to 30 preferred (Nielsen Norman Group; Tullis and Wood).
  Fallback when recruiting fails: paper tree tests traced against the 25 workflows, which test
  reachability, not recall, and are labeled so.
- **Criteria are fixed before the study runs** and are not tuned afterwards.

### Tree-test scoring and bars

- **Keys come from the register.** Each task names the `output-homes.md` row its key is derived
  from. For an object or output, the correct nodes are its home; for a command, its starting
  places that are outline nodes, all equal. The type rows, row context menus and overflows that
  the outline does not show are left to first-click tests. Accepted routes are nodes that reach the
  home by a route the register lists; they count for success, not directness.
- **Outcomes.** Success is a correct node or an accepted route; directness is a correct node with
  no backtracking. Two outcomes are neither success nor failure and are reported per task: **went
  to search** (a final answer on Quick actions..., or on Find in a task not about
  finding a named thing), and **wrong state** (a click on a right-hand-panel branch the setup line
  does not state). Every task has a setup line; "[Nothing is selected.]" is the default and is
  shown. Expected distractors' click shares are reported, so a failure reads as a label or a
  structure problem; a "reported" distractor is a reading the task tells apart, not an error.
- **Bars.** Success 80% per task, 90% for the four cost-of-error checks of `top-tasks.md`;
  directness 60%. A task **passes** when the lower bound of its 95% interval is at or above the bar,
  **fails** when the upper bound is below it, and is otherwise **undecided**: it gets 50 more
  attempts once, then is judged on its point estimate. At 50 attempts the interval is about 8 to 14
  points either side. Success from 60% to the bar, or directness from 40% to 60%: relabel and
  retest; below those, change the structure. Results are read against the bar, never task against
  task. A rail place's score is the success on its tasks.

### Tree-test tasks

Paths are written as in the outline; "RP" is the bracketed right-hand panel, "setup" the line shown
first. "Cost" marks a cost-of-error check (90% bar); "first-run" runs on the first-run variant.

| # | Top task | Setup | Task (analyst words) | Register row | Correct nodes | Accepted routes | Expected distractors |
|---|---|---|---|---|---|---|---|
| 1 | 1, cost | nothing | Did this file load the way you expected? | 2: the latest import's headline and mark rows | RP > nothing selected > Statistics > Last import | main menu > File > Version history; Graph > chevron menu > Version history (the report is kept in its entry) | table > Nodes; Graph > Graphs |
| 2 | 1, cost | nothing | Does a bigger number on a transfer mean closer, or farther apart? | 2: a graph's direction and weight | RP > nothing selected > Statistics > Edges | Results > In this project > PageRank > [result editor] > Direction and Weight | table > Edges; Graph > Styles |
| 3 | 6, cost | nothing | Leave the small transfers out of everything you compute. | 2: filtering | left panel header > filter chip > Filter steps | table > Edges (a column header's Filter to) | Graph > Styles; main menu > File > Replace data... (reported: a cutoff at load) |
| 4 | 2, cost | nothing | Did your ranking treat the transfers as one-way? | 2: how a run read the edges | Results > In this project > PageRank > [result editor] > Direction and Weight; the same under Closeness | -- | RP > nothing selected > Statistics > Edges |
| 5 | 2, first-run | nothing | Find the accounts that sit between otherwise separate groups. | 3: run an algorithm | Results > all algorithms > Centrality; main menu > Algorithms > Centrality | -- | RP > nothing selected > Statistics; Graph > Sets and paths |
| 6 | 2 | nothing | Last week you ranked who matters most. Get back to it. | 2: centralities | Results > In this project > PageRank; Results > In this project > Closeness | -- | Graph > Views; Notes |
| 7 | 3, first-run | nothing | Split the network into groups. | 3: run an algorithm | Results > all algorithms > Community; main menu > Algorithms > Community | -- | Graph > Sets and paths; main menu > Selection > Create set |
| 8 | 3 | nothing | Last week you split the network into groups; make the groups coarser. | 2: community detection | Results > In this project > Louvain > Parameters | -- | table > Communities: Louvain; Results > all algorithms > Community |
| 9 | 4 | nothing | Look up the account named ACME-4471. | 2: search | Graph > Find | table > Nodes | main menu > Quick actions... (went to search does not apply: Find is the answer); Graph > Sets and paths |
| 10 | 4 | one account | What do you know about this account? | 2: details on demand | RP > one node selected > Attributes | table > Nodes | Notes |
| 11 | 4 | one account | Who is this account connected to? | 3: Select neighbors | RP > one node selected > actions on this node > Select neighbors; main menu > Selection > Select neighbors | RP > one node selected > Connections (the neighbor count, `output-homes.md` 4) | Results > all algorithms > Path |
| 12 | 5 | one account | Write down what you just found about this account. | 3: Add note | toolbar > Note; main menu > Selection > Add note | RP > one node selected > Notes; Notes | RP > one node selected > Attributes |
| 13 | 5 | one transfer (edge) | Record why you believe these two accounts are linked. | 3: Add note | toolbar > Note; main menu > Selection > Add note | RP > one edge selected > Notes; Notes | RP > one edge selected > Attributes |
| 14 | 5 | nothing | Read everything the team has written in this project this week. | 1: note | Notes | -- | Graph > Views; main menu > File > Version history |
| 15 | 6 | nothing | For now, work only with the largest connected piece, so the layout and the numbers ignore the rest. | 3: Filter to | left panel header > filter chip > Filter steps; main menu > Selection > Filter to | Results > In this project > Connected components | Graph > Graphs > context menu on a graph row > New graph from (reported: a separate graph); Graph > Styles |
| 16 | 7 | nothing | This drawing is a hairball; tidy it. | 2: layouts and their options | RP > nothing selected > Layout | -- | header > zoom and view menu; Graph > Styles |
| 17 | 7 | nothing | Some accounts did not move when you re-ran the layout. Why? | 1: pinned nodes | RP > nothing selected > Layout > pinned count | -- | RP > nothing selected > Statistics; Graph > filter chip |
| 18 | 8 | nothing | Make the dots bigger for accounts with more transfers. | 2: visual encoding | Graph > Styles; table > Nodes > [a column header] > Size by | Results > In this project > PageRank > [result editor] > Appearance | header > zoom and view menu |
| 19 | 9 | several accounts | Keep these accounts so you can come back to them. | 3: Create set | RP > several nodes selected > actions on the selection > Create set; main menu > Selection > Create set; Graph > Sets and paths | -- | Graph > Views; Notes |
| 20 | 9 | the Watchlist set | Why is this account in the watchlist? | 1: set, path | RP > one set selected > Rule | RP > one set selected > Created from | RP > one set selected > Members |
| 21 | 10 | nothing | Do these two rankings agree? | 3: Compare with... | Results > In this project > PageRank > Compare with...; the same under Closeness | table > Nodes (a column's Compare with..., the Scatter view) | Graph > Views |
| 22 | 11 | account A | How is account A connected to account B? | 3: Shortest path from... | toolbar > Path; RP > one node selected > actions on this node > Shortest path from...; Results > all algorithms > Path; main menu > Algorithms > Path | -- | Graph > Sets and paths; main menu > Selection |
| 23 | 12 | nothing | Do last week's analysis again on this week's export. | 3: Replace data...; Apply recipe... | main menu > File > Replace data... | main menu > Recipes > Apply recipe... (the reuse-as-recipe reading; each reading's share is reported) | main menu > File > Open... (reported: starts a new project); main menu > Recipes > Export recipe... |
| 24 | 12 | nothing | Apply the analysis your team shared with you as a file. | 3: Apply recipe... | main menu > Recipes > Apply recipe... | -- | main menu > File > Open... (reported: a new project with the recipe pending); main menu > File > Replace data... |
| 25 | load | nothing | Bring in this week's export as a second network beside this one. | 3: Add as another graph... | main menu > File > Add as another graph... | -- | main menu > File > Open... (reported: starts a new project); main menu > File > Add data...; main menu > File > Join... |
| 26 | export | nothing | Send the list of accounts with the most transfers to a colleague as a spreadsheet. | 3: Export table | table > Nodes > Export table | header > Export (the Export dialog lists the table) | Graph > chevron menu > Download project file |
| 27 | export | nothing | Share your color scheme with another team without sending your data. | 3: Export recipe..., Export style... | main menu > Recipes > Export style...; header > Export | -- | Graph > chevron menu > Download project file; RP > nothing selected > Export |
| 28 | recipe | nothing | Make this project open with your team's flow summary. | 2: overview recipe in force | RP > nothing selected > Statistics > Overview recipe; main menu > Recipes > Use as this project's overview... | -- | main menu > Preferences (reported: the reader's own default) |
| 29 | -- | nothing | Switch to the April transfers. | 1: graph | Graph > Graphs > April transfers | -- | Graph > Views |
| 30 | -- | nothing | Show only the columns that business accounts have. | 2: type summary (the type facet) | table > Nodes > Type | -- | table > Edges |
| 31 | verdict | one account | Mark this account as cleared. | 3: Add attribute... | RP > one node selected > Attributes; main menu > Selection > Add attribute... | -- | Notes; Graph > Sets and paths |
| 32 | edge | one transfer (edge) | Which two accounts does this transfer connect? | 2: details on demand | RP > one edge selected > Endpoints | table > Edges | RP > one edge selected > Attributes |
| 33 | transform | nothing | Put the March and April transfers together to see what they share. | 3: Combine graphs... | Graph > Graphs > context menu on a graph row > New graph from > Combine graphs... | -- | main menu > File > Add data... |
| 34 | set operation | the Watchlist and one other set, both rows focused | Which accounts are in both? | 3: Union, Intersect, Subtract, Exclude | Graph > Sets and paths > context menu on focused set rows > Intersect | -- | Graph > Find; main menu > Selection |
| 37 | 3 | one group | What makes this group different from the others? | 2: community profiling | RP > one group selected > Statistics; RP > one group selected > Attributes | table > Communities: Louvain | RP > one group selected > Members |
| 38 | 4, edge | one account | Show the transfers this account made. | 4: node to its incident edges | RP > one node selected > Connections | table > Edges | RP > one node selected > Attributes |
| 39 | raw data | a different account selected | The table shows only your selection; show every account again. | 4: a count and what it counts | table > [scope line] > Show filtered graph | -- | Graph > filter chip; table > Nodes |
| 35 | methods | nothing | Collect the settings you used, for the methods section of your report. | 2: methods text | main menu > File > Version history; Graph > chevron menu > Version history | Results > In this project > PageRank (its editor's record) | header > Export (reported: writes the text out) |
| 36 | score | nothing | Make one score that combines the three rankings. | 3: New column (computed columns, 2) | table > Nodes > [a column header] > New column | -- | Results > all algorithms > Centrality; RP > nothing selected > Statistics |
| 40 | -- | the Assistant button disabled | Connect the assistant to your AI provider. | 3: AI provider... | main menu > Preferences > AI provider... | -- | Assistant; main menu > Help |
| 41 | 1 | nothing | Use the flow summary your field prefers instead of the general one. | 3: Apply recipe..., Use as this project's overview... | RP > nothing selected > Statistics > Overview recipe > Replace > Flow overview | main menu > Recipes > Apply recipe... > Flow overview | Results > all algorithms > Flow |
| 42 | 2 | PageRank run | Read the ten accounts with the highest PageRank. | 1: result, run | Results > In this project > PageRank > [result editor] > Top nodes | table > Nodes | RP > nothing selected > Statistics |
| 43 | 11 | one found path | Keep the path the shortest-path search found. | 3: Create path | RP > one found path selected > actions on this found path > Create path | -- | Graph > Sets and paths |
| 44 | -- | nothing | Which keys do what? | 3: Shortcuts | main menu > Help > Shortcuts | help button > Shortcuts | main menu > Preferences |
| 45 | export | a filter step on | Hand over what you found about this investigation. | 2: findings report, the evidence file | Export dialog > Findings report | -- | Notes; main menu > File > Download project file |

Tasks 12 to 14 give Notes its rail score now; the "last week" first-click task confirms it later.

### Card sorts

**Catalog.** Cards: the element's 21 algorithms, the tail capabilities in `top-tasks.md` that are
algorithms (link prediction, motifs, null-model tests, bridges), and four anomaly cards in analyst
words from the anomaly and threat-hunting workflows ("accounts far above their peers on
transfers", "a host talking to far more peers than usual", "find the accounts that do not fit",
"a sudden change in who talks to whom"), so a "does not fit" pile can form. An open sort, then a
hybrid sort closed on the six families with a "does not fit" pile. A card placed in its family by
fewer than 60% gets an alias; an unplaceable pile becomes a family proposal. **Every result is
filed as a graphty-element need** (catalog aliases, display labels or a new family), never as an app
regrouping, because the families are the element's (`information-architecture.md` 12). Family
headings against question headings is the one first-click study of the Catalog, run with
participants apart from the card sort, because sorting teaches the families.

**Layouts.** It informs one decision: whether the Layout row's method list shows the element's
family headings (force, geometric, hierarchical, special) or one alphabetical list. The 12 layouts
are sorted open; if fewer than 60% of participants form groups matching the families, the list is
alphabetical.

### First-click scoring

Pass: 80% of first clicks on a correct place, 90% for cost-of-error tasks. Comparisons of two
designs run between subjects. Graph size is tested here: on a large project, a first click in any
task that needs a node goes to Find or the table. A task that "waits" leaves the tally until the
element supplies it (`element-contract.md` 13).

**Sample size.** If a first-click task passes only when the lower bound of its 95% interval
(adjusted Wald) reaches 80%, 15 participants per group can never pass, 20 need 20 of 20, and 40 to
50 per group need 92 to 95%. First-click tasks with separately reported groups (the count rule and
the modifier tasks of `research/study-schedule.md`, "Interaction-pattern studies") are therefore judged by the tree-test rule
above: pass, fail or undecided on the interval, then 50 more attempts once. Otherwise the likely
answer is "undecided" (Sauro and Lewis, MeasuringU). A correct first click predicted task success
87% of the time against 46% after a wrong one (Bailey and Wolfson), which is why these tests
decide.

**Modifier tasks** (`research/study-schedule.md`, "Interaction-pattern studies") are not first-click tests: first-click testing
measures where the first click lands, not which modifier a person expects. Each task asks for a
selection change (add one, remove one, add a range) and counts modifier errors per participant,
reported per prior-tool group.

### Interaction-pattern studies

Each claim `interaction-patterns.md` makes, and the observation that tests it; the bars follow.

| Claim | Test |
|---|---|
| the behavior map agrees with the model (a lint, not design validation) | the structure check (README, "Validation"): section 2's Delete, Reorder and Edit cells against `conceptual-model.md` 7.1 |
| entries fit the tasks | cognitive walkthrough of each top task; a heuristic evaluation of every entry against Nielsen's ten heuristics by three or more evaluators working separately, findings merged by severity; it fails on any unresolved finding rated major or worse |
| the canvas walk works for screen-reader users | moderated study with five or more screen-reader users (NVDA, JAWS and VoiceOver among them) on a bare embed: enter the walk, go out two hops, go back, go home, add two nodes with Space, step through the selection with the member-walk keys, press Delete on a node outside the selection, focus several list rows and say which are "selected", leave with Tab; it fails when a participant gets lost, cannot find the exit, loses the selection, expects Delete to remove the focused node, or confuses focused rows with the canvas selection; its result decides the member-walk keys and the spoken "selected" (`interaction-pattern-entries.md` 9.1, 9.2) |
| several focused rows read as distinct from a selection | first-click task: "show me both of these sets" with two set rows in view; it fails when readers expect Shift+click on the rows to ring both on the canvas and do not find Select members |
| element-owned patterns work without the app | bare-embed conformance: selection, Enter and Shift+Enter, the canvas walk, the element's Esc rungs, tool keys, undo labels, drag transactions |
| keyboard and screen reader | an audit against WCAG 2.1.2, 2.1.4, 2.5.7 and 4.1.3 on a bare embed, with a script: a set selected, canvas focused, no arrow pressed, Enter (expects the members); then an arrow and Enter (expects the focused node); click a node, Esc once (expects deselect); tab into a canvas holding a selection, then Tab until focus leaves (expects it to leave without Esc); in a walk, Tab past the last member (expects focus to leave the canvas); type into an option field inside a popover, Esc (expects the old value, popover still open), Esc again (expects the popover closed, nothing run); arrows in an item tab (expects each finding selected and brought into view); walk two hops away from a three-node selection (expects the inspector unchanged), Space (expects the focused node added), Delete (expects the selection removed, with its notice); focus a style-layer row with three nodes selected, Delete (expects the layer deleted and the nodes kept); Esc on a heading after an inspector field (expects nothing removed); during playback, Esc with the time slider focused (expects a pause at the current window, one step); arrows on the canvas, then in a list, then on the canvas, counting presses that surprise; every edge of the canvas-focus chart (`../interaction-patterns.md` 3.8) walked once |
| a count selects rather than routes | first-click test (`interaction-pattern-entries.md` 4.3), dock closed for every participant |
| the inspector follows the selection | first-click test: with three nodes selected, change a result's option; it fails when readers expect the result to replace the inspector, or lose the three nodes |
| the glyph for turning a filter step off | covered by eye versus checkbox, below |
| the three Shift scopes and Mod+click | a modifier task that counts modifier errors on the canvas, in a list and on a legend, reported per prior-tool group (Figma, Gephi, Cytoscape); Gephi selects by tool, not modifier, so it is the real test of the canvas rule |
| eye versus checkbox | two first-click tasks: "hide this coloring but keep it" and "try the graph without this filter" |
| Esc on long-lived surfaces | Esc presses before Done is activated, against the bar in `research/study-schedule.md` |
| Previous selection is found | walkthrough, then the moderated task (`interaction-pattern-entries.md` 4.4) |
| the cancel label is read before pressing | moderated test with a run in flight |
| instant zoom to selection keeps a 3D reader oriented | task test in 3D: follow a node's connections outward after zoom to selection, instant against a 300 ms eased move; ease only if orientation errors differ |
| the live and background lines | calibration of `session.estimate` with estimate rows for runs of 10, 30, 60 and 120 s, including grid, star and path shapes, in an opt-in lane of graphty-element's cost test (filed against the element) |
| hiding is read as paint | first-click task: hide 40 nodes, then read the node count; it fails when fewer than four of five say "unchanged" |
| Show all on the not-drawn line | first-click task: "show the hidden nodes again"; it fails when readers look for a filter step or a style layer (the unhide row below) |
| a single Catalog click | first-click task: "find out what betweenness measures"; it fails when readers click the row body and start a run they did not want |
| a search leaving the filtered graph | the teach-back's task 4 ("Model teach-back", below), in its two groups |
| pointer habits | one pilot question on whether the wheel should zoom or pan, reported by prior tool |
| every way to make part of the graph go away | one task-based study on one subgraph with five goals, each followed by "what does the node count say now?": drop low-confidence edges for every number; hide these 40 but keep counting them; show only type X; delete bad rows; fold a community. Each first move is scored against the consequence it implies (Filter out, Hide on canvas, Filter to, Remove, Collapse, and the eye). It runs, with the read-back, before slice 6 (filters) is designed and feeds it; it gates no slice |
| a double Esc never loses a selection | keystroke task, Figma users and others separately: a 2-hop selection, a color picker opened by pointer and by keyboard, then Esc, Esc, Delete; count lost selections, unintended Removes and unaided recovery through Previous selection |
| where the style stack lives | the one row for this question: "Where the style stack lives", in the first-click tasks below, under the rule of `information-architecture.md` 11 |
| a table narrowing that changes no count | first-click task: "narrow the table to type X without changing any number"; a view-only filter field is added only if participants fail it with Filter to |

### Interaction-pattern bars

The section above names each study's failure observation; the bars are here.

- **First-click tasks** (a count selects what it stands for; eye against checkbox; the stale
  editor) use the first-click bar above.
- **Esc on long-lived surfaces** (version history, the comparison surface): Esc presses before
  Done is activated, median 2 or fewer and nobody over 4.
- **Keyboard audit script**: every scripted press produces the expected result on a bare embed; one
  surprise is a failure of that cell of the key dispatch table (`interaction-patterns.md` 3.6).
- **Moderated tasks** (Previous selection, the cancel label, triage by arrows): judged on the
  failure observation alone, with at least five participants, because each asks whether a named
  failure happens at all, not how often.

### Consistency check (`information-architecture.md` 12)

The widened check is `research/scripts/check-structure.mjs`, run by `check-framework.mjs`, which
writes the result to `research/last-check.txt`; no study starts until it passes. The earlier,
narrower findings of 2026-09-27:

- **Key against outline:** every correct node, accepted route and distractor of the 36 tasks then in the key is a
  node of the outline (checked by script, wrapped lines joined).
- **Register against outline:** every starting place in `output-homes.md` 3 is an outline node,
  except those on type rows, overflows and context menus the outline does not show (Copy as PNG, a
  Statistics section's Export table, a result editor's Run, the empty canvas's context menu, a
  found path's type row, a set's and a set collection's context menu, Remove, Add note in an
  overflow or the graph's name-row menu, a drop). Those are first-click tasks.
- **Glossary:** every unbracketed label is a preferred term, or the plural of one used as a section
  heading (Style layers, Attributes), once the rows for Endpoints; Rename, Duplicate, Close; and
  Show arrows, Minimap, Note markers were added. Seeded names (March transfers, April transfers,
  Watchlist, Context, Findings, Closeness, PageRank, Louvain) are data.

### First-click tasks, later

| Task | Status |
|---|---|
| Why is this node orange? (painted value to its layer) | testable once wireframes exist |
| Your lab's colors are on, then you looked for groups; why did nothing recolour? | waits: the withheld-suggestion outcome |
| Where is TP53? (large project) | waits: search over graph content |
| The first panel on a fresh project | testable |
| Run Louvain among 30 or more results, palette hidden | testable |
| Reopen the betweenness you ran three runs ago, on a seeded list of 30 or more results | testable |
| What did you conclude last week? | waits: the notes collection; confirms tasks 12 to 14 |
| Did this account's activity start suddenly? (one element's values across windows) | waits: the series needs in `element-contract.md` 13 |
| A group's inspector; a set collection's context menu (Bipartite projection...); a set's context menu (the set operations) | testable |
| Layout, from `interface-specification.md` 9: the editor for "make this node red" on a node painted by a large layer; color above or below Attributes at the one-node cell; the type row's two lines against one line with two verbs; the filter chip under the project name; the view mode as a flyout; the Results panel holding results and the catalog; the bottom dock past the drawing limit; an editor opened from the palette in the inspector position; the comparison cells; the one-node inspector at a short window against the Attributes cap | testable on Storybook compositions |
| You just loaded your first file; what would you try next? | testable |
| If this supplier shut down tomorrow, who would be cut off? | waits: the "without" scope |
| Where did this connection come from? (two files added) | waits: the source attribute |
| The inspector of one group | testable |
| One task per relationship in `output-homes.md` 4 | per its element need |
| Every command's starting places in `output-homes.md` 3 | testable |
| Catalog family headings against question headings, two wireframes, between subjects (the one Catalog first-click study) | testable |
| A filter step's control, Figma-trained against Gephi-trained, between subjects | testable |
| Label this cluster in the figure | testable |
| Go back to where you were two hops ago | testable |
| How many rows were rejected? (after the load notice has gone) | testable |
| Tidy this graph, nothing selected | testable |
| Where would you re-run this algorithm? (a result in the Results list; three wireframes between subjects: Re-run on the result's row, in the result editor's Run row, and in the result's overflow menu). A first-click comparison, not a tree test: the outline holds none of the three places | testable once wireframes exist |
| Layout tasks of `interface-specification.md` 9, one per departure it draws: make this node red (a node painted by a large layer); color above or below Attributes; the type row's two lines against one line with two verbs, between subjects; leave the small transfers out of everything (the filter chip under the project name); switch to 3D (the view mode as a flyout); run an algorithm you have not run (Results holding results and the catalog); find one account past the drawing limit (the dock as the working surface); an editor opened from the palette, where is it; the comparison cells; the one-node inspector at a short window | testable on Storybook compositions of real components; scored by "First-click scoring" above |

### Decisions the studies can reverse

Each is a two-way door decided now, judged by the bars above.

| Decision taken | What settles it | If it fails |
|---|---|---|
| Results: needs-action strip, partitions band, then latest run | the "reopen the betweenness" first-click task | order by name inside the latest-run band |
| The catalog is findable below a long Results list | the "run Louvain" first-click task | a fixed entry to the catalog under the Results field |
| Catalog family headings, with a Family filter present | the one Catalog first-click study | question headings, filed as element display labels |
| The style stack in the left panel's Styles list | "Where the style stack lives", below | the stack in the nothing-selected inspector, only on a clear difference at 50 or more per arm (`information-architecture.md` 11) |
| No view-only row filter on the table | the table-narrowing task | a view-only filter field in the table header |
| Esc returns focus to the trigger, so a double Esc never deselects | the double-Esc keystroke task | Figma's behavior, and principle 0's not-copied item 2 removed |
| Notes on the rail, newest first with a target filter | the "last week" first-click task | Notes reached from the Note tool and Find, with no rail button |
| The rail opens on Graph | the fresh-project first-click task | open on Results for a project with no kept objects |
| A withheld suggestion gets its own route | the recolour first-click task | the line on the run alone |
| Run layout sits on the Layout row | the "tidy this graph" first-click task | Run layout on the graph's type row |
| The import report is reached from Last import | the "rows rejected" first-click task | a mark row per rejected-row count beside Last import |
| The Path tool has a toolbar slot | count, over the investigation workflows, how often the first endpoint is not already selected | drop it; Shortest path from a node arms the same bar |
| The table opens on demand | measure how long it is open over "Hub Gene Identification and Ranking" | the dock opens on the first run |
| A new rail place (`information-architecture.md` 10, question 6) | a fresh tree test of the whole rail | no rail place |
| The Layout row's methods under family headings | the layout card sort | one alphabetical list |
| Open always starts a new project | tasks 23 to 25: the share of reported answers on Open | Open offers the load step's choices when a project is open |

## Studies alongside the framework revision

These run while the framework is being revised. None gates a document or a build slice: a result
changes the document it tests when it lands. Participants follow the pools below; the first-click
and card-sort people have taken no tree test.

| Study | People | Material and tasks | Settles | Rule |
|---|---|---|---|---|
| Single-rater ranking of the top tasks | the owner, one sitting | the vote's longlist in users' words, ranked and a top five picked, without the current ranking in view | the fallback `top-tasks.md` names until the vote runs | labeled single-rater; a task the owner places more than two ranks from `top-tasks.md` is listed for the vote, not re-ranked; the vote replaces it |
| Paper tree-test pilot, nouns only | 5, pool C, moderated, thinking aloud | the outline of `information-architecture.md` 4.1 with every command leaf removed, so only places and objects remain; the noun tasks above plus four: "Turn the filter step you switched off last week back on" (Filter steps, now a place; distractor: Style layers); "Bring in your lab's list of gene sets, each as a set" (Sets and paths > Load set collection..., or File); "Put the April transfers above the March ones" (Graphs, the row's Move up and Move down); "Keep the path the shortest-path run found" (no key until the seed holds a path result). Bringing hidden nodes back is a first-click task, because its home is on the canvas, which a tree test strips | wording that gives an answer away; where people look for the three places the outline lacks | not scored against the bars; a task with no key records the first place each person tries, and that place is proposed for the outline and the register |
| Model teach-back | 5 analysts: two weekly, two daily investigators, one occasional | "Model teach-back", below: each does a task on a paper prototype, then explains what happened and predicts the next outcome; nothing is read aloud first | the model's names, the concept budget (`conceptual-model.md`, "The model in brief"), the explicit keep, the inspector fold and door 25 | four of five predict each outcome; a miss changes the model or its names; the fold reverts if two of five describe a group as something other than a set |
| First-click: the Look icon | 20, grayscale wireframe of the graph's inspector | "Switch this project to its print look" | whether the icon on the property section's header is found | **60% bar**, lower than the schedule's 80% because a header icon is Figma's own form and the fallback costs a menu row; under 60%, Look becomes a labeled row |
| First-click: unhide, pointer and keyboard arms | 20, plus 10 keyboard-only | "Show the hidden nodes again", after 40 nodes were hidden, in the app and on a bare embed | the not-drawn line's hidden count with Show all, or main menu > Selection > Show on canvas | the 80% bar; under it, a hidden-count row in the graph's Statistics, never the filter chip, which answers what the numbers are computed on |
| First-click: toolbar and dialogs | 20 | one task per toolbar control (Select, Lasso, Hand, Path, Note, Quick actions, view mode) and one per dialog's primary action (load step, binding step, Export) | the toolbar's five slots and the dialogs' button labels | the 80% bar per task |
| First-click: one task per front door | 20 | one task per front door of `information-architecture.md` 6 (data, a list of ids, a recipe, recipe and data together, among them) | each door's first place | the 80% bar per door |
| **Where the style stack lives** (decision study; the one row for this question) | 50 or more per arm between subjects, plus a keyboard-only arm of 10; below 50 per arm it is a pilot and reports direction only | grayscale prototypes at 1366 by 768 with 5 sets, 3 paths and 19 layers and one node selected, of (a) the left panel's Styles list, the build default, and (b) the stack in the nothing-selected inspector; tasks: "12 hubs are selected in the table; move the community colors under the degree sizes", "switch off the layer painting this node", "which layer makes the hubs red", "turn off every run layer", "after eight runs, move your own community-color layer above the degree layer"; the keyboard arm counts presses to the target layer | where the stack lives (`information-architecture.md` 11) | the rule written there before any data: (b) replaces (a) only on a clear difference in success at the powered size; a result without one keeps (a) and records the question as open |
| First-click: stale rows after the selection empties | 20; plus a screen-reader item | "You clicked the canvas; act on the rows you were reading", then "which rows are selected?" | whether readers tell the previous selection's rows from a live selection (`interaction-patterns.md` 3.1) | the 80% bar; under it, the rows empty and the scope line offers Previous selection |
| First-click: a note's routes to what it is about | 20 | "open the note on the PageRank threshold, then go to what it is about"; "open the note about this graph" | the routes of `output-homes.md` 4 for a note on a definition and on the graph | the 80% bar per route |
| Shape discrimination at the node screen-size boundary | 12, in 2D and in 3D | name each node's shape from a key card, at the boundary of `element-needs.md`'s readability-level row, for every shape the Other cap uses | whether the mesh shapes stay distinct in the flat 2D view (`element-needs.md`, "capacity on categorical mesh channels") | a shape named correctly by fewer than 90% leaves the 2D capacity |
| Screen reader: what is selected | 8 screen-reader users | a row selection of three sets while one node is selected on the canvas: "what is selected?" | whether "on canvas" tells the canvas selection from a row selection (`interaction-pattern-entries.md` 9.1) | 7 of 8 correct; under it, the row selection takes its own announcement word |
| First-click: zoom with a mouse and with a trackpad | 20 each, counted separately | "zoom in on this cluster" on the Figma map (plain wheel pans, Ctrl or Mod wheel zooms) | whether the Scroll wheel zooms preference must be surfaced in the zoom menu too | the 80% bar per group; under it for mouse users, the preference also appears in the zoom menu |
| Hide others versus Narrow the graph past the drawing limit | 8 fraud-persona analysts | "draw this account's neighborhood while keeping every score", then "what did the node count do?" | whether readers predict that Hide others keeps every number and Narrow the graph... changes them (`state-matrix.md` 4.2) | 7 of 8 predict both; under it the labels change, never the routes |
| First-click and comprehension: Filter to on one node | 10 | "What will Filter to do here?" on a one-node type row, then the click | whether Filter to or Filter to neighbors is the one-node default | under 80% predicting "narrows every number to this node", Filter to neighbors takes the slot |
| Hybrid card sort of the main-menu commands | 15 or more, 20 to 30 preferred | every main-menu command, closed on Figma's slots (File, Edit, View, Selection, Algorithms, Recipes, Preferences, Help) with room for new groups | `information-architecture.md` 10, question 1 | a command placed in its slot by fewer than 60% moves to the majority's slot; a new group formed by half or more is proposed as a slot |
| Comprehension of state words and marks | 8 to 12 | each state word and mark of `glossary.md` 10 on a grayscale row, asked "what does this tell you about the value?", then pairs shown together, "what is the difference?" | which words and marks stay distinct | **80% merge bar**: a pair told apart by fewer than 80% merges into one word; a single word or mark explained by fewer than 80% is relabeled |

**Desk recount behind the 19-layer study, a record.** At 1366 by 768 the inspector placement
left no layer row visible at rest without scrolling (the property section and Statistics end at
520 of about 560 px), which is one of the reasons the stack moved to the left panel
(`information-architecture.md` 11). The left panel's own recount, four style rows and about five
set rows at rest, is `state-matrix.md` 8, the Laptop cell.

### Model teach-back

Task-first: each participant does the task on a paper prototype, then says what happened and
predicts the next outcome; the model's brief is never read aloud, so it tests the model their doing
formed, not recall of a lecture. Tasks and expected answers:

1. **"Filter to a component, then lay it out."** Only the component moves, and the removed nodes
   do not affect where it goes, for a simulation layout (`conceptual-model.md` 4.4).
2. **"Apply a colleague's recipe to my data."** Their definitions bind to my attributes, the weight
   is confirmed, anything unbound is off and listed; no data, positions or fixed sets arrive.
3. **"Select neighbors, then undo."** Undo reverses the last project change, not the selection;
   Previous selection restores it.
4. **"Filter to this node's neighbors, then find a path to a node outside them: can it leave the
   boundary?"** Asked twice, in two groups: under the one-kind model (the search offers Full graph
   before it runs, and marks where the path leaves) and under the two-kind model (the step made by
   Filter to is one searches may cross). The model whose group predicts correctly more
   often decides door 25.
5. **"Hide these 40 nodes. What does the node count say now? Now lay out: do they still push the
   others?"** The count is unchanged and they still take part: hiding changes only what is drawn.
6. **"Make Community 3 stand out; where did the set in the list come from?"** From the explicit
   keep the analyst pressed (`conceptual-model.md` 4.1). If two of five expected the color to just take and found the
   keep obstructive, the keep rule is revisited.

## Flows and journeys studies

These test `user-journeys.md` and `task-flows.md`. Each row names what it settles and the rule
fixed before it runs. What published sources already say is given with each, as a prior the study
must confirm or overturn, never as a substitute for it.

### Participant pools

Studies share people, and several teach what another measures, so the pools are kept apart:

| Pool | Takes | Kept out of |
|---|---|---|
| A: interviews | the investigator and lead interviews | nothing; interviews teach no labels |
| B: walkthrough reviewers | the walkthroughs of flows 3, 6.1, 6.2, 8, 8.2 and the trust-check walkthrough | the tree-test pilot and the tree test, because a walkthrough shows the outline's labels in place |
| C: tree-test pilot | 5 to 8 people, moderated, thinking aloud | the quantitative tree test and every first-click test |
| D: fork-label arms | the split first-click test, one arm each | the task study "every way to make part of the graph go away" above, whose five goals teach the consequence words |
| E: "open account X" | the first-click test at both scale classes | pool D, because both start from a type-X or account-X instruction |

### Interviews

| Study | People | Questions | Settles | Rule |
|---|---|---|---|---|
| Investigators | 5 to 8 fraud, AML or threat investigators | "Where did your last case's first node come from?"; "How did the seed reach you?"; then `user-journeys.md` section 5's questions for journey 3 | whether journey 3 opens by an id or by Find, and whether the investigation stays its own journey | **opens by id** if 5 of 8 receive the seed as an identifier carried by an alert, a ticket or a case system (then the entry is a pasted or linked id, and a link that opens the project on that node is a one-way door to record); **opens by Find** if most search by name or attribute; the journey stays its own if 5 of 8 start from an entity, per section 5 |
| Recipe leads | 3 to 5 lab or community leads who share analyses, and at least one person who received one | "When did you last hand someone your analysis without your data? How did it travel, and how long before they used it?" | whether "A starting point travels" stays a fourth journey | `user-journeys.md` section 5's fold-back rule, unchanged: fold it into journeys 1 and 2 if leads share only on request or recipients apply weeks later |

### Diary study

| Study | People | Entries | Settles | Rule |
|---|---|---|---|---|
| Weekly return and travelling starting point, four weeks | 5 to 8 analysts with a recurring export, and the recipe leads' recipients above; pool A | one short entry per return or per recipe received: what they opened, what had changed, what they redid; the weekly-return interview is then held over the participant's own last project file | the between-session rows of `user-journeys.md` journeys 2 and 4, which interviews recall unreliably | a between-session row no diary shows is deleted; a redo that recurs in most diaries is a gap against `top-tasks.md` |

**Prior for the investigators.** Practitioner accounts of anti-money-laundering work put the start
at an alert raised by transaction monitoring, due diligence, a third-party report or a law
enforcement request, triaged in a case-management system before any graph is opened (Lucinity;
Quantexa). The alert carries the customer or account, so the seed arrives as an identifier, not as
something the investigator finds by browsing. Threat hunts differ: they start from a hypothesis,
an indicator of compromise or an analytics score (Red Canary; Wikipedia, "Cyber threat hunting"),
which matches journey 3's rule-first variant rather than its entity-first main line. The prior
predicts "opens by id" for fraud and a many-member rule set for hunts; the interviews decide.

**Prior for the leads.** At community scale, sharing a starting point without data is routine:
nf-core publishes peer-reviewed pipelines "used across all institutions" (Ewels et al., 2020), and
the Galaxy Intergalactic Workflow Commission reviews, tests and installs shared workflows on the
public servers. Neither says how a single lab hands an analysis from a lead to a member, which is
the case journey 4 draws, so the prior does not settle it.

### First-click tests

| Study | Arms | Participants | Settles | Rule |
|---|---|---|---|---|
| Fork labels (`task-flows.md` 12) | the router's exits labeled by consequence, against labeled by tool (Filter to, Hide on canvas, Style layers), between subjects, on "just the type X nodes, then lay them out" | **93 per arm, 186 in all** | the labels of flow 4's exits | consequence labels if their correct-first-click share is higher and the two-sided difference test at 0.05 rejects equality; otherwise tool labels |
| "Open account X" | a small project (below the drawing limit, nodes drawn) against a large one (above it), between subjects | 40 to 50 per arm | whether small-graph users click the canvas first, which justifies flow 6 having a desk count for each | keep both counts if the canvas takes 50% or more of first clicks on the small project; otherwise flow 6 keeps only the Find count and the size branch is dropped from its diagram |

**Why 93.** Two independent proportions, two-sided alpha 0.05 and power 0.80 need 93 per arm to
detect a 20-point difference between 50% and 70% (or 30% and 50%); between 40% and 60%, the
worst case, they need 97; between 60% and 80%, 82 (normal approximation, Fleiss; the same
calculation as MeasuringU's). 93 assumes the tool-labeled arm lands near 50%. The earlier wording
"wins by 20 points or more" is replaced by the test above, because with a true gap of exactly 20
points an observed gap of 20 or more appears only about half the time. **If 186 cannot be
recruited**, the test runs as qualitative, at 13 per arm with think-aloud, is reported as such,
and decides nothing on its own: the tool labels stay until a powered run.

**Why 40 to 50 for "open account X".** It compares a share against a fixed 50% line, not two
designs, so the first-click interval rule above applies: at 45 per arm the 95% interval is about
14 points either side, enough to tell 70% from 50%.

### Walkthroughs

Cognitive walkthroughs (Wharton, Rieman, Lewis and Polson) by pool B, on a prototype or grayscale
wireframes, each with a scripted question and a counted observation.

| Study | Material | Count | Settles | Rule |
|---|---|---|---|---|
| Flow 8, fraud recipe | the fraud recipe applied to a transfers file whose amount column has no declared weight role; the binding step offers the roles of `graph-conventions.md` (distance, similarity, capacity) and the proposed label "not a path weight", which no framework document yet uses | how many evaluators pick "distance" for the money column, and whether each can say what "not a path weight" means | whether "not a path weight" is needed and understood | needed if any evaluator picks distance for money (a larger transfer is a stronger tie or a larger flow, never a longer distance); understood if 4 of 5 explain it in their own words; if needed but not understood, relabel and rerun |
| Flow 8.2, three evaluators | two data versions a week apart, with three planted changed numbers (one community grown, two scores moved) among unchanged ones | how many planted changes each evaluator names, unaided, within 3 minutes of "which numbers changed since last week?" | whether a changed number must be marked or only findable | **marked** if any evaluator misses a planted change on the unmarked build |
| Trust checks | flows 4.1 and 6.1 (filter, rank) with the trust checks shown, against the same flows without them, between evaluators, on planted data (a ranking computed on a filtered scope; a filter that removed a hub) | insight accuracy (`task-flows.md` 12, point 3), time on task and a count of unprompted remarks about clutter | whether trust checks help or clutter | keep them if accuracy is higher with them; remove one that raises time without raising accuracy; clutter remarks alone remove nothing |
| Heuristic evaluation of each template card (`interface-templates.md`) | Storybook compositions of real components; three evaluators; Nielsen's ten heuristics and WCAG 2.2 AA | findings per card, rated 0 to 4 for severity | which cards are fit to test with analysts | a finding of severity 3 or 4 is fixed before the card's first-click task runs |
| Flows 6.1, 6.2 and 3 | run alongside the tree-test pilot, with different people | the four walkthrough questions per step | where the most-repeated routes stall | a step failing "will the analyst know this is the right action?" for 2 of 5 evaluators is redesigned |

**Prior for 8.2.** Viewers comparing two time-sliced views of a document collection failed to see
even very major changes unaided (Nowell, Hetzler and Tanasse, 2001, change blindness in
information visualization); the prior favors marking. Three evaluators can show a miss, not prove
there is none, which is why one miss decides.

### Findability of the flows and journeys

Tests the README's row for flows and journeys, and the header of `task-flows.md`, as routing aids: can a reader with a real task find the flow or
journey stage that serves it? Planned, not run.

| Study | People | Tasks | Settles | Rule |
|---|---|---|---|---|
| Reader findability | 6 to 8 people who have not read the framework documents, kept apart from pools B and C because both show the outline | about ten task sentences, at least one from each of six personas' workflows, for example "move on to the next alert in the same sitting", "reopen last week's project and see what changed", "compare disease against control", "put the lab's overlay on my gene list", "which keys do this without a mouse?"; each reader starts from `README.md` or `flows-and-journeys.md` and names the document and section they would open | whether "Where to look" and the two documents' headings route readers to the right place | passes if 80% of answers land on the right document at the first try; a task that lands on `flows-and-journeys.md` when it belongs elsewhere is a defect of that page; a task more than a third of readers route wrongly gets a new "Where to look" row or a heading change, then the trial reruns on that task |

### Tree-test pilot

5 to 8 people from pool C, moderated, on the outline of `information-architecture.md` 4.1 and the
tasks above. It fixes task wording that gives the answer away or that participants misread, as
Nielsen Norman Group advises before a quantitative tree test. **The quantitative tree test is
held** until every wording fix the pilot finds is made and the consistency check above passes
again. The pilot's scores are not reported against the bars.

## Options and encodings

Bars are `options-and-encodings.md` 13's; this section owns method and material.

- **Channel card sort (closed).** Cards: every drawable style channel, named as the element names
  it, one card per end property for edges. Categories: the sections of `options-and-encodings.md`
  3. 15 to 20 participants from the analyst personas, at least one from a flow domain, Figma and
  Gephi or Cytoscape familiarity recorded. Measures placement agreement only; it does not order
  channels. Runs with the structure studies' card sorts, in a separate session.
- **Graph-literacy tasks.** Material: drawings of one seeded fixture graph encoded four ways
  (categorical color, ramp, size, width), each with its legend, plus one with more categories than
  the default palette holds and one whose legend carries a departure sentence. Questions per
  drawing: a value ("what is this node's degree, roughly?"), a rank ("which of these two is
  larger?") and a group ("are these two in the same group?"). Answer keys come from the fixture.
  Participants have not seen the product. Scored per encoding kind.
  A signed, skewed column (a log fold change) is drawn with its default scale by color, with the
  question "find a down-regulated element", and by size, with "does this drawing show which
  elements went down?".
- **Matched partition colors.** Two community runs of the same fixture (two resolutions) bound with
  colors matched by overlap, each with its legend note; "which community split?", answer key from
  the fixture. Same participants and session as the graph-literacy tasks.
- **Hub picking.** A heavy-tailed degree column from the fixture corpus, drawn under three sizings
  (binned square root, the default; unbinned square root; binned log), counterbalanced across
  participants; "which are the five largest hubs?", answer key from the fixture. Same participants
  and session as the graph-literacy tasks.
- **Expert review of the default scales.** The default-scale table applied to the sample graphs and
  the fixture corpus, including a count column that is zero for most elements (alerts per host);
  one or two network scientists judge each resulting default right, acceptable
  or wrong, from printed drawings with their legends.
- **Default or yours?** A form prefilled from a staged "last run", in the first-click sessions:
  "is this value the algorithm's default or one you chose?"
- **Three row returns.** In the first-click sessions, a style row edited away from a recipe's
  value; three prompts in counterbalanced order: "return this row to what the recipe set", "to the
  element's default", "let the layer below show". Scored as choosing Reset, Reset to default and
  Clear.
- **First-click and label tasks.** "Make the hubs bigger", "make the outlines red" from an empty
  layer, the pill check, and "bigger labels with a white background", on grayscale wireframes, 13
  per condition, Gephi users as their own condition.
- **"Why is this edge red?"** On a 30 to 40 layer stack, from the edge's Appearance row; time and
  success recorded.
- **Accessibility audit of the generated form.** An expert review against WCAG 2.2 A and AA
  (keyboard only, screen-reader names for the pill, scale glyph and swatches, caveats without
  hover, non-text contrast), with a screen reader on each platform the app supports.

## Visual language

Rows name a rule by its section: "A" and a number is `visual-language.md`; "canvas-drawing" and a
number is `canvas-drawing.md`.

This section owns the visual-language checks, their bars, method and material; `visual-language.md` owns the rules. Material is
the element's canvas-form fixtures (worst case, lone mark, 5,000-node fitted view) rendered in both
themes; participants come from the analyst pools above and have not seen the marks before.

- **Pointing** (canvas-drawing 1): the 5,000-node fixture at the fitted view, with the edge fade on; "touch a
  node", 10 trials per person at seeded locations; touches scored by distance to the nearest node.
- **Mark discrimination** (canvas-drawing 2, canvas-drawing 5, canvas-drawing 6): a key card of every canvas-drawing 6 form; each trial shows one node or
  edge, alone or in a stack, and asks which marks it carries; 30 trials in random order, 5 s each.
  Twelve people make it a rate; five make it a screen.
- **Pale-node findability** (canvas-drawing 4): a named node at the color-legibility boundary, with and without the
  fill edge in balanced order, 10 trials each, timed.
- **Identifier read-back** (A4), **legend first click** (canvas-drawing 8), **overlapping hulls** (canvas-drawing 12): five
  people each, run as screens in the first-click sessions.

### Visual-language rule checks

"Judged by" names who can fail the check. A screenshot is never judged by the image model, which
only transcribes what it sees. **People rows** give the task, the stimulus, the people and trials,
and a bar that can fail; the method and material are `research/study-schedule.md`, "Visual
language". A row with five people is a **screen**: it can send a design back, but it never freezes
a published value (band widths, the 1.5:1 edge-mass target, the ring cap); only a row of twelve or
more can.

| Rule | Check | Judged by | Status |
|---|---|---|---|
| Document | script fails on a hex outside `canvas-drawing.md`, on a canvas form named elsewhere but absent from canvas-drawing 6, on two canvas-drawing 6 rows sharing tone count, gap, dash and fill, and on a departure named here with no `figma-crosswalk.md` 4.3 row | script | to be written |
| A1, A2 | the color lint (the gate) with its accent allow-list; masked-canvas saturation audit; a story audit of accent uses | lint; person | to be written |
| A3 | stale, invalid, failed and zoom-to-read fixtures identifiable in grayscale and CVD simulation | script | to be written |
| A4 | tabular, identifier and mono roles in compact-mantine. Screen: 5 people each read back 20 confusable ids (0 and O, l, I and 1, IL1B) at the identifier role; fails on more than 1 misread in the 100 | test; people (screen) | to be filed |
| A5 | table story: alignment, no zebra, hover row under the pointer and linked; Tree and table stories: members of a selected set take `--cm-bg-selected-secondary`, and over the selection cap only the set row is selected | test | to be written |
| A6 | app-shell story, both themes: menu, tooltip on a menu item, toolbar and legend over a dense graph; the tooltip paints above the menu; contrast by script | script, person | to be written |
| A7 | every object-map type resolves one glyph from the element's export; strokes measure 1 CSS px at 12 and 16 px; the Tree story's slot order (style layer: chip, name, origin word; set: glyph, name, kind word, paint slot, count, with the slot empty and names aligned when unpainted) checked against the Figma layers and styles-list captures; set-kind modifier against the word alone, 20 people per variant, 10 rows each, fails under 80% correct without hover | test; people | planned, not run |
| A8 | the theme is built with `highContrast: true`; an axe run of the shell stories finds no AA failure | test | to be written |
| A9 to A11 | component tests: no transition outside figma-spec 2.8; chart stories; each control draws its value; a bound channel is a variable pill with a strip for a ramp | test | to be written |
| Whole screen | Chromatic snapshots of the shell stories and the element's canvas-form fixture in both themes, the regression gate once the owner approves them; two designers compare the shell with the Figma study screens side by side, filing each difference as a crosswalk row or a defect | Chromatic; owner; people | to be set up |
| canvas-drawing 1 | theme toggled, OS unchanged: canvas repaints; saved background survives; AR; gray contrast; the fade leaves a bound edge's color equal to its legend chit, never touches a marked edge, and writes nothing to the file or the undo history. Pointing: 12 people, 10 trials each, on the 5,000-node fixture at the fitted view, "touch a node"; fails under 90% of touches within one node radius of a node | test; people | to be written |
| canvas-drawing 2, canvas-drawing 5, canvas-drawing 6 | contrast script with the canvas-set order and `#1A1A1A`, every band, all shipped colors, both canvases, on the worst-case and lone-mark fixtures (data dash, glow, outline, fill edge, arrows, parallel pair, self-loop), including the focus gap, dash gaps, the open semicircle half, the hollow ring and a marked node at 2 px data size, on the light canvas first, in 2D, 3D and XR; over-cap selection; the keeping order at the cap; a focused node alone and selected at the node screen-size floor still shows focus; a keyboard walk along a highlighted path at the cap keeps each focused node's highlight ring. Discrimination: 12 people, 30 trials each (every canvas-drawing 6 form alone, then stacks), on one node and on the 5,000-node layout at the fitted view, naming the mark from a key card within 5 s; fails under 90% overall or under 80% on any one form | script; test; people | script exists; study planned, not run |
| canvas-drawing 3, canvas-drawing 11 | one grayscale fixture per level (four levels, constant, not a color), both canvases; the no-color looks, including a no-value swatch over two different paints drawn as "varies"; a categorical chip shows its largest categories first; three comparison states distinct by script | test | to be written |
| canvas-drawing 4 | `default-palette-quality.test.ts` on both canvases, in OKLab x100, ordinal palettes included; the fill edge drawn on every node of a layer that can paint a fill under 3:1, including an overflow group and a literal color on the dark canvas. Findability: 12 people, 10 trials each, find a named pale node at the color-legibility boundary, with and without the edge in balanced order; fails unless at least 90% are found within 10 s with the edge | test; people | fails (`decided-doors.md`, "The default palettes on a dark canvas", until the new ids ship); study not run |
| canvas-drawing 3 chip | every chip drawing rendered at 16 px in both themes, a contrast script over the chit edges; screen: 5 people, 7 layer rows, "which layer colors by type?"; fails on more than 1 miss. Until it passes a categorical chip shows at most three chits | script; people (screen) | not run |
| canvas-drawing 5 | highlight layers write only the highlight mark; no muted member ships | test | fails today |
| canvas-drawing 7 | one node's color on all four surfaces; a 3D pixel sampled against its swatch; chits only on color channels | test | blocked on the resolved-value need |
| canvas-drawing 8 | a story per encoding and object mark; the not-drawn line absent when everything is drawn; whole blocks fold behind "N more" past a third of the canvas height (`state-matrix.md` 7); card radius, padding and row pitch against the Figma floating-card capture; the legend in a raster export; the legend and not-drawn line drawn in-scene in the element's `xr` project. Screen: 5 people, 6 first-click tasks ("which entry explains this node's color?"); fails on any task fewer than 4 of 5 get right | test; people (screen) | not run |
| canvas-drawing 9 | label and halo contrast over every palette color on both canvases; transparent export on a dark page; hull labels survive culling that drops node labels | script; test | to be written |
| canvas-drawing 10, canvas-drawing 14 | browser test with reduced motion; 3D fixture: ring width constant in CSS px at two depths, occlusion, no fog; a highlighted path inside a 5,000-node 3D layout at the fitted view is reached by Zoom to and counted in the not-drawn line while hidden; a lit fill checked at its darkest and lightest pixel | test | to be written |
| canvas-drawing 12 | Screen: 5 people, overlapping-hull fixtures of 2 to 6 hulls, "which hulls contain this node?", 5 trials per count; the cap is the largest count every person gets right, provisional until a twelve-person run | people (screen) | not run |
| canvas-drawing 13 | dark-theme export of a highlighted path: transparent with three-band marks, readable on a white and a black page; opaque with the canvas order; at 1x and 4x pixel ratio, band, gap, halo and label widths in the same proportion to a node; no state marks; a key per mark | test | to be written |
| Text forms | a screen-reader pass reads each canvas-drawing 6 form's text form on the worst-case fixture | person | to be written |

### Visual-language open measurements

| Question | What settles it |
|---|---|
| Do a menu and the node tooltip over `#1E1E1E` read as separate, or must the canvas move to `#181818`? | the A6 story at each value, each person shown one canvas, asked where the menu ends (`research/color-checks.md` 5, 10) |
| What is Figma's default page fill for a new file in dark mode? | a capture added to `design/ui/figma/dark-theme/`; a difference from the chosen dark canvas becomes a `figma-crosswalk.md` 4.3 row, and never overrules the menu-separation measurement |
| Does the app pass its accent as a third band outside the neutral pair? | first-click study on blues and Okabe-Ito graphs, both canvases, compared within each person (`research/color-checks.md` 10) |
| Band widths, the ring cap, the gaps, `#1A1A1A` against black, in 2D, 3D, XR and passthrough | calibration in the element's `xr` project (`research/color-checks.md` 6, 10), then the canvas-drawing 2, canvas-drawing 5, canvas-drawing 6 discrimination row |
| The edge fade curve that meets 1.5:1 edge mass | the canvas-drawing 1 pointing row |
| A High contrast categorical palette and ramp for each canvas | the color-checks script, run per canvas at 3:1; if a canvas has no passing ramp, High contrast on it offers categorical palettes only and the legend says so |
| A diverging default whose midpoint clears 2:1 on both canvases and sits 15 from both grays | the color-checks script over candidates (`decided-doors.md`, "Decided, and not doors") |
| How many overlapping hulls stay readable | the canvas-drawing 12 row |
| The ordered-step floor (7.5 normal, 3 simulated) and how many steps each default ramp carries on each canvas | the color-checks script over the default ramps |
| Is a denser data table faster? | both row heights on each person in balanced order, scanning 5,000 rows; filed against compact-mantine only if 20% faster with no more errors (`research/color-checks.md` 10) |

Until calibration runs, the marks are recommended, not final.

## Sessions after each build slice

The build slices are `implementation-mapping.md` 9's. Sessions run on the deployed build (behind
the new-shell switch) after a slice merges, and their findings change the next slice; they never
gate the slice they test.

| Rule | Method |
|---|---|
| Who and how many | five think-aloud participants per slice (Nielsen, "Why You Only Need to Test with 5 Users"), one of them keyboard-only; slice 1 adds a screen-reader session |
| The task | the slice's done task (its Playwright task test, as a reader's goal) |
| Measures | the Single Ease Question after each task (Sauro, MeasuringU) |
| Between sessions | fixes made between sessions (RITE, Medlock et al., "The Rapid Iterative Test and Evaluation Method") |
| Out of scope | ranking top tasks, which the survey does |
| Questions carried | which links analysts share (door 34, slice 1 onward); the found-path and group task (the six inspector kinds of `interface-specification.md` 4.0, slice 5) |

The tree test runs in parallel on paper (`information-architecture.md` 12).

## Counting method for word and target budgets

From the long form, section 13, for `content-design.md` and `interface-specification.md`: count
app words only; names, values and counts are data; standard terms count; each (i) visible at rest
counts one. Targets are everything that answers a click at rest: a button, a link, a swatch, a
chart, a number that routes; a control shown only on hover is not counted. Figma's resting
counterpart is measured from `design/ui/figma/right-sidebar-selection/dump-nothing-selected.txt`.

## Sources

- `design/ui/framework/document-architecture.md` 3
- `design/ui/framework/information-architecture.md` 4.1 and 12; `output-homes.md` 1 to 4;
  `research/archive/information-architecture-long-form.md` 13, 14
- Nielsen Norman Group, "Tree Testing" and "Card Sorting: How Many Users to Test", as cited in
  `information-architecture.md`
- Lucinity, "Demystifying the AML investigation process",
  https://lucinity.com/blog/demystifying-the-aml-investigation-process-a-complete-guide-to-anti-money-laundering-workflows-for-compliance-teams
- Quantexa, "AML investigations and case management",
  https://www.quantexa.com/resources/aml-investigations-and-case-management/ (search summary only)
- Red Canary, "What is threat hunting?", https://redcanary.com/cybersecurity-101/threats/what-is-threat-hunting/;
  Wikipedia, "Cyber threat hunting" (search summaries only)
- Ewels et al., "The nf-core framework for community-curated bioinformatics pipelines", Nature
  Biotechnology 38, 276-278 (2020), https://www.nature.com/articles/s41587-020-0439-x
- Galaxy Intergalactic Workflow Commission, https://github.com/galaxyproject/iwc
- Nowell, Hetzler and Tanasse, "Change blindness in information visualization: a case study",
  IEEE InfoVis 2001, https://www.pnnl.gov/publications/change-blindness-information-visualization-case-study-0
- Fleiss, two-proportion sample size (normal approximation), computed for this schedule; Sauro and
  Lewis, MeasuringU, as cited above
- Wharton, Rieman, Lewis and Polson (1994), as cited in `task-flows.md`
- Nielsen Norman Group, "Tree Testing" (pilot before a quantitative tree test),
  https://www.nngroup.com/articles/tree-testing/
