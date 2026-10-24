# Joining data sets: what other tools do and what graphty should do

Research notes for the data management prototype. The question is how a reader combines two data
sets in graphty: which kinds of joining matter for graphs, how six well-known tools present them,
and the design graphty should build.

## What the tools do

### Tableau

Tableau has four ways to combine tables.

- **Relationships** are the default. They appear as lines ("noodles") between tables on a canvas.
  The reader drops a second table beside the first, and Tableau picks matching fields or asks for
  them. Both fields must have the same data type, and several field pairs make a compound key.
  Nothing is merged up front: the tables stay separate, and Tableau builds the right join for each
  view at query time. The defaults (many-to-many, "some records match") keep every row from both
  sides. Tableau recommends relationships over joins.
- **Joins** live one level down. Double-clicking a table opens the join canvas. The reader drops a
  second table, clicks the Venn icon, picks the join type (Inner, Left, Right, Full outer) and
  writes clauses of the form field, operator, field. Clauses can hold calculations. Tableau warns
  that a join "can cause data loss or duplication if tables are at different levels of detail".
- **Unions** stack rows that share columns. A union adds Sheet and Table Name columns that say
  where each row came from, and these can be used as keys. "Merge mismatched fields" combines
  columns that are named differently.
- **Blends** apply per worksheet, are left joins only, and cannot be published. They are legacy.

Sources: https://help.tableau.com/current/pro/desktop/en-us/relate_tables.htm,
https://help.tableau.com/current/pro/desktop/en-us/joining_tables.htm,
https://help.tableau.com/current/pro/desktop/en-us/union.htm,
https://help.tableau.com/current/pro/desktop/en-us/multiple_connections.htm

### Power BI

- **Model relationships** are made in a Create relationship dialog: two table dropdowns, a click on
  a column in each data preview, then cardinality and cross-filter direction. Power BI fills these
  in itself and validates them while the reader chooses columns. Autodetect builds relationships at
  load from matching column names, but only "with a high level of confidence". The reader can also
  drag one column onto another in the Model view diagram. When neither side has unique values, it
  refuses with "One of the columns must have unique values".
- **Power Query "Merge queries"** shows the left table above the right table. The reader clicks
  the key column header in each, and Ctrl-click adds more key columns, numbered 1, 2 and so on. A
  line at the bottom of the dialog gives the estimated number of matches. A light bulb suggests
  column pairs. The join kind is a list of six (left outer, right outer, full outer, inner, left
  anti, right anti), and "Use fuzzy matching" is a checkbox. The result is one nested column, which
  the reader expands to pick the fields to bring in, with "Use original column name as prefix".

Sources: https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-create-and-manage-relationships,
https://learn.microsoft.com/en-us/power-query/merge-queries-overview

### Cytoscape desktop

- **Import Table from File** adds columns to an existing network. The reader chooses where the
  data goes (Target Table Data, a network or collection) and Import Data as (node, edge or network
  columns). The preview marks the table's key with a key icon, and the reader moves it from a
  column header's menu. That key must match the network's Key Column for Network. A table imported
  as Unassigned links itself to a matching network loaded later. This is the published protocol
  the genomics persona follows every session.
- **Merge Networks** (Tools, Merge, Networks) offers Union, Intersection and Difference over two
  or more networks. Matching Columns names the column that identifies the same node in each
  network, usually name. "How to merge columns" is a table of each source column, its column in
  the result and its type.
- **ID Mapper** is opened by right-clicking a column header and choosing Map column. The reader
  picks the species, Map from (for example Ensembl) and To (Entrez Gene), and the mapped ids
  arrive as a new column. The protocol says to "always use proper identifiers as your keys";
  symbols are "error prone".

Sources: https://manual.cytoscape.org/en/stable/Node_and_Edge_Column_Data.html,
https://manual.cytoscape.org/en/stable/Merge.html,
https://cytoscape.org/cytoscape-tutorials/protocols/identifier-mapping/

### Gephi

The Import spreadsheet wizard reads a nodes table (an Id column) and an edges table (Source and
Target columns). The import report then asks whether to open a new workspace or "Append to
existing workspace". Appending matches nodes by Id; without it the two tables land in separate
workspaces and never connect, which is a common beginner trap. There is no key-column choice and
no match report. The Data Laboratory has "merge columns" for combining columns after the import.

