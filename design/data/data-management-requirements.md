# Data management requirements

Status: proposed, 2026-10-19. This document ranks what the graphty app and graphty-element must
do to get data into a graph and keep it in shape. It covers loading several sources (files, and
network sources such as databases and web APIs), combining them, setting column roles and types,
filtering, cleaning, and repeating the same steps on new data. It also decides which of those jobs
belong on the first, always-visible layer of the app and which wait one step in, and it records
what a saved project file holds.

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

These are the 14 design personas in `design/designloom/personas/` that have data jobs in the app.
They are design hypotheses, not measured users, and the design-studio results cited later come
from simulated sessions. Where persona evidence and competitor products disagree, the competitors
break the tie.

| Data job                              | Personas who do it | Every session for                                        | Blocking for                                                 |
| ------------------------------------- | ------------------ | -------------------------------------------------------- | ------------------------------------------------------------ |
| Load one file                         | 13 of 14           | 9 personas, from explorer to lab researcher              | all but knowledge engineer                                   |
| Filter or hide                        | 12                 | analyst, expert, fraud, intelligence, security, genomics | analyst, security                                            |
| Export data                           | 11                 | genomics, recommender                                    | expert, marketing, recommender                               |
| Check what loaded                     | 10                 | explorer, analyst, expert, genomics, knowledge engineer  | analyst, knowledge engineer                                  |
| Set id, source, target, weight        | 10                 | security, recommender, lab researcher                    | explorer, analyst, supply chain, recommender, lab researcher |
| Join a table onto nodes               | 9                  | genomics                                                 | genomics, bioinformatics                                     |
| Repeat steps on new data              | 9                  | --                                                       | -- (often for five)                                          |
| Set time, kind, place                 | 9                  | fraud, security                                          | --                                                           |
| Preview before loading                | 8                  | explorer, analyst, knowledge engineer, lab researcher    | genomics, lab researcher                                     |
| Select by condition                   | 8                  | explorer, fraud, intelligence, security                  | fraud                                                        |
| Node table plus edge table            | 8                  | --                                                       | supply chain                                                 |
| Add a second file                     | 7                  | --                                                       | intelligence, knowledge engineer                             |
| Fix a column's type                   | 7                  | --                                                       | --                                                           |
| Replace with newer data               | 6                  | --                                                       | supply chain                                                 |
| Load from a server or list of ids     | 6                  | genomics, knowledge engineer, security                   | genomics, knowledge engineer                                 |
| Expand a neighborhood from the server | 6                  | fraud                                                    | fraud                                                        |
| Merge duplicate nodes                 | 6                  | knowledge engineer                                       | knowledge engineer                                           |
| Merge or compare two graphs           | 5                  | --                                                       | --                                                           |

The jobs in the bottom third of the table are rare for most personas but blocking for one or two
specialists. That is the shape progressive disclosure is for.

