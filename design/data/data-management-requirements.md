# Data management requirements

Status: proposed, 2026-10-19. This document ranks what the graphty app and graphty-element must
do to get data into a graph and keep it in shape. It covers loading several sources (files, and
network sources such as databases and web APIs), combining them, setting column roles and types,
filtering, cleaning, and repeating the same steps on new data. It orders them by priority, says
where in the app each one appears and what reveals it, sets the order to build them in, and
records what a saved project file holds.

See [data-management-evidence.md](data-management-evidence.md) for every source, the full persona
and job tables, and the complete text of each requirement.

## The problem this answers

Loading one clean file already works end to end. A reader drops a file, the Data page shows a
preview, the guessed column roles and a load report, and one Enter draws the graph
(`design/ui/tier1-real-app/tier1-design.md`, lines 367-431). The weak part is everything after
that first load:

- A second file that shares node ids silently drops its attributes for every node already in the
  graph (`graphty-element/src/session/project/ingest.ts`, lines 565-571).
- There is no way to join a table of attributes onto nodes (issue #298 is open).
- A column's value type cannot be changed. One "N/A" in a numeric column makes the whole column
  text, and there is no date type (`graph-io/src/common/text.ts`, lines 1-13).
- Filters, saved sets, cleanup and "do last month's analysis on this month's file" have no
  surface, or only half of one.
- Network sources work in graphty-element but not in the app. The element connects to NDEx, Neo4j,
  Amazon Neptune and JSON web APIs, expands a node's neighborhood from the server, pages capped
  loads and keeps passwords out of saved files (`graph-io/src/sources/`). The app's "Open network
  data" dialog still says these sources are "on the way". The element marks this surface
  experimental.
- Six earlier designs disagree on tiers, defaults and verbs (evidence appendix, section D).

The architecture rules in the root `CLAUDE.md` decide who builds what. Matching, joining, type
inference, counting and replaying are graph functionality. They belong in graphty-element and
return neutral facts (counts and `{ code, params }`). The app decides only what to show, in what
order, and in which words. Each requirement below names its owner:

- **element**: graphty-element
- **app**: the graphty app
- **both**: the element computes and the app displays

## Who does what with data

These are the 12 design personas in `design/designloom/personas/` that use the app's data screens.
The four plugin-author personas build on graphty-element's API instead, so their needs are
graphty-element API requirements and are not ranked here. The evidence appendix, section C, has
the grid of jobs by persona.

The most common jobs are loading one file, filtering or hiding, exporting, finding or selecting by
a condition, and checking what loaded: each is done by 10 to 12 of the 12 personas. Joining a
table, repeating steps on new data, adding a second file, merging duplicates and comparing graphs
are done by fewer and block at most two: rare for most, essential for a few specialists. That is
the shape progressive disclosure is for.

For two personas the data is mostly not a file. The genomics researcher starts each session from a
gene list and pulls the network from STRING (`W20.yaml`, phase 1), and the knowledge engineer
queries a graph database of 10,000 to 10,000,000 nodes (`W13.yaml`, line 26). The fraud,
intelligence and security analysts were first counted here too, but none of their persona files or
workflows names a server they would load from (evidence appendix, section C, "Challenges").

## How the priority was decided

**What the scores are.** For each persona and data job, one reader coded from the persona and
workflow files how often the persona does the job (every session 4, often 3, sometimes 2, rarely 1)
and how much it matters (blocking 3, important 2, nice 1). A job's score is the sum over personas
of frequency times importance. A requirement takes the rank of the one job it mainly serves.

**What the scores are not.** The personas are simulated composites marked `validated: false`, not
measured users, and the coding is one reader's judgment. The design-studio results are simulated
sessions too: a failure there is strong evidence, a pass is weak. A gap of a few points between
two jobs means nothing. The first real evidence will be the top-task vote planned in
`design/ui/framework/top-tasks.md`.

**What was challenged.** Six reviews tried to break the first ranking:

- Four audits re-read every cell against its cited lines. They found misread citations, the
  plugin authors counted as app users, load-time jobs coded as more frequent than the loads they
  follow, and studio task set-ups cited as persona facts. Most corrections were accepted.
- A method review found that the published order did not follow the published scores.
- A studio review compared the ranking with what simulated readers did.
- A competitor review compared it with Gephi, Cytoscape, Kumu, Neo4j Bloom, Tableau, Power BI and
  Flourish.

The corrected scores were recomputed under five weightings: equal weights, the weekly analyst
weighted up, each persona's total say made equal, blocking jobs first, and an additive score. A
sixth, the largest single cell, ties too many jobs to decide anything, so it is shown only as a
check.

**How a tier is set.** The job's rank decides the tier: the first third of the 30 jobs is primary,
the middle third secondary, the rest advanced. A requirement that covers only part of its job sits
one tier lower. A requirement is marked **weight-sensitive** when its tier changes between
weightings, or its job's rank moves by more than 5. Only three rules move a requirement above its
score, and each placement names its rule:

- **cost of error**: getting it wrong silently changes the data or every later result. This
  follows `top-tasks.md`, lines 49-52.
- **lost work**: without it, work is lost.
- **the newcomer's safety net**: open a sample, which is already built.

Studio and competitor evidence breaks ties and moves a few named items. Within a tier, order is
the job's score.

The evidence appendix, section C, has the corrected grid, every weighting's ranks, and each
challenge, accepted or rejected with its reason.

## Ranked requirements

Each requirement gives its owner and whether it exists today on the `golden` branch, then a test
that decides whether it is done. Every primary test is also run by keyboard alone, and once on a
graph above the large-graph threshold.

**Order within a tier is priority, highest first.** A requirement's number is only its name: it
stays fixed so the evidence appendix and other documents can cite it, and it says nothing about
rank. "How the priority was decided" above gives the rule. The build order later in this document
can pull a requirement into an earlier slice than its tier when another requirement needs it.

### Prerequisites: build these first

**1. Every data operation is one element command** (element; partly). Load, mapping, join,
replace, type change, cleanup, filter, rename and edit are each one undo step and one journal
entry. Each can be called from the session API and from the AI harness, and each returns counts and
`{ code, params }`, never sentences. Today loads and node edits undo, but the journal is not saved
and the AI commands cannot load or join (`graphty-element/src/ai/commands/builtin.ts`, lines 6-12).
_Test:_ a Node script loads a CSV, joins a table and replaces the data in about 15 lines with no
internal concepts; each call adds exactly one undo step and one journal entry.

**2. The app uses the element's load APIs and deletes its copies** (app; no). The Data page still
keeps its own role list (`graphty/src/workspace/data-page/choices.ts`, lines 55-63) and has
workaround comments for issues #893, #894, #910, #911, #926, #927 and #930, all now closed. _Test:_
the app has no role list of its own and no comment citing those issues; the role menu equals the
element's `LOAD_ROLES`.

**3. One shape for "which elements"** (element; no). Style layers, filters, selections, saved
sets, algorithm scopes and export scopes all accept the same rule tree, and the element counts what
any rule tree matches. Today there are three shapes: `Selector`, `RuleTree` and query or scope.
_Test:_ the same rule tree given to a style layer, a filter, a selection and an export matches the
same elements, and the element returns the count.

### Primary: the first layer

"Weight-sensitive" marks a requirement whose tier or rank changes with how the personas are
weighted (see "How the priority was decided").

**4. Load a file by any door** (both; yes). Drop, file picker, paste or URL. Each door says the file
is read in this browser and not uploaded. _Test:_ one fixture loaded by all four doors gives the
same counts.

**5. A clean file is one Enter** (both; designed). When the element reports that no choice is
needed, every check is green and focus is on Load. _Test:_ a clean GraphML file and a two-column
CSV each draw after exactly one Enter; "no choice needed" is an element fact.

**12. One condition card: Select or Hide** (both; partly). The reader states conditions, which must
all hold, and chooses Select or Hide. The card shows "X of Y". Hiding never deletes data. A Filter
entry is always visible in the Data place, as in Gephi, Cytoscape, Tableau and Power BI. _Test:_
"score > 0.7" with Hide shows 140 of 900; with Select, 140 are selected and none hidden; an export
still holds 900.

**20. Export everything** (element; yes). Node and edge tables carry every computed and joined
column, and any loss the format causes is stated before writing. _Test:_ after a run and a join the
CSV holds both columns; exported from the table, the numbers come out as the Nodes table in a
spreadsheet format by default.

**11. Find by name or value** (app; yes; weight-sensitive). Typing a name or value selects the match
and brings it into view. _Test:_ an account number selects and centers that node; a condition typed
in the find box, such as "score > 0.7", offers that rule as a condition card.

**10. What loaded, in plain words** (app; element done). Node and edge counts, direction, the
number of separate groups and the largest, nodes with no links, and each attribute's type, percent
filled and whether it came from the file or from a run, all read from the element. _Test:_ an
export with 214 unlinked nodes reads "3 separate groups; 214 with no links"; the app counts nothing
itself.

**7. Column roles at load** (both; partly). Each column shows its guessed role, including time and
a node or edge kind, and the graph's direction. The reader can change any role, skip a column, flip
rows between nodes and edges, or set direction, each in one action. When every guess is confident,
one line states the mapping, and the per-column choices are one action away. _Test:_ for
`bait_prey.tsv` the guesses are bait=source, prey=target, confidence=weight, entity_type=kind, and
flipping rows twice restores the counts; a `name` column is guessed as the node name, and a count
column as the weight.

**9. The weight's role is visible and never blocks** (both; partly; placed by cost of error). The
weight line shows whether the number is a distance, a similarity, a capacity or unknown, with the
element's guess. The role is stored on the attribute and read by every later run. _Test:_ for edges
A-B 0.9, B-C 0.9, A-C 0.1, the shortest path A to C goes through B as a similarity and is direct as
a distance; with the role unknown the file still loads with one Enter.

**14. Join a table onto nodes** (element; no). "Add columns to nodes" suggests the key column. Before
committing it shows matched rows, table rows not in the graph, nodes that get no value, repeated
keys, how many more would match ignoring case and spaces, and the rule for clashing column names.
The table is saved as a source and the join as a recipe command naming the key columns (see "What a
project file records", item 9). No studio task has exercised it yet. _Test:_ a 340-row table joined
by symbol reports 318 matched, 22 not in the graph, TP53 matching 2 rows, and "19 more match
ignoring case [Use]".

**15. A node file and an edge file together** (both; yes; weight-sensitive). Both load as one
network in one visit, in either order. _Test:_ `suppliers.csv` and `ships_to.csv` in either order
give 120 nodes and 400 edges with supplier attributes.

**8. Load report shows only real problems** (both; partly; weight-sensitive; placed by cost of
error). Edges naming unknown nodes (Add / Leave out), repeated edges, repeated ids, decimal-comma
numbers, and refused rows each with a row number and a reason, plus "Skip these rows". A clean file
shows none of these lines. _Test:_ the mixed-problems fixture shows exactly 18 unknown ends, 5
repeated edges, 2 repeated ids, 3 decimal-comma weights and refused row 412 with its reason.

**13. Add a second file to this graph** (both; partly; placed by cost of error). Today a second file
silently drops its attributes for nodes already in the graph. Inside a project a second file offers
three verbs, pre-chosen from how its ids and headers match the graph: Add to this graph, Add columns
to nodes, Replace data. Add lets the reader keep or update existing nodes and shows added, updated
and unchanged counts before committing. _Test:_ a file sharing 14 ids shows "added 26 nodes, 62
edges, updated 14" before commit; "Open as a new graph" is not offered inside a project; adding the
same file again says every edge is already present and pre-chooses Replace instead of doubling them.

**18. Autosave and reopen** (both; partly; weight-sensitive; placed because it prevents lost work).
Reopening a project restores every source, mapping, join, filter and set, and names anything that
did not reload. _Test:_ after a page reload the same counts, join and filter return.

**16. Replace data, keep the analysis** (both; partly; weight-sensitive; placed by cost of error).
In the studio, a newer file opened in a project landed on Add and doubled every edge, and 8 of 8
readers had to hunt for Replace. Replace is a visible control. It keeps styles, runs, sets, notes,
filters, joins and the column mapping, re-applies the joins with their match lines, reruns the runs,
and reports nodes added, removed and changed plus anything that no longer binds. One undo restores
the old data and results. _Test:_ replacing September with October keeps styles, notes and the
weight's meaning, reads "+12 / -3 / 40 changed", and one undo brings September back.

**17. See and fix a column's type** (element; no; weight-sensitive; placed by cost of error). A yes
or no column read as text makes a filter keep 0 nodes with no warning, and every tool surveyed
shows and fixes the type on its first screen. Each column shows its type and how many values do not
fit it. Changing the type takes one action and first says how many values will not convert and what
happens to them. The change is a recipe command and is saved in the graph's columns schema. _Test:_
an amount column with one "N/A" among 500 numbers loads as a number with "1 blank".

**21. Open a sample** (both; yes; placed as the newcomer's safety net). The start screen opens
samples and generated graphs in one click.

### Secondary: one step in

- **6. A dropped file goes where it belongs** (both; partly). A recipe, style file or project opens
  as that, not as data. A file nobody recognizes offers "Read as..." with the registered formats.
  The studio found a project file opened through "New from data" refused as having no nodes or
  edges; that is a bug in a built door and is fixed in slice 1. _Done when:_ a dropped recipe opens
  Apply; a `.txt` edge list can be read as CSV.
- **47. Draw a file's own colors and sizes as a removable style layer** (element; unverified).
  _Done when:_ removing the layer restores the default.
- **28. Filters become an ordered list of steps once there are two, each switchable and showing what it removed** (element; no). _Done when:_ switching off step 1 restores its elements; both steps survive reopening.
- **35. Export only what is shown, a set or the selection, and leave out chosen columns** (element; no). _Done when:_ "showing 140 of 900" exports 140 nodes.
- **32. Graph properties: how parallel edges combine, self-loops, two-mode, "treat as undirected" when mostly reciprocal** (element; partly). _Done when:_ merging with sum adds weights and a count column.
- **39. Change a role after loading, as one undo step** (element; no). _Done when:_ changing the weight column reruns runs; undo restores it.
- **45. Join a table onto edges by edge id or by source and target** (element; no). Saved like a node join: the table is a source, the join a recipe command naming its key columns. _Done when:_ "380 of 400 edges matched".
- **33. Time as a start and end with a unit; unreadable times counted** (element; partly). _Done when:_ 7 unreadable values counted.
- **19. Known file shapes map themselves** (both; no; weight-sensitive). A file whose headers match
  a mapping the reader used before, or a known export such as STRING's, is mapped by header name,
  with one line "Used your mapping from sept.csv. Change". New columns are listed. _Done when:_ a
  second export with the same headers in another order needs no changes.
- **22. Apply a recipe someone gave you** (both; no; weight-sensitive). One command applies it.
  Columns bind by role and then by name, the reader confirms only weight roles and mismatched
  measurement levels, everything unbound is listed before anything runs, and one undo reverses it.
  No tool surveyed puts this on its first screen. _Done when:_ a recipe needing `padj` on a table
  without it lists "column padj not found" before any step runs.
- **36. The list of data steps in order, with undo per step and a methods paragraph** (element; partly; weight-sensitive). _Done when:_ five steps listed; the text names files, settings and counts.
- **23. Connect to a source and test the connection** (both; element yes, app no; weight-sensitive).
  The reader picks a source, fills in fields drawn from its descriptor (endpoint, database,
  sign-in), and tests it before loading. The test answers in neutral facts: reachable, sign-in
  accepted, and why not. The app draws one form for every source and builds no client. Built in:
  NDEx, Cypher (Neo4j, Amazon Neptune) and a REST mapping for any JSON API; no SPARQL source yet.
  Today the app's "Open network data" dialog
  (`graphty/src/workspace/start/NetworkDataDialog.tsx`) lists these sources as "on the way" and
  opens only a graph file at a web address. No studio task has opened a network source. _Done
  when:_ a Neo4j endpoint with a wrong password reports a refused sign-in before any data loads.
- **24. Choose what to load: browse or query** (both; element yes, app no; weight-sensitive).
  Search a repository and pick (an NDEx network by name), write a database query, or fill a web
  API's parameters. The load is one undo step. _Done when:_ an NDEx search for "TP53" lists
  networks with their counts, and choosing one draws it.
- **43. Paste a gene list, pick species and confidence, get the STRING network** (both; element partly: the STRING mapping loads from a list and a species but reports no found and not-found counts; app no; weight-sensitive). It is the genomics researcher's first move in every session. _Done when:_ "287 found, 13 not found".
- **26. A query that returns too much says what it left out and offers More** (both; element yes,
  app no; ships with 24). Every load and expansion takes size limits the app sets; the element
  picks none. A capped load reports the cap it reached and whether more remains, and "Load more"
  fetches the next page. _Done when:_ a query matching 40,000 nodes under a 5,000-node limit loads
  5,000 and one "Load more" adds the next page.
- **27. A reopened project asks before it queries, and asks for sign-in only when it must** (both;
  element yes, app no; ships with 24). A reopened project shows its saved rows offline and runs no
  query by itself, because a shared file could otherwise run a stored query against a database on
  the reader's machine. The reader approves each waiting load. A password is never in the file; a
  remembered credential is found by source and origin. _Done when:_ a saved Neo4j project reopened
  in a new browser shows its graph, fetches nothing until approved, and the saved file holds no
  password.
- **42. One event table makes several kinds of node; two columns share one id space** (element; no; weight-sensitive). _Done when:_ an auth log gives users and hosts as two kinds.
- **29. Sources list with counts, each naming its file, URL or source and query; once there are two sources, an element's details name its source** (element; partly: network loads are listed with their query and each node carries `_source.loads`; file loads are not listed yet; weight-sensitive). _Done when:_ two files and one Neo4j query list three sources; an edge names its source.
- **34. Name, reapply and combine saved filters and sets; one list to rename, delete or export saved items** (app; element done; weight-sensitive). _Done when:_ a saved filter reapplies after reopening.
- **30. Cleanup offers in the load report: blank ids, padded spaces, case-only id variants, mixed types, self-loops, missing weights** (both; partly). _Done when:_ "Acme " and 40 blank ids show two offers; undo restores the originals.
- **50. A column computed from an expression in the existing JMESPath dialect** (element; weight-sensitive). _Done when:_ degree_tumor - degree_normal is typed a number with its fill shown, and editing it updates the column.
- **41. Keep only the largest group; save a set as a subnetwork** (element; no). The genomics protocol needs the largest group in one click (`W20.yaml`, lines 88-90). _Done when:_ the full network stays reachable.
- **37. Rename (everything that reads the column follows), delete, fill empty values** (element; no). Every tool surveyed renames from the column. _Done when:_ a style and a filter keep working after a rename.
- **38. Hide and reorder table columns, remembered** (app; partly). _Done when:_ the same five columns show after reopening.

### Advanced: for experts

- **49. Save the current steps as a recipe that names columns by role or name, never node ids** (element; weight-sensitive).
- **53. A new source with no code: a REST mapping for any JSON API, or a custom source an extension registers** (element; yes: the `rest` source and `registerSource` in `./extend`; app no; weight-sensitive).
- **46. A file over the drawing limit offers a way through (busiest N nodes) instead of a bare refusal** (element; refusal only). _Done when:_ size, limit and the left-out count are shown.
- **54. Remove one source, keeping elements another source also supplied** (element; no; weight-sensitive).
- **44. Import a list of ids (or a GMT file) as a saved set** (element; no; weight-sensitive). _Done when:_ "47 matched, 3 not in graph".
- **48. Refresh a source load: say whether the source changed, re-run its query and expansions, and apply only the difference as one undo step** (element; no). _Done when:_ an NDEx network edited upstream reads "changed", and a refresh reports nodes added, removed and updated.
- **31. Merge exact and case- or space-variant duplicate nodes, approved per group, with a rule per attribute** (element; no). Most duplicates come from importing the same file again, which 13, 16 and 30 prevent. _Done when:_ three spellings of Acme merge; undo restores three nodes.
- **52. A mapping table that translates ids between systems before a join** (element). The mapping table is itself a source, and the join records which table it used (item 9 below).
- **51. Similar-name duplicate groups (IBM, I.B.M.), approved one at a time** (element).
- **58. Match nodes across graphs or tables** (element; no). By a key column with its id system, or through an id-mapping table. The project stores the rule and recomputes the matches on open, with matched and unmatched counts; it never stores matched pairs. Joins (14, 45), mapping tables (52) and set operations (56) all use it. _Done when:_ a tumor and a normal network matched by Ensembl gene report "4,210 matched, 37 only in tumor", and the same counts return after reopening.
- **56. Union, intersection and difference of two named graphs** (element; no). The result is its own named graph plus a recipe command naming its inputs and the operation, so it can be rebuilt (item 9 below).
- **55. Project a two-mode graph onto one kind with a stated weighting** (element).
- **57. Earlier data, compared after Replace** (element; no). After Replace the earlier data stays as another named graph ("September") and is compared with requirement 56; there is no separate versioning.
- **25. Expand a node's neighborhood from its source, and collapse it** (both; element yes, app no). The reader fetches a node's neighbors to a chosen depth, direction and relationship type, with a limit on new nodes. Each node says whether it has more to show. Collapse removes only what that node's expansions added. No persona file shows a reader expanding from a server; the investigators' "expand" is expanding the view inside the loaded graph. _Done when:_ expanding one Neo4j account with a limit of 50 adds at most 50 nodes and marks it "partial"; collapse restores the graph; each is one undo step.
- **40. Edit a cell, add or remove a node or edge, marked as edited** (both; element verbs exist). _Done when:_ edits survive reopening and undo singly.

### Later: blocked on something else

- **59. Latitude, longitude and country roles.** Waiting for a map view; nothing reads a place yet. The place role is already in the file format, so files saved now keep it.
- **60. Load only a time window or the strongest ties from a file.** Deferred because the too-large path (46) covers the urgent half; for network sources, size limits and expansion already load only part.

## Where each feature appears

The app's places, as built on `golden` (`graphty/src/workspace/`) and designed in
`design/ui/tier1-real-app/tier1-design.md`, section 2, and
`design/ui/app-shell-progressive-disclosure-design.md`, sections 5.3 and 6:

- **Start screen**: outside a project. Open project or file..., New from data..., the samples, and
  the "Open network data" dialog.
- **Data page**: a full page every data door opens. Its Tables list, model strip, table header
  strip ("Each row is", the weight line, File settings), sample grid with a role menu per column,
  match report (the load report) and footer (Direction, Load).
- **Data place**: the Data button on the rail. Its Sources section (a row per load, "+" to add, a
  row menu) and Attributes section (type glyph, fill, an attribute menu). The Filters, Steps and
  Saved sections are designed but not built.
- **Graph place**: the Graph button on the rail. The find box, the paint tree, and the title line
  that becomes the Graphs switcher once a project holds two graphs.
- **Inspector**: right panel, showing the selected node, edge, attribute or row.
- **Table dock**: the table along the bottom of the canvas (Shift+T). Nodes and Edges tabs, the
  "Columns: 8 of 69" chooser, a column menu, and a row menu that is the node's menu.
- **Node's menu**: the same menu from a node on the canvas, its table row and its inspector.
- **Toolbar and selection bar**: Analyze, Layout, View, Legend and Quick actions; the selection
  bar above them while something is selected.
- **Header**: the main menu (Save, Export...), Undo and Redo, the autosave chip, and the filter
  chip (designed, not built).
- **Quick actions**: the command palette (Ctrl+K), which lists every command that exists.

### The first-screen rule

The first screen is everything from opening a door to the first drawing, plus the drawn graph
before the reader's second action. It shows only what this reader's own data needs now. It must
not show:

- a control from a later tier, even disabled or tagged "Coming"
- a control at its default value; only a deviation is drawn, so a confident mapping is one line
  with Change
- a load-report line, cleanup offer or duplicate offer whose count is zero
- a verb whose precondition is missing: Add and Replace outside a project; Expand, Load more,
  Refresh and Approve for a graph that came from a file; a filter step list before the second
  filter; a source name in an element's details while there is one source; the Graphs switcher
  while there is one graph
- a word from inside the element: join key, schema, recipe command, rule tree, journal, projection

_Test:_ a screenshot audit of the first screen for a clean CSV, a messy CSV and a Neo4j load finds
none of these, and a keyboard user reaches every primary requirement's control from it.

### Disclosure map

"Always" is drawn whenever its place is open. "When" is drawn only once its trigger holds.
"Asked" is reached only through the named control and Quick actions. Every row is also listed in
Quick actions once it exists, and nothing is reachable only there.

**Primary**

| Req | Where it lives                                                              | How it is revealed                                    |
| --- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| 4   | Start screen; a drop; Ctrl+V; Sources "+"; the empty-canvas card            | Always                                                |
| 5   | Data page footer: Load                                                      | Always; focused when no choice is needed              |
| 12  | Data place: Filter; attribute menu Select where..., Hide where...; find box | Filter always; header filter chip while hiding        |
| 20  | Main menu Export... (Mod+E); table options menu                             | Always; loss line when the format drops something     |
| 11  | Graph place find box ("/")                                                  | Always                                                |
| 10  | Data place: summary line; Attributes (type, fill)                           | Always after a load                                   |
| 7   | Data page: mapping line, role menus, "Each row is", Direction               | Line always; menus when a guess is unsure, or asked   |
| 9   | Data page weight line; the weight attribute's inspector                     | When an edge table has a number column; meaning asked |
| 14  | Data page verb Add columns to nodes; match lines                            | Pre-chosen when a table's key matches node ids        |
| 15  | Data page Tables list and model strip                                       | When a node table and an edge table are on the page   |
| 8   | Data page match report; then the source row in the Data place               | When a count is nonzero                               |
| 13  | Data page "Add to <project>": its three verbs                               | When a file arrives inside a project                  |
| 18  | Header autosave chip; Recovered work on the start screen                    | Chip always; a list when something did not reload     |
| 16  | Source row menu: Replace with file...; the Replace data verb                | Always on the row menu; its report stays on the row   |
| 17  | Type glyph: attribute row, sample grid, table header                        | Count when a value does not fit; change asked         |
| 21  | Start screen samples                                                        | Always on the start screen                            |

**Secondary**

| Req | Where it lives                                                         | How it is revealed                                     |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| 6   | Every drop target; File settings: Read as...                           | Routing always; Read as... when no format matches      |
| 47  | Data page line "This file has its own colors. Use them"; its layer row | When the file carries colors or sizes                  |
| 28  | Data place Filters section; the filter chip opens it                   | When a second filter is added                          |
| 35  | Export dialog: What (shown, a set, selection); Columns                 | When a filter, set or selection exists                 |
| 32  | Data page footer by Direction; "Treat as undirected" line              | When repeats, self-loops or reciprocal edges are found |
| 39  | Source row menu: Edit source... (the Data page at that table)          | Asked                                                  |
| 45  | Data page verb Add columns to edges                                    | When columns match edge ids or source and target       |
| 33  | A time column's role menu: Start, End, unit                            | When a column is guessed or set as time                |
| 19  | Data page mapping line: "Used your mapping from sept.csv. Change"      | When headers match a saved mapping or a known export   |
| 22  | Open project or file... or a drop, with a recipe; the Apply sheet      | Asked: opening a recipe file                           |
| 36  | Data place Steps section, collapsed; Copy as methods text              | When the project has two data steps                    |
| 23  | "Open network data" by Open; Sources "+" > From a source...            | Always; Test before Load                               |
| 24  | The same dialog: search, query or parameters                           | When the connection test passes                        |
| 43  | "Open network data" > STRING: gene list, species, confidence           | Asked: choosing STRING                                 |
| 26  | The source row ("5,000 of 40,000", Load more); a notice                | When a load reached its cap                            |
| 27  | Sources section: waiting loads with Approve; sign-in prompt            | When a reopened project holds a source load            |
| 42  | "Each row is: an event"; a role menu per entity column                 | Asked: the "Each row is" choice                        |
| 29  | Data place Sources; "From: <source>" in an element's inspector         | Sources always; the line when there are two sources    |
| 34  | Data place Saved section; Save as set on the condition card            | Section when the first item is saved                   |
| 30  | Match report lines, each with its fix and count                        | When the report finds that problem                     |
| 50  | Attributes "+" > Computed column...                                    | Asked                                                  |
| 41  | Summary link Keep only the largest group; set menu                     | Link when there are two groups; menu asked             |
| 37  | Attribute and table column menus: Rename, Delete, Fill empty...        | Asked; Fill empty when there are empty values          |
| 38  | Table dock "Columns: 8 of 69" chooser; dragged headers                 | Asked                                                  |

**Advanced**

| Req | Where it lives                                                      | How it is revealed                                |
| --- | ------------------------------------------------------------------- | ------------------------------------------------- |
| 49  | Steps section: Save as recipe; Export... > Recipe                   | Asked                                             |
| 53  | "Open network data" > Other web API...; extension sources listed    | Asked                                             |
| 46  | Data page, in place of the refusal: size, limit, a way through      | When the file is over the drawing limit           |
| 54  | Source row menu: Remove                                             | When the graph has two sources                    |
| 44  | Saved section "+" > Import a list...; a dropped GMT file            | Asked                                             |
| 48  | Source row menu: Refresh; a "changed" mark on the row               | For a source or URL load; mark when it changed    |
| 31  | Report line "3 possible duplicate groups. Review"                   | When found; else asked: Find duplicates...        |
| 52  | "Match by" > Through a mapping table...                             | Asked                                             |
| 51  | Duplicates sheet: Include similar names                             | Asked                                             |
| 58  | "Match by" line of the join and combine sheets                      | When matching needs a choice                      |
| 56  | Graphs switcher: Combine..., Compare...                             | When the project holds two graphs                 |
| 55  | Graphs switcher: Project onto one kind...                           | When the graph is two-mode (requirement 32)       |
| 57  | Replace's confirmation: Keep September as another graph (off)       | When Replace runs                                 |
| 25  | Node's menu: Expand..., Collapse; "has more" in the inspector       | When the graph came from a source that can expand |
| 40  | A table cell (Enter edits); node's menu: Delete; Add node, Add edge | Asked; "edited" mark when a value was edited      |

**Later** (59, 60): not drawn.

**The one condition card.** A filter, a style layer's target, a saved set and an algorithm's or
export's scope are one card of conditions that must all hold, with "X of Y" counted by the element,
ending in a verb: Select, Hide, Style these, Save as set, or Run on these. It needs requirement 3's
single element shape, or the app would have to translate it into three.

## Build order

The tiers say where a feature appears; the slices say when it is built. Each slice ships whole, and
its test is run in a fresh browser, by keyboard alone, against the first-screen rule.

**Prerequisites: 1, 2, 3.** _Done when:_ each of their tests passes, and the Data page builds
against graphty-element's load APIs with no role list or workaround of its own.

**Slice 1: a complete first session for a file reader.** 4, 5, 7, 8, 10, 11, 12, 17, 20, 18 and
21, plus the routing bug in 6. Requirement 17 is here because this slice's own test filters on a
number column, which today loads as text when one value is "N/A". _Done when:_ a file reader drops
`bait_prey.tsv`, loads it with the guessed roles in one Enter, reads what loaded, finds a protein,
hides "confidence < 0.4" with the card, reloads the page to the same graph and filter, and exports
a CSV holding every column; a column with one "N/A" loads as a number with "1 blank".

**Slice 2: a second table and newer data.** 9, 14, 13, 15 and 16, plus secondary 29, because a
graph with two sources needs its sources listed. _Done when:_ a supply-chain session loads
`suppliers.csv` and `ships_to.csv` in either order, joins a 340-row table with its match lines,
adds the same file again without doubling an edge, and replaces September with October keeping
styles, notes and the weight's meaning, with one undo back; the Data place lists every source with
its counts; the weight test of requirement 9 passes.

**Slice 3: a first session for a server reader.** 23, 24, 43, 26 and 27. Requirement 27 ships with
the first server load because autosave saves source loads, and a reopened project must not query
on its own. _Done when:_ a server reader connects to a test Neo4j, tests the connection, runs a
query capped at 5,000 nodes, presses Load more, reloads the page, approves the waiting load, and
finds no password in the saved file; a genomics reader pastes 300 genes and reads "287 found, 13
not found". If the owner puts server readers in the first audience (see "Open for the owner"), this
slice ships together with slice 1.

**Slice 4: repeat work.** 19, 22, 28, 35, 39, 36 and 33. _Done when:_ an analyst opens this
month's file and gets last month's mapping with no changes, applies last month's recipe, adds two
filter steps and switches the first off, changes the weight column after loading, exports only
what is shown, and copies a methods paragraph naming every step.

**Slice 5: cleaning and shaping.** 32, 30, 42, 37, 6 and 47. _Done when:_ the knowledge engineer's
messy fixture offers fixes for padded and blank ids, combines parallel edges with sum and a count,
and renames a column a style and a filter both read; an authentication log gives users and hosts
as two kinds; a `.txt` edge list is read as CSV.

**Slice 6: the rest of secondary.** 45, 34, 50, 41 and 38. _Done when:_ each requirement's test
passes, and a saved filter, an edge join, a computed column and a hidden column all survive
reopening.

**After secondary.** The advanced requirements in their priority order, each done when its test
passes, with three dependencies: 58 before 52 and 56, 56 before 57, and 29 before 54. The later
requirements wait for what blocks them: 59 for a map view, 60 until the too-large path of
requirement 46 proves not enough.

## What competitors teach, and what this supersedes

The competitor lessons behind these requirements, and the earlier designs this one replaces or
updates, are in the evidence appendix, section J.

## Decisions

The root `CLAUDE.md` gives additive API changes to the team and keeps for the owner only breaking
changes and formats that are published to consumers. The owner has settled the one format question
this plan raised. One priority question is open for the owner; the rest is decided here.

### Open for the owner: who the first layer is for

One question decides more of the order than any cell in the grid: **is the first layer for every
persona equally, for the weekly file analyst, or for any reader a job blocks, including readers
whose data is on a server?** Each answer gives a different order:

1. **Every persona equally** (the default in this document). The first layer is the file list
   above. The server requirements (23, 24, 43, 26, 27) and one-table-several-kinds (42) are
   secondary, and are built in slice 3.
2. **The weekly file analyst first**, as the UI task ranking is written
   (`design/ui/framework/top-tasks.md`, line 10). The first layer is the same. In secondary, the
   repeat-work items rise and the server items fall to the end: keep-and-replay ranks 10th of 30
   jobs instead of 11th, reopen 14th instead of 18th, replace 16th instead of 21st, and loading
   from a server 18th instead of 13th.
3. **Any reader a job blocks.** Loading from a server blocks the genomics researcher and the
   knowledge engineer often or every session, so 23, 24, 43, 26 and 27 join the first layer right
   after 14, and 42 with them. Slices 1 and 3 then ship together.

The owner has said to make the app work for the average user before specialized features (the
studio's owner notes, `design/ui/studio/digests/owner-voice.md`, lines 296-297, on the studio
branch). That points to the first or second answer, so the document uses the first until the owner
says otherwise. The top-task vote planned in `top-tasks.md` would settle it with evidence.

### Decided by the owner: what a project file records

Decided 2026-10-19. A saved project is a graphty document (`design/documents/container.md`): a
list of typed members, where a reader skips a member kind it does not know, a kind listed in
`requires` makes an older reader refuse the file instead of misreading it, and the data member is
closed and embeds the graph in one of graph-io's JSON dialects. Everything below is a new member
kind or a new optional field; nothing that exists changes.

1. **Several named graphs.** One data member per graph, each with an id and a name. A file with
   more than one lists the data kind in `requires`, so a reader that applies only the first data
   member refuses the file instead of silently showing one graph.
2. **Sources.** One sources member records every load: what was loaded (a file's name and content
   hash, a URL, or a network source's id with its query or configuration), the mapping and options
   used, when, and into which graph. It is the existing experimental `graphty-sources` member,
   which records network loads today, extended to files and URLs before it ships.
3. **Credentials never in the file.** A source record names a credential slot. On reopen the
   element asks before it queries and asks for sign-in only when no credential is remembered
   (requirement 27).
4. **Per-element provenance.** A reserved column lists the loads that supplied each element: the
   existing `_source.loads`.
5. **Step history.** The existing recipe member. Every data operation is one recipe command
   (requirement 1), so there is no separate step log.
6. **Data embedded by default**, so a project opens offline and private data is never fetched
   again. An option saves the steps only and re-reads the sources on open. (A document saved to
   share a technique still leaves the data out, as the container says.)
7. **No separate versions or checkpoints.** After Replace, the earlier data can stay as another
   named graph.
8. **A columns member per graph, written as JSON Schema (draft 2020-12).** One schema describes the
   node record and one the edge record, using standard keywords plus a published graphty
   vocabulary: its own meta-schema declaring the graphty keywords.
   The keywords it carries, how values are stored and what each column role records are in the
   evidence appendix, section K. A column with no recorded role is inferred on open, as today, and
   recipes refer to columns by role, so a recipe survives renamed columns.
9. **Joins between graphs.**
    - A table joined onto a graph: the table is a source, and the join is a recipe command naming
      the key columns (requirements 14 and 45).
    - A graph derived from others (union, intersection, difference) is its own named graph plus a
      recipe command naming its inputs and the operation, so it can be rebuilt (requirement 56).
    - Matching nodes across graphs: the project stores the rule (a key column with its id system,
      or an id-mapping table that is itself a source) and recomputes matches on open. It never
      stores matched pairs (requirements 52 and 58).

Why the columns member is JSON Schema rather than Frictionless Table Schema is in the evidence
appendix, section K.

**What cannot change once files are saved.** The vocabulary's keyword names and the shape of the
sources record are read forever once files exist. Each needs a written spec and conformance cases
(rows of `design/documents/conformance.md`) before graphty-element ships it.

### Decided here

These are additive, so the team decides them; each lands without the owner's approval. The
reasoning for each is in the evidence appendix, section L.

1. Column roles gain a node or edge kind and a skip choice through a new open-union field on
   `DraftColumn`, not by widening the closed `ColumnRole` union.
2. A date is a time measurement with an optional unit and format, not a new kind.
3. The weight meaning "similarity" is accepted beside "strength"; values read back keep saying
   `"strength"` until the next planned graphty-element major.
4. Ordered filter steps take one kind of step, each bounding every computation, saved as recipe
   commands.
5. Network-source limits default to none in the element and are set by the app.
