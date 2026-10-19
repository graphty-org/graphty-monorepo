# Data management requirements

Status: proposed, 2026-10-19. This document ranks what the graphty app and graphty-element must
do to get data into a graph and keep it in shape. It covers loading several sources (files, and
network sources such as databases and web APIs), combining them, setting column roles and types,
filtering, cleaning, and repeating the same steps on new data. It also decides which of those jobs belong on the first, always-visible layer of the app and
which wait one step in.

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
  Amazon Neptune and JSON web APIs, expands a node's neighborhood from the server, collapses it,
  pages capped loads and keeps passwords out of saved files (`graph-io/src/sources/`, and
  `data.import({ source, config })` with its companions in the session API). The app's "Open
  network data" dialog still says these sources are "on the way". The element marks this surface
  experimental, and nothing refreshes a load yet.
- Six design generations describe data management and disagree on tiers, defaults and verbs. The
  evidence appendix lists the contradictions.

The architecture rules in the root `CLAUDE.md` decide who builds what. Matching, joining, type
inference, counting and replaying are graph functionality. They belong in graphty-element and
return neutral facts (counts and `{ code, params }`). The app decides only what to show, in what
order, and in which words. Each requirement below names its owner:

- **element**: graphty-element
- **app**: the graphty app
- **both**: the element computes and the app displays

## Who does what with data

These are the 14 design personas in `design/designloom/personas/` that have data jobs in the app.
They are design hypotheses, not measured users, and the design-studio results cited later come
from simulated sessions. Where persona evidence and competitor products disagree, the competitors
break the tie.

| Data job                              | Personas who do it | Every session for                                                                                      | Blocking for                                                 |
| ------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Load one file                         | 13 of 14           | explorer, analyst, fraud, intelligence, security, supply chain, marketing, recommender, lab researcher | all but knowledge engineer                                   |
| Filter or hide                        | 12                 | analyst, expert, fraud, intelligence, security, genomics                                               | analyst, security                                            |
| Export data                           | 11                 | genomics, recommender                                                                                  | expert, marketing, recommender                               |
| Check what loaded                     | 10                 | explorer, analyst, expert, genomics, knowledge engineer                                                | analyst, knowledge engineer                                  |
| Set id, source, target, weight        | 10                 | security, recommender, lab researcher                                                                  | explorer, analyst, supply chain, recommender, lab researcher |
| Join a table onto nodes               | 9                  | genomics                                                                                               | genomics, bioinformatics                                     |
| Repeat steps on new data              | 9                  | --                                                                                                     | -- (often for five)                                          |
| Set time, kind, place                 | 9                  | fraud, security                                                                                        | --                                                           |
| Preview before loading                | 8                  | explorer, analyst, knowledge engineer, lab researcher                                                  | genomics, lab researcher                                     |
| Select by condition                   | 8                  | explorer, fraud, intelligence, security                                                                | fraud                                                        |
| Node table plus edge table            | 8                  | --                                                                                                     | supply chain                                                 |
| Add a second file                     | 7                  | --                                                                                                     | intelligence, knowledge engineer                             |
| Fix a column's type                   | 7                  | --                                                                                                     | --                                                           |
| Replace with newer data               | 6                  | --                                                                                                     | supply chain                                                 |
| Load from a server or list of ids     | 6                  | genomics, knowledge engineer, security                                                                 | genomics, knowledge engineer                                 |
| Expand a neighborhood from the server | 6                  | fraud                                                                                                  | fraud                                                        |
| Merge duplicate nodes                 | 6                  | knowledge engineer                                                                                     | knowledge engineer                                           |
| Merge or compare two graphs           | 5                  | --                                                                                                     | --                                                           |

The jobs in the bottom third of the table are rare for most personas but blocking for one or two
specialists. That is the shape progressive disclosure is for.

For five personas the data is not a file at all, so connecting to their source is a primary job
even though it is rare across the whole set:

- **Genomics** "starts from a gene list copied out of a spreadsheet, not from a graph file" and
  pulls the network from STRING (`genomics-cytoscape-user.yaml`, lines 26-27).
- **The knowledge engineer** "writes SPARQL or Cypher queries" and extracts entities "from source
  systems (databases, documents, APIs)"; the graph is 10,000 to 10,000,000 nodes and must be kept
  up to date as the sources change (`knowledge-engineer.yaml`, line 25; workflow W13, lines 26, 42
  and 89). A graph that size is queried, not opened.
- **Cybersecurity** "builds graphs from SIEM events" and turns a hypothesis "into a graph
  query" over 100,000 or more nodes (`cybersecurity-analyst.yaml`, line 23; workflow W07, lines 34
  and 50).
- **Fraud** starts each of 50 or more daily alerts from one flagged account in a graph of 10,000 to
  1,000,000 nodes and views its 1-2 hop neighborhood first (`fraud-analyst.yaml`, line 6; workflow
  W06, lines 50 and 65). That is expanding from the server, every session.
- **Intelligence** begins from seed entities and merges records from several systems, and three
  of the workflows it takes part in (W05, W09 and W17) need neighborhood expansion (workflow W09,
  lines 22 and 56). Its persona file names no server, and classified systems may not allow a
  browser to connect, so for this persona expansion is likely primary and connecting is a judgment.

These are design personas, not measured users. The evidence appendix, section C, has the cells.

## Ranked requirements

Each requirement gives its rank, owner and whether it exists today on the `golden` branch, then a
test that decides whether it is done. Every primary test is also run by keyboard alone, and once on
a graph above the large-graph threshold.

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

**4. Load a file by any door** (both; yes). Drop, file picker, paste or URL. Each door says the file
is read in this browser and not uploaded. _Test:_ one fixture loaded by all four doors gives the
same counts.

**5. A clean file is one Enter** (both; designed). When the element reports that no choice is
needed, every check is green and focus is on Load. _Test:_ a clean GraphML file and a two-column
CSV each draw after exactly one Enter; "no choice needed" is an element fact.

**6. A dropped file goes where it belongs** (both; unverified). A recipe, style file or project
opens as that, not as data. A file nobody recognizes offers "Read as..." with the registered
formats. _Test:_ a dropped recipe opens Apply; a `.txt` edge list can be read as CSV.

**7. Column roles at load** (both; partly). Each column shows its guessed role, including time and
a node or edge kind, and the graph's direction. The reader can change any role, skip a column, flip
rows between nodes and edges, or set direction, each in one action. When every guess is confident,
one line states the mapping, and the per-column choices are one action away. _Test:_ for
`bait_prey.tsv` the guesses are bait=source, prey=target, confidence=weight, entity_type=kind, and
flipping rows twice restores the counts.

**8. Load report shows only real problems** (both; partly). Edges naming unknown nodes (Add / Leave
out), repeated edges, repeated ids, decimal-comma numbers, and refused rows each with a row number
and a reason, plus "Skip these rows". A clean file shows none of these lines. _Test:_ the
mixed-problems fixture shows exactly 18 unknown ends, 5 repeated edges, 2 repeated ids, 3
decimal-comma weights and refused row 412 with its reason.

**9. The weight's role is visible and never blocks** (both; partly). The weight line shows whether
the number is a distance, a similarity, a capacity or unknown, with the element's guess. The role is
stored on the attribute and read by every later run. _Test:_ for edges A-B 0.9, B-C 0.9, A-C 0.1,
the shortest path A to C goes through B as a similarity and is direct as a distance; with the role
unknown the file still loads with one Enter.

**10. What loaded, in plain words** (app; element done). Node and edge counts, direction, the
number of separate groups and the largest, nodes with no links, and each attribute's type and
percent filled, all read from the element. _Test:_ an export with 214 unlinked nodes reads "3
separate groups; 214 with no links"; the app counts nothing itself.

