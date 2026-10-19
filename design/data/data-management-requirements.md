# Data management requirements

Status: proposed, 2026-10-19. This document ranks what the graphty app and graphty-element must
do to get data into a graph and keep it in shape. It covers loading several sources, combining
them, setting column roles and types, filtering, cleaning, and repeating the same steps on new
data. It also decides which of those jobs belong on the first, always-visible layer of the app and
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

| Data job                            | Personas who do it | Every session for                                                                                      | Blocking for                                                 |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Load one file                       | 13 of 14           | explorer, analyst, fraud, intelligence, security, supply chain, marketing, recommender, lab researcher | all but knowledge engineer                                   |
| Filter or hide                      | 12                 | analyst, expert, fraud, intelligence, security, genomics                                               | analyst, security                                            |
| Export data                         | 11                 | genomics, recommender                                                                                  | expert, marketing, recommender                               |
| Check what loaded                   | 10                 | explorer, analyst, expert, genomics, knowledge engineer                                                | analyst, knowledge engineer                                  |
| Set id, source, target, weight      | 10                 | security, recommender, lab researcher                                                                  | explorer, analyst, supply chain, recommender, lab researcher |
| Join a table onto nodes             | 9                  | genomics                                                                                               | genomics, bioinformatics                                     |
| Repeat steps on new data            | 9                  | --                                                                                                     | -- (often for five)                                          |
| Set time, kind, place               | 9                  | fraud, security                                                                                        | --                                                           |
| Preview before loading              | 8                  | explorer, analyst, knowledge engineer, lab researcher                                                  | genomics, lab researcher                                     |
| Select by condition                 | 8                  | explorer, fraud, intelligence, security                                                                | fraud                                                        |
| Node table plus edge table          | 8                  | --                                                                                                     | supply chain                                                 |
| Add a second file                   | 7                  | --                                                                                                     | intelligence, knowledge engineer                             |
| Fix a column's type                 | 7                  | --                                                                                                     | --                                                           |
| Replace with newer data             | 6                  | --                                                                                                     | supply chain                                                 |
| Load from a database or list of ids | 6                  | genomics                                                                                               | genomics                                                     |
| Merge duplicate nodes               | 6                  | knowledge engineer                                                                                     | knowledge engineer                                           |
| Merge or compare two graphs         | 5                  | --                                                                                                     | --                                                           |

The jobs in the bottom third of the table are rare for most personas but blocking for one or two
specialists. That is the shape progressive disclosure is for.

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

### Secondary: one step in

- **23. Filters become an ordered list of steps once there are two, each switchable and showing what it removed** (element; no). _Done when:_ switching off step 1 restores its elements; both steps survive reopening.
- **24. Sources list with counts; once there are two sources, an element's details name its source** (element; no). _Done when:_ three loads list three sources; an edge names its source.
- **25. Cleanup offers in the load report: blank ids, padded spaces, case-only id variants, mixed types, self-loops, missing weights** (both; partly). _Done when:_ "Acme " and 40 blank ids show two offers; undo restores the originals.
- **26. Merge exact and case- or space-variant duplicate nodes, approved per group, with a rule per attribute** (element; no). _Done when:_ three spellings of Acme merge; undo restores three nodes.
- **27. Graph properties: how parallel edges combine, self-loops, two-mode, "treat as undirected" when mostly reciprocal** (element; partly). _Done when:_ merging with sum adds weights and a count column.
- **28. Time as a start and end with a unit; unreadable times counted** (element; partly). _Done when:_ 7 unreadable values counted.
- **29. Name, reapply and combine saved filters and sets; one list to rename, delete or export saved items** (app; element done). _Done when:_ a saved filter reapplies after reopening.
- **30. Export only what is shown, a set or the selection, and leave out chosen columns** (element; no). _Done when:_ "showing 140 of 900" exports 140 nodes.
- **31. The list of data steps in order, with undo per step and a methods paragraph** (element; partly). _Done when:_ five steps listed; the text names files, settings and counts.
- **32. Rename (everything that reads the column follows), delete, fill empty values** (element; no). _Done when:_ a style and a filter keep working after a rename.
- **33. Hide and reorder table columns, remembered** (app; partly). _Done when:_ the same five columns show after reopening.
- **34. Change a role after loading, as one undo step** (element; no). _Done when:_ changing the weight column reruns runs; undo restores it.
- **35. Edit a cell, add or remove a node or edge, marked as edited** (both; element verbs exist). _Done when:_ edits survive reopening and undo singly.
- **36. Keep only the largest group; save a set as a subnetwork** (element; no). _Done when:_ the full network stays reachable.
- **37. One event table makes several kinds of node; two columns share one id space** (element; no). _Done when:_ an auth log gives users and hosts as two kinds.
- **38. Paste a gene list, pick species and confidence, get the STRING network** (both; unmerged branch). _Done when:_ "287 found, 13 not found".
- **39. Import a list of ids (or a GMT file) as a saved set** (element; no). _Done when:_ "47 matched, 3 not in graph".
- **40. Join a table onto edges by edge id or by source and target** (element; no). _Done when:_ "380 of 400 edges matched".
- **41. A file over the drawing limit offers a way through (busiest N nodes) instead of a bare refusal** (element; refusal only). _Done when:_ size, limit and the left-out count are shown.
- **42. Draw a file's own colors and sizes as a removable style layer** (element; unverified). _Done when:_ removing the layer restores the default.