Sources: https://gephi.org/quickstart, https://archive.lists.launchpad.net/gephi.team/msg02570.html

### Kumu

Kumu reads one workbook with an Elements sheet (Label required, optional ID, Type) and a
Connections sheet (From and To required, optional Type). Connections name elements by label, or by
ID when labels repeat, and `a|b|c` in To makes several connections. The Type column, or one sheet
per element type, is how different kinds of thing are made. Kumu warns that re-importing "increase[s]
the chances of duplicating data".

Sources: https://docs.kumu.io/guides/import/import.md, https://docs.kumu.io/guides/import/excel-csv

### Neo4j Data Importer

The reader draws a model: each node gets a label, a file and an ID property, marked with a key
icon and guessed from a column with "id" in its name. Each relationship gets a type, a file and a
Node ID mapping that names the From and To columns for the start and end nodes. One file can feed
several labels; when a single file holds both ends, From and To are mapped automatically. Each
element shows a green check when it is fully mapped. Ids are scoped by label, so a 1 in the
Person file and a 1 in the Company file are different nodes. An older Neo4j blog post says id
mapping is out of scope.

Sources: https://neo4j.com/docs/data-importer/current/mapping/,
https://graphacademy.neo4j.com/courses/importing-fundamentals/2-data-importer/1-importing-nodes/

### What the tools have in common

1. **A key icon on a column header** marks the key in Cytoscape, Neo4j and Power Query. Choosing
   the key is a click on a header in a data preview, not a dropdown far from the data.
2. **A count of matches before committing**: Power Query's estimate, Power BI's live validation,
   Neo4j's green checks. Cytoscape and Gephi have none, and that is where their users get burned:
   silent misses, separate workspaces.
3. **The key is guessed** (Tableau, Power BI autodetect, the Power Query light bulb, Neo4j's "id"
   rule), and the reader is asked only when the guess is not confident.
4. **Business intelligence tools (Tableau, Power BI) keep tables separate and re-evaluate.** Graph
   tools write the values onto the graph. Graphty needs both: values on the nodes, so styles and
   algorithms can read them, and the table kept as a source with the join recorded as a rule, so
   reopening or replacing the file applies the join again (requirements item 9). This is
   Tableau's relationship idea, materialized.
5. **The common case gets a short path, the rare ones go behind a menu.** Power Query's six join
   kinds, Tableau's join canvas and Cytoscape's advanced merge panel are all one level down.
6. **The tools that model graphs (Neo4j, Kumu) make node kinds from the file or from a Type
   column,** and Neo4j scopes ids by kind.

## The kinds of joining that matter for graphs

| #   | Kind                                                           | Example                                                                                               | Who needs it                                                                         | How often                             | Prior art                                                                  |
| --- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- | -------------------------------------------------------------------------- |
| 1   | Values onto nodes by a key column                              | an expression table (logFC, padj) onto STRING proteins by gene symbol; a revenue table onto suppliers | genomics and bioinformatics (every session, blocking), supply chain, marketing, Alex | most common                           | Cytoscape Import Table; Power Query left outer merge; Tableau relationship |
| 2   | Values onto edges, by edge id or by the source and target pair | contract values onto `ships_to` edges                                                                 | supply chain, fraud                                                                  | occasional                            | Cytoscape "Import Data as edge columns"                                    |
| 3   | Edges between nodes the graph already holds                    | `ships_to.csv` after `suppliers.csv`; a transactions file after an accounts file                      | supply chain, fraud, intelligence, Kumu-style users                                  | common                                | Gephi append; Kumu Connections sheet; Neo4j relationship From/To mapping   |
| 4   | The same thing from two sources becomes one node               | STRING plus BioGRID; two case files that both name the same person                                    | bioinformatics, knowledge engineer, intelligence                                     | occasional, essential for those three | Cytoscape Merge Networks (union by matching column); Tableau union         |
| 5   | Different sources become different kinds of node               | people.csv and companies.csv, or accounts and devices, joined by an edge table                        | fraud, cybersecurity, intelligence, knowledge engineer, recommender engineer         | common for them                       | Neo4j labels per file; Kumu Type or one sheet per type                     |
| 6   | Matching through an id-mapping table                           | symbol to Ensembl before kind 1; CRM id to billing id                                                 | genomics, bioinformatics, knowledge engineer                                         | rare, but blocking when needed        | Cytoscape ID Mapper; Power BI "intermediary table"                         |
| 7   | Rows of the same shape added (a new month)                     | October transactions after September                                                                  | Alex, supply chain, security                                                         | common                                | Tableau union; already covered by Add and by Replace (round 2, option A)   |
| 8   | Set operations on two graphs (union, intersection, difference) | tumor against normal network                                                                          | genomics, bioinformatics                                                             | rare                                  | Cytoscape Merge Networks; requirement 56                                   |