For five personas the data is not a file at all, so connecting to their source is a primary job
even though it is rare across the whole set. Genomics starts from a gene list and pulls the network
from STRING; the knowledge engineer queries databases of 10,000 to 10,000,000 nodes that must stay
current; cybersecurity builds graphs from SIEM events; fraud starts each of 50 or more daily alerts
from one account and views its neighborhood; intelligence begins from seed entities and expands
them. The evidence appendix, section C, quotes the persona files.

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
The table is saved as a source and the join as a recipe command naming the key columns (see "What a
project file records", item 9). _Test:_ a 340-row table joined by symbol reports 318 matched, 22 not
in the graph, TP53 matching 2 rows, and "19 more match ignoring case [Use]".

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
and what happens to them. The change is a recipe command and is saved in the graph's columns
schema. _Test:_ an amount column with one "N/A" among 500 numbers loads as a number with "1 blank".

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

**22. Apply a recipe someone gave you** (both; no). One command applies it. Columns bind by role
and then by name, the reader confirms only weight roles and mismatched measurement levels,
everything unbound is listed before anything runs, and one undo reverses it. _Test:_ a recipe
needing `padj` on a table without it lists "column padj not found" before any step runs.

#### Primary for readers whose data lives on a server

Requirements 23 to 27 are first-layer jobs for the five server-data personas above. graphty-element
can already do each of them; the app cannot yet. Its "Open network data" dialog
(`graphty/src/workspace/start/NetworkDataDialog.tsx`) lists NDEx, Neo4j and a web API as "on the
way" and opens only a graph file at a web address.

**23. Connect to a source and test the connection** (both; element yes, app no). The reader picks a
source, fills in fields drawn from its descriptor (endpoint, database, sign-in), and tests it before
loading. The test answers in neutral facts: reachable, sign-in accepted, and why not. The app draws
one form for every source and builds no client. Built in: NDEx, Cypher (Neo4j, Amazon Neptune) and
a REST mapping for any JSON API; no SPARQL source yet. _Test:_ a Neo4j endpoint with a wrong
password reports a refused sign-in before any data loads.

**24. Choose what to load: browse or query** (both; element yes, app no). Search a repository and
pick (an NDEx network by name), write a database query, or fill a web API's parameters. The load is
one undo step. _Test:_ an NDEx search for "TP53" lists networks with their counts, and choosing one
draws it.

**25. Expand a node's neighborhood from its source, and collapse it** (both; element yes, app no).
The reader fetches a node's neighbors to a chosen depth, direction and relationship type, with a
limit on new nodes. Each node says whether it has more to show. Collapse removes only what that
node's expansions added. _Test:_ expanding one Neo4j account with a limit of 50 adds at most 50
nodes and marks it "partial"; collapse restores the graph; each is one undo step.

**26. A query that returns too much says what it left out and offers More** (both; element yes, app
no). Every load and expansion takes size limits the app sets; the element picks none. A capped load
reports the cap it reached and whether more remains, and "Load more" fetches the next page.
_Test:_ a query matching 40,000 nodes under a 5,000-node limit loads 5,000 and one "Load more" adds
the next page.

**27. A reopened project asks before it queries, and asks for sign-in only when it must** (both;
element yes, app no). A reopened project shows its saved rows offline and runs no query by itself,
because a shared file could otherwise run a stored query against a database on the reader's
machine. The reader approves each waiting load. A password is never in the file; a remembered
credential is found by source and origin. _Test:_ a saved Neo4j project reopened in a new browser
shows its graph, fetches nothing until approved, and the saved file holds no password.

### Secondary: one step in

- **28. Filters become an ordered list of steps once there are two, each switchable and showing what it removed** (element; no). _Done when:_ switching off step 1 restores its elements; both steps survive reopening.
- **29. Sources list with counts, each naming its file, URL or source and query; once there are two sources, an element's details name its source** (element; partly: network loads are listed with their query and each node carries `_source.loads`; file loads are not listed yet). _Done when:_ two files and one Neo4j query list three sources; an edge names its source.
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
- **43. Paste a gene list, pick species and confidence, get the STRING network** (both; element partly: the STRING mapping loads from a list and a species but reports no found and not-found counts; app no). _Done when:_ "287 found, 13 not found".
- **44. Import a list of ids (or a GMT file) as a saved set** (element; no). _Done when:_ "47 matched, 3 not in graph".
- **45. Join a table onto edges by edge id or by source and target** (element; no). Saved like a node join: the table is a source, the join a recipe command naming its key columns. _Done when:_ "380 of 400 edges matched".
- **46. A file over the drawing limit offers a way through (busiest N nodes) instead of a bare refusal** (element; refusal only). _Done when:_ size, limit and the left-out count are shown.
- **47. Draw a file's own colors and sizes as a removable style layer** (element; unverified). _Done when:_ removing the layer restores the default.
- **48. Refresh a source load: say whether the source changed, re-run its query and expansions, and apply only the difference as one undo step** (element; no). _Done when:_ an NDEx network edited upstream reads "changed", and a refresh reports nodes added, removed and updated.

### Advanced: for experts

- **49. Save the current steps as a recipe that names columns by role or name, never node ids** (element).
- **50. A column computed from an expression in the existing JMESPath dialect** (element).
- **51. Similar-name duplicate groups (IBM, I.B.M.), approved one at a time** (element).
- **52. A mapping table that translates ids between systems before a join** (element). The mapping table is itself a source, and the join records which table it used (item 9 below).
- **53. A new source with no code: a REST mapping for any JSON API, or a custom source an extension registers** (element; yes: the `rest` source and `registerSource` in `./extend`; app no).
- **54. Remove one source, keeping elements another source also supplied** (element; no).
- **55. Project a two-mode graph onto one kind with a stated weighting** (element).
- **56. Union, intersection and difference of two named graphs** (element; no). The result is its own named graph plus a recipe command naming its inputs and the operation, so it can be rebuilt (item 9 below).
- **57. Earlier data, compared after Replace** (element; no). After Replace the earlier data stays as another named graph ("September") and is compared with requirement 56; there is no separate versioning.
- **58. Match nodes across graphs or tables** (element; no). By a key column with its id system, or through an id-mapping table. The project stores the rule and recomputes the matches on open, with matched and unmatched counts; it never stores matched pairs. Joins (14, 45), mapping tables (52) and set operations (56) all use it. _Done when:_ a tumor and a normal network matched by Ensembl gene report "4,210 matched, 37 only in tumor", and the same counts return after reopening.

### Later: blocked on something else

- **59. Latitude, longitude and country roles.** Waiting for a map view; nothing reads a place yet. The place role is already in the file format, so files saved now keep it.
- **60. Load only a time window or the strongest ties from a file.** Deferred because the too-large path covers the urgent half; for network sources, size limits and expansion already load only part.

## Progressive disclosure for data

**First screen.** Every way in opens the Data page, which says the file stays in this browser. A
confident file shows its first rows, one line stating the mapping (from, to, weight and its role,
direction) with Change, and focus on Load. An uncertain file opens the per-column choices for the
uncertain columns only, each with its type and a count of values that do not fit. The load report
shows only nonzero lines. After loading, the Data place shows what loaded in plain words. The find
box and the condition card are always on the toolbar, Replace data is a visible control, and export
and autosave are always there. Inside a project, a second file offers Add, Add columns to nodes and
Replace with the match line visible before committing.

**First screen for server data.** "Open network data" sits beside Open. It lists the registered
sources, draws each one's fields from its descriptor, and offers Test before Load. Once a graph came
from a source, a node's menu offers Expand and Collapse, a capped load offers Load more, and a
reopened project lists its waiting loads to approve.

**One step in.** Ordered filter steps, the sources list, cleanup and duplicate offers (which appear
in the load report only when found), graph properties, time spans, column edits, re-mapping, cell
edits, saved items, export scope, the step list, subnetworks, event tables, gene lists, id lists,
edge joins, the too-large path, file styles and refreshing a source load.

**Expert.** Writing recipes, expressions, similar-name duplicates, id mapping tables, matching
nodes across graphs, defining a new source, removing a source, projections, and set operations and
comparisons across named graphs.

**The one condition card.** A filter, a style layer's target, a saved set and an algorithm's or
export's scope are one card of conditions that must all hold, with "X of Y" counted by the element,
ending in a verb: Select, Hide, Style these, Save as set, or Run on these. It needs requirement 3's
single element shape, or the app would have to translate it into three.

## What competitors teach, and what this supersedes

Competitor products shaped these requirements: let the reader point at columns instead of
demanding fixed headers; make a join say why it matched nothing before it commits; fix a type on
the column itself; prefer two plain verbs to three subtle ones; offer cleanup only when the data
needs it; bind recorded steps by column role or name, never by position; and keep one filter card
first, because ordered filter trees confuse newcomers. Several earlier designs are replaced or
updated by this one. Both lists, with their sources, are in the evidence appendix, section J.

## Decisions

The root `CLAUDE.md` gives additive API changes to the team and keeps for the owner only breaking
changes and formats that are published to consumers. The owner has settled the one format question
this plan raised; the rest is decided here.

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
    - Standard keywords carry the type, `format` (date-time, date, duration, uri), `enum`, and
      title and description.
    - The graphty vocabulary carries: the column's role; the weight's meaning (distance,
      similarity, capacity, unknown) and whether higher means stronger; the id system (Ensembl
      gene, UniProt, email); the time kind (instant, start, end, duration); precision; the original
      format and time zone, so an export writes the values back as they came; the measurement
      level, including ordered categories; a unit or currency; the missing-value markers seen on
      import; a multi-valued separator; and the keys used to match nodes across graphs or tables.
    - Values in the data are stored normalized: ids as strings, numbers as numbers, times as ISO
      8601 in UTC, lists as arrays, blanks as missing.
    - A column with no recorded role is inferred on open, as today.
    - Node positions stay with the layout, and a file's own colors and sizes stay a style layer;
      neither is a column role.
    - Recipes refer to columns by role, so a recipe survives renamed columns. Each column change a
      person makes is also a recipe command, so applying a recipe to new data reproduces the
      types.
9. **Joins between graphs.**
    - A table joined onto a graph: the table is a source, and the join is a recipe command naming
      the key columns (requirements 14 and 45).
    - A graph derived from others (union, intersection, difference) is its own named graph plus a
      recipe command naming its inputs and the operation, so it can be rebuilt (requirement 56).
    - Matching nodes across graphs: the project stores the rule (a key column with its id system,
      or an id-mapping table that is itself a source) and recomputes matches on open. It never
      stores matched pairs (requirements 52 and 58).

The column roles and what the columns member records for each:

| Role                     | Recorded besides type and format                          | Stored as                           |
| ------------------------ | --------------------------------------------------------- | ----------------------------------- |
| node id                  | id system; whether it is a key for matching across graphs | string                              |
| edge source, edge target | id system of the node ids they name                       | string                              |
| edge id                  | id system                                                 | string                              |
| weight                   | meaning; whether higher is stronger; unit                 | number                              |
| time                     | time kind; precision; original format and time zone       | ISO 8601 in UTC; durations ISO 8601 |
| label                    | --                                                        | string                              |
| kind                     | the kinds (`enum`)                                        | string                              |
| category                 | the categories (`enum`); whether they are ordered         | string                              |
| place                    | original format; precision                                | string or number, as its type says  |
| link                     | --                                                        | string, `format: uri`               |
| image                    | --                                                        | string, `format: uri`               |

Any column, with a role or none, can also record a unit or currency, missing-value markers and a
multi-valued separator (stored as an array).

**Why JSON Schema rather than Frictionless Table Schema.** Values are already stored normalized, so
Table Schema's rules for parsing raw text are not needed. The document file already uses JSON
Schema, so the whole file has one schema language, and standard validators check embedded data
against it. graphty's own meanings need a vocabulary in either language. A Table Schema that comes
with a CSV (a `datapackage.json` beside it) is read by graph-io at import and mapped into the
columns member; graphty never writes one.

**What cannot change once files are saved.** The vocabulary's keyword names and the shape of the
sources record are read forever once files exist. Each needs a written spec and conformance cases
(rows of `design/documents/conformance.md`) before graphty-element ships it.

### Decided here

These are additive, so the team decides them; each lands without the owner's approval.

1. **Column roles gain a node or edge kind and a skip choice by a new field, not by widening
   `ColumnRole`.** `ColumnRole` is a closed union that `DraftColumn.suggested` returns, so a new
   member would break a consumer's exhaustive switch. `DraftColumn` gains a field typed as an open
   union (`ColumnRole` plus `"kind"`, `"skip"` and any string), and the table mapping gains optional
   `kind` and `skip` entries. Widening `ColumnRole` itself can ride in the grouped graphty-element
   major the owner has on hold.
2. **A date is a time measurement with an optional unit and format, not a new kind.** `Measurement`
   is already an open union that includes `"time"`, and optional fields on a measurement
   declaration break nothing. Column types and time roles (requirements 17 and 33) need it now.
3. **The weight meaning "similarity" is accepted beside "strength".** Every input accepts both,
   values read back keep saying `"strength"` so no consumer's switch breaks, and `"strength"` is
   deprecated and replaced in the next planned graphty-element major.
   `design/ui/framework/graph-conventions.md` (line 88) asks for the clearer word.
4. **Ordered filter steps take one kind of step.** The published API has one filter per session
   (`session.visibility.filter`) plus one time window, and no `FilterStep`, so the list of steps is
   a new shape. The team takes decision 25 of `design/ui/framework/one-way-doors.md`: one kind,
   every step bounding every computation. Steps are saved as recipe commands.
5. **Network-source limits default to none in the element and are set by the app**, because the
   right cap depends on the consumer's screen and machine.