**11. Find by name or value** (app; yes). Typing a name or value selects the match and brings it
into view. _Test:_ an account number selects and centers that node.

**12. One condition card: Select or Hide** (both; partly). The reader states conditions, which must
all hold, and chooses Select or Hide. The card shows "X of Y". Hiding never deletes data. _Test:_
"score > 0.7" with Hide shows 140 of 900; with Select, 140 are selected and none hidden; an export
still holds 900.

**13. Add a second file to this graph** (both; partly). Inside a project a second file offers three
verbs, pre-chosen from how its ids and headers match the graph: Add to this graph, Add columns to
nodes, Replace data. Add lets the reader keep or update existing nodes and shows added, updated and
unchanged counts before committing. _Test:_ a file sharing 14 ids shows "added 26 nodes, 62 edges,
updated 14" before commit; "Open as a new graph" is not offered inside a project.

**14. Join a table onto nodes** (element; no). "Add columns to nodes" suggests the key column. Before
committing it shows matched rows, table rows not in the graph, nodes that get no value, repeated
keys, how many more would match ignoring case and spaces, and the rule for clashing column names.
_Test:_ a 340-row table joined by symbol reports 318 matched, 22 not in the graph, TP53 matching 2
rows, and "19 more match ignoring case [Use]".

**15. A node file and an edge file together** (both; yes). Both load as one network in one visit,
in either order. _Test:_ `suppliers.csv` and `ships_to.csv` in either order give 120 nodes and 400
edges with supplier attributes.

**16. Replace data, keep the analysis** (both; partly). Replace is a visible control. It keeps
styles, runs, sets, notes, filters and joins, re-applies the joins with their match lines, reruns
the runs, and reports nodes added, removed and changed plus anything that no longer binds. One undo
restores the old data and results. _Test:_ replacing September with October keeps styles and notes,
reads "+12 / -3 / 40 changed", and one undo brings September back.

**17. See and fix a column's type** (element; no). Each column shows its type and how many values
do not fit it. Changing the type takes one action and first says how many values will not convert
and what happens to them. _Test:_ an amount column with one "N/A" among 500 numbers loads as a
number with "1 blank".

**18. Autosave and reopen** (both; partly). Reopening a project restores every source, mapping,
join, filter and set, and names anything that did not reload. _Test:_ after a page reload the same
counts, join and filter return.

**19. Known file shapes map themselves** (both; no). A file whose headers match a mapping the reader
used before, or a known export such as STRING's, is mapped by header name, with one line "Used your
mapping from sept.csv. Change". New columns are listed. _Test:_ a second export with the same
headers in another order needs no changes.

**20. Export everything** (element; yes). Node and edge tables carry every computed and joined
column, and any loss the format causes is stated before writing. _Test:_ after a run and a join the
CSV holds both columns.

**21. Open a sample** (both; yes). The start screen opens samples and generated graphs in one
click.

**22. Apply a recipe someone gave you** (both; no). One command applies it. Attributes bind by
name, the reader confirms only weight roles and mismatched measurement levels, everything unbound is
listed before anything runs, and one undo reverses it. _Test:_ a recipe needing `padj` on a table
without it lists "column padj not found" before any step runs.

#### Primary for readers whose data lives on a server

Requirements 23 to 27 are first-layer jobs for the five personas whose data sits in a database or a
web service rather than in a file: fraud, intelligence, cybersecurity, the knowledge engineer and
genomics (see "Who does what with data"). graphty-element can already do each of them; the app
cannot yet. Its "Open network data" dialog (`graphty/src/workspace/start/NetworkDataDialog.tsx`)
lists NDEx, Neo4j and a web API as "on the way" and opens only a graph file at a web address, which
is requirement 4's URL door.