Kinds 1, 3 and 5 are the everyday ones. Kinds 1 and 3 are the same act seen from two sides: the
new file's key column matches the graph's node ids. For kind 1 the file holds one row per node;
for kind 3 it holds two key columns per row (source and target). The element can tell which from
the file's shape and the overlap counts, so the reader should not have to choose a "join type".

Kind 4 is kind 3 with nodes in the new file as well, plus a rule for clashing values. Kind 6 adds
one step in front of kind 1. Kinds 7 and 8 already have homes (Add, Replace, the Graphs switcher)
and need no join UI.

Nothing in the personas needs SQL's inner, right or anti joins as join kinds. "Keep only matched
nodes" is a filter, which the data cards already do: with a "has a value from expression.csv"
condition, or "data source is ...". Exposing six join kinds would import a database idea into a
graph tool for nobody.

## What graphty-element has today

- `session.data.import(source, { mode: "merge" })` adds a file to the graph and matches node ids
  exactly. `duplicateIds: "first" | "merge" | "refuse"` decides repeats, and the load report counts
  edge rows that name no node ("unmatched"). This covers kinds 3 and 4, but only when the ids are
  spelled the same, and with no key choice and no report of what matched.
- `session.data.prepare()` returns a load draft (`draft.ts`) that reads one node table and one
  edge table per load ("several of a kind wait for joins").