### Advanced: for experts

- **43. Save the current steps as a recipe that names columns, never node ids** (element).
- **44. A column computed from an expression in the existing JMESPath dialect** (element).
- **45. Similar-name duplicate groups (IBM, I.B.M.), approved one at a time** (element).
- **46. A mapping table that translates ids between systems before a join** (element).
- **47. Configured sources (NDEx, Cypher, SPARQL, REST); credentials never in the project file** (both).
- **48. Remove one source, keeping elements another source also supplied** (element).
- **49. Project a two-mode graph onto one kind with a stated weighting** (element).

### Later: blocked on something else

- **50. Latitude, longitude and country roles.** Waiting for a map view; nothing reads a place yet.
- **51. Load only a time window, a neighborhood or the strongest ties.** Deferred because the too-large path covers the urgent half.
- **52. Union, intersection and difference of two named graphs.** Waiting for several graphs per project.
- **53. Earlier data versions, compared after Replace.** Waiting for the project file's version decision.

## Progressive disclosure for data

**First screen.** Every way in opens the Data page, which says the file stays in this browser. A
confident file shows its first rows, one line stating the mapping (from, to, weight and its role,
direction) with Change, and focus on Load. An uncertain file opens the per-column choices for the
uncertain columns only, each with its type and a count of values that do not fit. The load report
shows only nonzero lines. After loading, the Data place shows what loaded in plain words. The find
box and the condition card are always on the toolbar, Replace data is a visible control, and export
and autosave are always there. Inside a project, a second file offers Add, Add columns to nodes and
Replace with the match line visible before committing.

**One step in.** Ordered filter steps, the sources list, cleanup and duplicate offers (which appear
in the load report only when found), graph properties, time spans, column edits, re-mapping, cell
edits, saved items, export scope, the step list, subnetworks, event tables, gene lists, id lists,
edge joins, the too-large path and file styles.

**Expert.** Writing recipes, expressions, similar-name duplicates, id mapping tables, configured
sources, removing a source and projections.

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

The framework documents in `design/ui/framework/` (top tasks, graph conventions, element needs, task
flows, decisions) stay in force; this document applies them to data.

## Decisions for the owner

These are the only one-way doors. Everything else here is additive and can be built without
approval.

1. **Widen `ColumnRole` with a node or edge kind and a skip choice.** It is a closed union returned
   by `DraftColumn.suggested` (`graphty-element/src/session/types.ts`, line 1147). Adding members
   can break a consumer's exhaustive switch, so this is either a breaking change or a new open-union
   field beside it.
2. **Rename the published weight meaning "strength" to "similarity" and store the role on the
   attribute.** `design/ui/framework/graph-conventions.md` (line 88) already asks for it. It is
   breaking.
3. **The published filter-step shape: one kind of step or two.** Decision 25 in
   `design/ui/framework/one-way-doors.md` recommends one.
4. **What a project file records beyond the recipe format:** several sources and each element's
   source (decision 29), the saved step log (decision 9), and data versions and checkpoints
   (decisions 28 and 95).
5. **Whether a project holds several named graphs.** `design/documents/container.md` allows one
   data member today. Comparing graphs, kept subnetworks and data versions all depend on it.
6. **A measurement level per attribute, including a date kind** (decision 20). Column types and
   time roles depend on it.