**23. Connect to a source and test the connection** (both; element yes, app no). The reader picks a
source, fills in its fields (endpoint, database, sign-in), and tests it before loading anything.
The test answers in neutral facts: reachable or not, whether sign-in worked, and why not (a refused
sign-in, a browser blocking the request, a server on the local network). The fields come from the
source's descriptor, so the app draws one form for every source and builds no client. The built-in
sources are NDEx, Cypher (Neo4j and Amazon Neptune) and a REST mapping for any JSON API, with
OpenAlex as a preset and STRING and deps.dev as sample mappings. There is no SPARQL source yet.
Element today: `data.testSource`, `sourceDescriptors()` in `./catalog`, the six built-in sources in
`graph-io/src/sources/`. _Test:_ a Neo4j endpoint with a wrong password reports a refused sign-in
before any data loads; the same form with the right one reports success; the app holds no
source-specific code.

**24. Choose what to load: browse or query** (both; element yes, app no). For a repository the
reader searches and picks (an NDEx network by name); for a database the reader writes a query or
picks labels and relationship types; for a web API the reader fills its parameters. The load is one
undo step, like any other load. Element today: `data.listSource` returns neutral rows to choose
from, and `data.import({ source, config })` loads. _Test:_ an NDEx search for "TP53" lists networks
with their node and edge counts, and choosing one draws it; one undo removes it.

**25. Expand a node's neighborhood from its source, and collapse it** (both; element yes, app no).
From a node that a source brought, the reader fetches its neighbors from the server, to a chosen
depth, direction and relationship type, and with a limit on new nodes. New nodes appear beside the
seed and the layout continues. Each node says whether it has more to show (`_source.expansion` and
`_source.hidden`), which the app can style with its own layer. Collapse removes what that node's
expansions added and nothing another load also brought or the reader edited. Element today:
`data.expand`, `data.collapse`, and `behavior.expand` to expand on click or double-click (off by
default). _Test:_ in a Neo4j graph, expanding one account with a limit of 50 adds at most 50 nodes
and marks the account "partial"; expanding again continues where it stopped; collapse restores the
graph; each is one undo step.

**26. A query that returns too much says what it left out and offers More** (both; element yes, app
no). Every load and expansion takes size limits (nodes, edges, bytes, requests, time). The element
picks no limit, since the right one depends on the consumer's screen and machine, so the app sets
them. A capped load keeps what came first, reports the cap it reached and whether more remains, and
"Load more" fetches the next page. Element today: `limits` and `onLimit` in `SourceLoadOptions`, and
`data.more()`. _Test:_ a query matching 40,000 nodes with the app's 5,000-node limit loads 5,000,
says more remain, and one "Load more" adds the next page.

**27. A reopened project asks before it queries, and asks for sign-in only when it must** (both;
element yes, app no). Opening a saved project shows its saved rows at once, offline, and runs no
query by itself, because a shared file could otherwise run a stored query against a database on
the reader's machine. Each waiting load names its source, its endpoint, whether it has a query,
whether the server is on the local network and whether sign-in is needed. The reader approves each
one. A password is never in the project file, its undo history or its events; the file records only
which kind of sign-in, for which origin and user name. A credential the reader chose to remember on
this device is found by source and origin, so the reader is asked only when none is remembered, and
remembered credentials are listed and removable. Element today: `data.pendingSourceLoads`,
`data.runPendingSourceLoad`, the `./credentials` entry point (`CredentialStore`), and the
`graphty-sources` project member. _Test:_ a saved Neo4j project reopened in a new browser shows its
graph, lists one waiting load that needs sign-in, and fetches nothing until approved; searching the
saved file for the password finds nothing.

### Secondary: one step in