- There is no join onto existing nodes (issue #298) and no edge join. Nothing records which source
  each node or value came from, so the data cards cannot offer a "data source" condition. There is
  no mapping table and no "match ignoring case".

## Recommended graphty design

### Model (graphty-element, additive)

1. **One join verb, previewed through the existing draft.** `session.data.prepare(source, { onto:
"graph" })` returns a draft that already knows the graph. `draft.suggestJoin()` returns the
   guess: which file column matches which node column (or the node id), whether rows are values
   for nodes, edges between nodes, or new nodes, and the counts. `draft.report(choices)` returns
   neutral facts: `matched`, `rowsNotInGraph`, `nodesWithoutValue`, `repeatedKeys`, `extraIfCaseIgnored`,
   `extraIfSpaceIgnored`, `newNodes`, `newEdges`, `clashingColumns`. These are codes and numbers,
   never sentences. `draft.load(choices)` commits the join as one undo step.
2. **The joined table stays a source, and the join is a recipe command** naming its key columns,
   match options and mapping table (requirements 14, 45, 52 and 58, and item 9). Reopening,
   Refresh or Replace applies the join again and reports new counts.
3. **Provenance on every element.** Each node and edge records the sources that supplied it, and
   each column records its source. This gives the data cards a "data source" condition (shown only
   when two or more sources are loaded) and the column header its origin icon. It also lets
   requirement 54 (removing one source) keep what another source also supplied.
4. **Kind per source, and ids scoped by kind on request.** A source, or an endpoint column of an
   edge table, can carry a kind (default: none). When two node sources both have a kind, the join
   report counts the ids they share, and the reader chooses whether a shared id means the same
   node (Cytoscape and Gephi do this) or two different nodes (Neo4j does this). This is a choice,
   so it is an option with a neutral default: the same node, as today.
5. **Clash rule per column** when a node already has a value: keep, overwrite, or keep both as
   `name (file)`. The default is to keep both as a second column, so nothing is lost silently.

### UI (graphty app)

**Entry.** A second file dropped or added while a graph is open opens the data table dock
maximized, in join mode. Round 2's three-choice card goes away; the element's suggestion has
already decided the most likely action. A verb dropdown on the commit button holds the rare
alternatives: `Join` (default), `Open as a separate graph`, `Replace data`.

**The join view: full screen, two tables side by side.** It is full screen because the key choice
depends on seeing values (Power Query, Cytoscape and Power BI's newer dialog all show previews),
and on a narrow sidebar the reader is choosing blind. It is not a "noodle" canvas: graphty
projects have two or three sources, not a star schema, so a model diagram would add a concept for
no gain.

```
+ [doc] expression.csv  ->  [node chip] Nodes                                    [Cancel] [Join v]
| Match  [gene_symbol v]  =  [preferredName v]     [Aa] ignore case   [_] ignore spaces   [map v]
| (318 matched) (22 not in graph [Show]) (6 nodes, no value [Show]) (! 1 repeated key [Show])
| (+19 ignoring case [Use])
+----------------------------------------+-----------------------------------------------------+
| Graph nodes                            | expression.csv                                      |
| [key] preferredName | degree | ...     | [key] gene_symbol | [+] logFC | [+] padj | [-] note  |
| TP53                | 41     |         | TP53              | 2.1       | 0.001    |           |
| ... rows that match first; unmatched rows tinted; ghosted new columns appear on the left ...  |
+----------------------------------------+-----------------------------------------------------+
```

- **The key is chosen on a header.** Clicking a header and choosing "Match on this" in its context
  menu (the same header menu as the data table, with one more item) moves the key icon there, on
  either side. The Match row above repeats the choice as two dropdowns for keyboard use. Compound
  keys are a second Match row through `+`, the Power Query numbering idea; rare.
- **Match chips** are the report, live. Each chip with a `[Show]` filters the preview to those
  rows. `+19 ignoring case [Use]` is the one-click fix and turns on the Aa toggle. A repeated key
  is a warning icon whose details show on hover, with `Keep first`, `Keep both` and `Ignore` (the
  owner's rule: every fix has an ignore). There are no multi-level menus.
- **Bringing in columns** uses each incoming header's include toggle (`+` or `-`) and the existing
  header context menu (type, role, rename, hide). A clashing name shows the clash icon; its hover
  offers the clash rule.
- **Mapping table (kind 6)** is the `[map v]` dropdown: `None`, the loaded tables, `Add mapping
table...`. It is shown only once a mapping table is loaded, or from the overflow, so the common
  path does not see it.
- **An edge file (kind 3)** shows the same view with two key icons: Source matches, Target
  matches. The chips read `(62 edges added) (26 new nodes) (14 nodes updated) (3 rows, no end)`.
  Source and target are the special-field roles from the sidebar, so this is the same concept, not
  a new one.
- **Kinds (kind 5)**: a `Kind` property row under the source name (`[none v]`, or type a kind),
  and for an edge table one per endpoint (`Source kind`, `Target kind`). When the report finds
  shared ids across kinds, it shows a chip `(42 ids in both people and companies)` with
  `[Same node | Different nodes]`.
- **After the join:** the source list in the left sidebar shows `expression.csv` as a row
  indented under the graph it joined, with a link icon and `318/340`. Clicking it reopens the join
  view, and its context menu has Edit join, Refresh, Replace and Remove. Joined columns carry the
  "joined" origin icon in the table header. Undo reverses the whole join in one step.

### "Several kinds of node from one event table": data, not styling

This should be a data feature, an endpoint kind at load. Styling cannot do it: in an event table
`user, ip, timestamp`, the value `10.0.0.5` in the ip column and a user id that happens to read
`10.0.0.5` must be different nodes, or the graph is wrong before any style runs. Kinds also decide
ids, which only the data layer controls. Once a node has a kind, it is an ordinary attribute:
styles color it, and the data cards filter by it. The reader knows the kinds because they are the
column names (`user`, `ip`), which Neo4j's importer and Kumu's sheet-per-type confirm is how
people already think about them. The default stays "no kind" (one id space), so a reader who never
opens the row sees today's behavior.

### Progressive disclosure

| Shown immediately                                          | One click away                                                                  | Behind a menu                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| The suggested key pair, match chips, include toggles, Join | Show buttons, the "ignoring case" fix, repeated-key fixes, clash rule, Kind row | Mapping table, compound key, Open as separate graph, Replace, set operations (Graphs switcher) |

## Not recommended

- Six SQL join kinds, or Tableau's Venn picker. Graph readers never asked for them, and filtering
  covers "matched only".
- A relationship or "noodle" canvas. It is too much machinery for two or three sources.
- Blends, or joins that are not written onto the nodes. Styles and algorithms need the values on
  the nodes.
- Fuzzy matching beyond case and spaces. Similar-name merging is its own flow (requirement 51),
  approved group by group, not a join option.