- **28. Filters become an ordered list of steps once there are two, each switchable and showing what it removed** (element; no). _Done when:_ switching off step 1 restores its elements; both steps survive reopening.
- **29. Sources list with counts, each naming its file or its source and query; once there are two sources, an element's details name its source** (element; partly: network loads are listed by `data.loads()` with their query, endpoint and time, and each node carries `_source.loads`; file loads are not listed, and a file merge still overwrites the one `data.source()`). _Done when:_ two files and one Neo4j query list three sources, the query among them; an edge names its source.
- **30. Cleanup offers in the load report: blank ids, padded spaces, case-only id variants, mixed types, self-loops, missing weights** (both; partly). _Done when:_ "Acme " and 40 blank ids show two offers; undo restores the originals.
- **31. Merge exact and case- or space-variant duplicate nodes, approved per group, with a rule per attribute** (element; no). _Done when:_ three spellings of Acme merge; undo restores three nodes.
- **32. Graph properties: how parallel edges combine, self-loops, two-mode, "treat as undirected" when mostly reciprocal** (element; partly). _Done when:_ merging with sum adds weights and a count column.
- **33. Time as a start and end with a unit; unreadable times counted** (element; partly). _Done when:_ 7 unreadable values counted.
- **34. Name, reapply and combine saved filters and sets; one list to rename, delete or export saved items** (app; element done). _Done when:_ a saved filter reapplies after reopening.
- **35. Export only what is shown, a set or the selection, and leave out chosen columns** (element; no). _Done when:_ "showing 140 of 900" exports 140 nodes.
- **36. The list of data steps in order, with undo per step and a methods paragraph** (element; partly). _Done when:_ five steps listed; the text names files, settings and counts.
- **37. Rename (everything that reads the column follows), delete, fill empty values** (element; no). _Done when:_ a style and a filter keep working after a rename.
- **38. Hide and reorder table columns, remembered** (app; partly). _Done when:_ the same five columns show after reopening.
- **39. Change a role after loading, as one undo step** (element; no). _Done when:_ changing the weight column reruns runs; undo restores it.
- **40. Edit a cell, add or remove a node or edge, marked as edited** (both; element verbs exist). _Done when:_ edits survive reopening and undo singly.
- **41. Keep only the largest group; save a set as a subnetwork** (element; no). _Done when:_ the full network stays reachable.
- **42. One event table makes several kinds of node; two columns share one id space** (element; no). _Done when:_ an auth log gives users and hosts as two kinds.
- **43. Paste a gene list, pick species and confidence, get the STRING network** (both; element partly: the REST source's STRING mapping loads a network from a list of identifiers and a species, but reports no found and not-found counts; app no). _Done when:_ "287 found, 13 not found".
- **44. Import a list of ids (or a GMT file) as a saved set** (element; no). _Done when:_ "47 matched, 3 not in graph".
- **45. Join a table onto edges by edge id or by source and target** (element; no). _Done when:_ "380 of 400 edges matched".
- **46. A file over the drawing limit offers a way through (busiest N nodes) instead of a bare refusal** (element; refusal only). _Done when:_ size, limit and the left-out count are shown.
- **47. Draw a file's own colors and sizes as a removable style layer** (element; unverified). _Done when:_ removing the layer restores the default.
- **48. Refresh a source load: say whether the source changed since it loaded, and re-run its query and expansions, applying only the difference as one undo step** (element; no: the load record keeps what a refresh needs, but there is no `refresh` or `revalidate`). _Done when:_ an NDEx network edited upstream reads "changed", a refresh reports nodes added, removed and updated, and a value the reader edited is kept unless the reader takes the source's.

### Advanced: for experts

- **49. Save the current steps as a recipe that names columns, never node ids** (element).
- **50. A column computed from an expression in the existing JMESPath dialect** (element).
- **51. Similar-name duplicate groups (IBM, I.B.M.), approved one at a time** (element).
- **52. A mapping table that translates ids between systems before a join** (element).
- **53. A new source with no code: a REST mapping for any JSON API, recorded with the load so a reopened project reads it the same way; or a custom source an extension registers** (element; yes: the `rest` source and `registerSource` in `./extend`; app no).
- **54. Remove one source, keeping elements another source also supplied** (element; no: collapse removes one expansion, but there is no `removeLoad`).
- **55. Project a two-mode graph onto one kind with a stated weighting** (element).
- **56. Union, intersection and difference of two named graphs** (element; no). Unblocked: a project can hold several named graphs (owner decision, 2026-10-19).
- **57. Earlier data, compared after Replace** (element; no). Served by keeping the earlier data as another named graph ("September") and comparing it with requirement 56, so no separate versioning mechanism is needed.

### Later: blocked on something else

- **58. Latitude, longitude and country roles.** Waiting for a map view; nothing reads a place yet.
- **59. Load only a time window or the strongest ties from a file.** Deferred because the too-large path covers the urgent half; for network sources the source's own filters and requirement 25's expansion already load only part.

## Progressive disclosure for data

**First screen.** Every way in opens the Data page, which says the file stays in this browser. A
confident file shows its first rows, one line stating the mapping (from, to, weight and its role,
direction) with Change, and focus on Load. An uncertain file opens the per-column choices for the
uncertain columns only, each with its type and a count of values that do not fit. The load report
shows only nonzero lines. After loading, the Data place shows what loaded in plain words. The find
box and the condition card are always on the toolbar, Replace data is a visible control, and export
and autosave are always there. Inside a project, a second file offers Add, Add columns to nodes and
Replace with the match line visible before committing.

**First screen for server data.** "Open network data" sits beside Open on the start screen and in
the Data place. It lists the registered sources, draws each one's fields from its descriptor, and
offers Test before Load. A database source opens on a query box, a repository on a search. Once a
graph came from a source, a node's menu offers Expand and Collapse, a capped load shows what it
left out with Load more, and a reopened project lists its waiting loads to approve.

**One step in.** Ordered filter steps, the sources list, cleanup and duplicate offers (which appear
in the load report only when found), graph properties, time spans, column edits, re-mapping, cell
edits, saved items, export scope, the step list, subnetworks, event tables, gene lists, id lists,
edge joins, the too-large path, file styles and refreshing a source load.

**Expert.** Writing recipes, expressions, similar-name duplicates, id mapping tables, defining a
new source by a REST mapping, removing a source, projections, and set operations and comparisons
across named graphs.

**The one condition card.** A filter, a style layer's target, a saved set and an algorithm's or
export's scope are all the same card: a list of conditions that must all hold, each built from an
attribute, a comparison and a value, with "X of Y" counted by the element. The card ends in a verb:
Select, Hide, Style these, Save as set, or Run on these. Learning it once teaches every place it
appears. This is why requirement 3 comes first: without one element shape, the app would translate
the card into three shapes, which the architecture rules forbid.

## What competitors teach

- **Every graph tool puts "open a file" first, and the ones with fixed column names write the most
  help pages.** Gephi, Kumu and Polinode need exact headers. Cytoscape lets you click a header to
  make it the source or target ([Cytoscape manual](https://manual.cytoscape.org/en/stable/Creating_Networks.html)).
- **The most repeated complaint is a join that matches nothing and does not say why.** Cytoscape's
  error names no cause, and the causes are the key column, the id system, spaces and case
  ([Bioconductor thread](https://support.bioconductor.org/p/p133439/)). Power Query shows the
  matching-row estimate before you commit
  ([Microsoft](https://learn.microsoft.com/en-us/power-query/merge-queries-overview)).
- **Fixing a column's type is on the column itself everywhere:** Tableau, Power Query, Google
  Sheets and Datawrapper. Kumu's "Size by" stays empty until a field is a number
  ([Datawrapper](https://www.datawrapper.de/academy/data-column-types)).
- **Two plain verbs beat three subtle ones.** Tableau's relationships, joins and blends are its
  most documented confusion, and it publishes a page titled "Don't Be Scared of Relationships"
  ([Tableau](https://help.tableau.com/current/pro/desktop/en-us/datasource_dont_be_scared.htm)).
  Gephi users report landing in two workspaces when they miss the append choice.
- **Cleanup is offered only when the data needs it.** Tableau's Data Interpreter and Google
  Sheets' cleanup suggestions both appear only for messy data
  ([Tableau](https://help.tableau.com/current/pro/desktop/en-us/data_interpreter.htm)).
- **Recorded steps make refresh work, but steps keyed by column position break.** Power Query
  replays applied steps on refresh, and its automatic "Changed type" step fails when a column is
  renamed ([Microsoft](https://learn.microsoft.com/en-us/power-query/applied-steps)). Recipes bind
  by column name for this reason.
- **Ordered filter trees confuse newcomers.** Gephi declined a per-step toggle to stay simple
  ([Gephi blueprint](https://blueprints.launchpad.net/gephi/+spec/subfilter-toggle)), and
  Cytoscape's filter selects by default and hides only on request
  ([Cytoscape](https://manual.cytoscape.org/en/latest/Finding_and_Filtering_Nodes_and_Edges.html)).
  So one card is primary and ordered steps appear only once there are two.

## What this supersedes or updates

- **The old app shell's Data section** (`design/ui/app-shell-progressive-disclosure-design.md`,
  section 5.3, "Data"). Still holds: open, URL, paste and samples on the first layer; a mapping
  stated in one line with Change; tables, cleaning steps and validation one step in; dialogs for
  join, identifier mapping and merging. Replaced: "Run a recipe" sits beside Open there but is a
  start-screen bookend here; table join moves up to the first layer as one of three verbs; the
  seven-way Import options dialog gives way to the Data page and re-mapping; "warn and allow, never
  refuse" for large files becomes a pre-chosen way through; repeated edges are kept unless the
  reader chooses to combine them.
- **`design/ui/tier1-real-app/tier1-design.md`, "Not in tier 1".** Joins, Replace and weight roles
  move up from tier 2 to the first layer.
- **`design/ui/tier1-real-app/element-gaps.md`** is out of date. Load preview, project save and
  sample datasets now exist; the element gaps that remain are listed above.
- **`design/documents/drafts/data-plan.md`.** Its refusal of a join on a clashing column name is
  replaced by an explicit clash rule, and its remembered mapping becomes a recipe holding only the
  table reading, as `design/documents/recipe.md` already allows.
- **`design/ui/object-first-ux/feature-fit/1-data.md`.** Its "merging nodes does not fit" is
  overturned; merging is secondary.
- **Two `design/designloom/capabilities/` records are corrected.** `data-import.yaml` no longer
  refuses a file over 100 MB without a way through. `saved-filters.yaml` stores saved filters in the
  project, as the element's rule sets, not in browser storage.
- **`design/designloom/capabilities/neighborhood-expansion.yaml`** keeps its jobs (expand, depth,
  type filters, collapse, tracking which expansion brought a node), now served by the element's
  `data.expand` and `data.collapse`. Its 500-node warning and 2,000-node block become settings the
  app passes, not element behavior.
- **`design/graph-io/network-sources-design.md`** says "Nothing here is implemented". Most of it has
  landed on `golden`; what has not is refresh and revalidation, removing one load, the persistent
  source cache and a SPARQL source.

The framework documents in `design/ui/framework/` (top tasks, graph conventions, element needs, task
flows, decisions) stay in force; this document applies them to data.

## Decisions

The root `CLAUDE.md` gives additive API changes to the team and keeps for the owner only breaking
changes and formats that are published to consumers. So most of what this plan needs is decided
here, one open question remains with the owner, and one the owner has settled.

### Decided by the owner

- **A project can hold several named graphs** (2026-10-19). This unblocks set operations across
  graphs (requirement 56), and it serves earlier data (requirement 57): after Replace, the old data
  can be kept as another named graph ("September") and compared, so no separate versioning
  mechanism is needed. Its file form is part of the open question below.

### Open for the owner: what a project file records

This is a one-way door because saved project files will exist in the wild and must be read
forever, so whatever a field means in the first release it must mean in every later one. The
container (`design/documents/container.md`) is already built to grow: new member kinds are
additive, a reader skips a kind it does not know, and a kind listed in `requires` makes an older
reader refuse the file instead of misreading it. The recommendation:

- **Several graphs:** several data members, each with an id and a name. A file holding more than
  one lists the data kind in `requires`, so a reader that knows only "at most one data member
  applies" (container rule today) refuses the file instead of silently showing one graph.
- **Sources:** one sources member listing each source: a file (its name and a content hash), a URL,
  or a network source id with its query or configuration, plus the import mapping and options used,
  when it loaded, and which graph it went into. Never a credential, only the name of a credential
  slot the reader is asked to fill on open. Network loads already have such a record, the
  `graphty-sources` member (on `golden`, experimental, not yet released); the recommendation is to
  make it the one sources member and add files and URLs to it before it ships.
- **Which source each element came from:** a reserved attribute column on the element data, holding
  a list of source indexes, not a separate table, so it survives export and costs nothing when there
  is one source. Network loads already write such a column, `_source.loads`, holding load keys.
- **Step log:** the existing recipe member. Every data operation is a recipe command
  (requirement 1), so there is no new step-log format.
- **Data:** embedded by default, so a project opens offline and private data never has to be
  fetched again. A "steps only" save that re-reads the sources is an option for large or shared
  projects.
- **Checkpoints and versions:** not in the format now; named graphs cover them.

### Decided here

These are additive, so the team decides them; each lands without the owner's approval.

1. **Column roles gain a node or edge kind and a skip choice by a new field, not by widening
   `ColumnRole`.** `ColumnRole` is a closed union that `DraftColumn.suggested` returns, so a new
   member would break a consumer's exhaustive switch. Instead `DraftColumn` gains a new field typed
   as an open union (`ColumnRole` plus `"kind"`, `"skip"` and any string), and the table mapping
   gains optional `kind` and `skip` entries; `suggested` keeps returning only today's members.
   Reason: the same capability with no break. The cleaner version, widening `ColumnRole` itself,
   can ride in the grouped graphty-element major the owner has on hold.
2. **A date is a time measurement with an optional unit and format, not a new kind.** `Measurement`
   is already an open union that includes `"time"`, and a measurement declaration is an input, so
   optional fields on it break nothing. Reason: column types and time roles (requirements 17 and 33) need it now, and no published value changes meaning.
3. **The weight meaning "similarity" is accepted beside "strength".** Every input that takes a
   weight meaning accepts both, meaning the same thing, and values read back keep saying
   `"strength"` so no consumer's switch breaks; the role is also stored on the attribute, a new
   field. `"strength"` is deprecated and removed in the next planned graphty-element major, when
   read-back values switch to `"similarity"`. Reason: `design/ui/framework/graph-conventions.md`
   (line 88) asks for the clearer word, and deprecation now is cheaper than a major of its own.
4. **Ordered filter steps take one kind of step.** Nothing about filter steps is published: the
   published API has one filter per session (`session.visibility.filter`, a rule tree, set by
   `visibility.set`) plus one time window (`setWindow`), and `graphty-element/api/` on `golden` has
   no `FilterStep`. So the list of steps is a new, additive shape, and the team takes decision 25
   of `design/ui/framework/one-way-doors.md`: one kind, every step bounding every computation.
   Reason: it removes a hidden mode in which the same nodes behave two ways depending on the route
   taken. How steps are saved in a project file follows the step-log answer above.
5. **Network-source limits default to none in the element and are set by the app.** Reason: the
   right cap depends on the consumer's screen and machine, so it is a consumer's choice; the
   500-node warning and 2,000-node block in `design/designloom/capabilities/neighborhood-expansion.yaml`
   become the app's settings for requirements 25 and 26, not element defaults.
