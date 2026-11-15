# Data flows, round 2: what to copy, what to avoid

Written by the interaction designer and the Figma product designer for the second round of data
mocks. It replaces round 1's pattern brief where they disagree.

## The structure every flow uses

- **Data panel** (left, like Figma's Layers/Assets side): owns ALL data configuration. Sections, each a
  Figma section title with "+" where the list grows: Sources, Nodes, Edges, Joins, Filters, Steps.
  A section with nothing in it is one title row with "+"; a section that does not apply is absent.
- **Property rows, not sentences.** One row = icon, label, value control (dropdown, chip, count).
  Example for a loaded edge list:
  `Source  [protein_a v]` `Target  [protein_b v]` `Weight  [score v]`. No "Nodes are named by...".
- **Warnings live on the row they are about**: a small warning icon at the row's right end with a
  count chip (`3 blank`, `12 duplicate`, `20 unmatched`); click opens a popover beside the panel
  with the fix. The section title shows the total (`Nodes  (!) 2`). No report page, no banner.
- **Context menus are doors, not homes.** Right-click a column row or a source row for quick changes
  (type, role, rename, replace, refresh, remove) -- the same words as the row's controls.
- **The table is view-only.** Sort, column width, hide a column in the table, search rows, and click a
  row to select its node or edge. Its header context menu offers view actions plus one door:
  "Edit in Data panel" (focuses that column's row). No types, joins, filters, export or warnings in it.
- **Counts before commit, Undo after.** graphty-element computes every count and match; the app
  draws numbers in chips. Act, then Undo (Figma), never a confirmation dialog except for loss.
- Every screen says **edges**. "Link" appears only in "Link prediction".

## 1. Loading a file and mapping columns

Copy:

- **Figma**: drop anywhere on the canvas; the result appears at once, then you adjust it in the
  panel. Add first, configure after.
- **Tableau data source page**: a type icon per column (Abc, #, calendar, globe), clicked to change --
  the most compact type control in any tool.
- **Cytoscape Import Network from File**: one click on a column sets its role (source, target, edge
  attribute, node attribute). Copy the guess-then-correct idea, not its modal dialog.
- **Gephi spreadsheet import**: guesses "Source"/"Target" columns by name, reads the rest as
  attributes. graphty already guesses roles in the element; keep that.
  Avoid: Cytoscape's and Gephi's multi-page wizards; round 1's question boxes ("Which column names
  the nodes?") and mapping sentences.
  graphty: drop -> graph drawn with the element's guessed roles -> Data panel shows the Edges section
  as role rows (Source, Target, Weight) and a column list (type icon, name, role chip). A role the
  element could not guess is the one row with an empty dropdown and a warning icon; nothing else asks.
  Large file: the source row shows a progress bar and `120k of 2.1M rows`; the element's estimate
  decides whether to draw a sample first. No separate flow.

## 2. Adding a second file: join is the default

Copy:

- **Tableau relationships**: drag a second table next to the first; Tableau guesses the matching
  field by name and draws the relationship; you fix the pair in a compact `field = field` row.
- **Power Query merge**: the live match count before OK ("The selection matches 380 of 400 rows").
  The count is the only reason anyone trusts a join; draw it as a chip `380 / 400 match`.
- **Cytoscape Import Table**: one dropdown, "Key column for network", default the node name.
  Avoid: Power BI's model view (a diagram editor for a job that is one row); Airtable linked records
  (the user wires every record).
  graphty: a second file dropped into a graph opens a **Join** row in the Joins section, already filled:
  `[genes.tsv]  onto  [Nodes v]  by  [symbol v] = [name v]  380/400`. The verb dropdown on the row
  offers the other intents -- Add nodes and edges, Replace data, Open as new graph -- and the element
  pre-chooses Add when the file has source/target columns. Unmatched rows are a warning chip on the
  join row (`20 unmatched`), its popover lists them. Joining onto edges uses the same row, keyed by
  edge id or by source + target.

## 3. Newer copy of the data: manual, two verbs

Answer to the owner: **manual, never automatic.** Automatic would change counts and results under an
analysis the reader is reading. No option for it (nobody asked).
Copy:

- **Tableau**: two separate commands -- Refresh (re-read the same source) and Replace Data Source
  (swap in another, worksheets kept, fields matched by name).
- **Figma library updates**: a dot on the item when an update exists, the user chooses when to take it.
  graphty: on the source row's menu, **Refresh** (same file handle, URL or query; a dot on the row when
  the element sees the source changed) and **Replace with file...** Both keep styles, runs, sets and
  notes by default -- that is the point of the verb -- and land as one undo step. After, the source row
  shows chips `+12  -3  ~40` (added, removed, changed) with a popover of the rows. Columns that no
  longer exist become warnings on the rows that used them. A dropped file the browser cannot re-read
  offers only Replace.

## 4. Connecting to a server, expanding, loading more

The three are different acts in different places; round 1 drew them alike.

- **Connect** (Sources "+" -> server): **Power BI Navigator** and **Neo4j Browser** are the model --
  Test runs the query and shows the first real rows or nodes, live, before Load. graphty: a compact
  form (Kind, URL, credentials, query) whose **Test** fills a 10-row preview grid and a count chip
  `2,340 nodes  8,912 edges`. Load draws them.
- **Expand** (on the canvas): **Neo4j Bloom** -- right-click a node, Expand, a submenu by edge type
  with counts (`CALLS 14`, `OWNS 3`). graphty: node context menu > Expand > by edge type, plus
  Expand 2 hops. One undo step per expand.
- **Load more** (on the source row): Bloom's result limit. graphty: the source row reads
  `500 / 12,400` with a **Load more** button; the limit is in the row's settings popover.
  Avoid: Bloom's natural-language search phrases as the only query path; a separate "server mode".

## 5. Filtering and selecting by condition

Copy:

- **Airtable view filter**: one line per condition, `[field v] [is v] [value]`, "+ Add condition",
  "+ Add group" for or. Already property rows; the best fit for the 240 px panel.
- **Cytoscape Select panel**: build a filter, then choose Select or Show/Hide.
- **Gephi** steppable query tree: sequential filters as a list -- copy the list, not the drag-and-drop tree.
- **Power BI filter pane**: the filter's scope is stated once at the top, not per condition.
- **Figma**: Select matching layers (right-click a node > Select matching > same color/type).
  Avoid: Gephi's tree drag; Kumu's selector syntax as the main path; Tableau's filter shelf.
  graphty: the one condition card in the Filters section: Airtable rows, the element's live `X of Y`
  chip, and a verb at the bottom (Select, Hide, Style these, Save as set). Two entry variants worth
  drawing: (a) "+" on Filters adds a blank condition row; (b) right-click a column row or a node > "Filter
  by this value" pre-fills one. Saved sets are rows under Filters. Time windows are one condition kind
  on a date column, `[date v] [between v] [Sep 1 - Sep 30]`, with a step arrow (Gephi's timeline, as
  a row).

## 6. Find: what the use cases actually are

Answer to the owner, from W01, W05, W06, W17: four different jobs, four homes.

1. **Find one node by name** -> the canvas search (Figma Ctrl+F, Bloom search bar): type, the node is
   selected and framed. Not a data feature.
2. **Search rows in the table** -> a search box in the table's header, Airtable-style: narrows the
   table's rows only, never the graph.
3. **Find everything matching a value** -> a condition (flow 5). Typing `score > 0.7` in the canvas
   search offers "Filter: score > 0.7", which opens the card.
4. **Read a selected node or edge's data** -> the inspector's data card. Exists already.
   None of these needs a "Find, then show only what matters" flow of its own; round 1's was 1 and 3 merged.

## 7. Cleaning and duplicates

Copy: **OpenRefine clustering** -- groups of values that look alike, a checkbox per group, one merge
button. Avoid: OpenRefine's facet sidebar as a separate workspace.
graphty: no cleanup flow. Duplicates and blanks are warning chips on the Nodes section or the column
row (`12 duplicate ids`); the popover shows the groups and a Merge button. One undo step.

## 8. Column types, roles and names

Answer: nothing special. Each column is a row in Nodes or Edges: type icon (click -> menu, Tableau),
name (double-click to rename, Figma layer rename), role chip (dropdown). Right-click the row for the
same three. A value that will not convert is a warning chip on the row (`1 blank`, `4 not a number`).

## 9. Steps list and recipes

Copy: **Power Query Applied Steps** -- a short list, each step with a gear (its settings popover) and x;
click a step to see the data as it was. **OpenRefine** Extract/Apply for sharing the list.
graphty: Steps section at the bottom of the Data panel, one row per load, join, filter, replace,
with icon, name and counts chip. "Save as recipe" lives in the section's menu; opening a recipe file
is a drop like any other.

## 10. Export

Answer: no data-specific export. **Figma's File > Export** and the panel's Export section are the
model: one Export dialog for the whole app, a format list that includes `Node table (CSV)`, `Edge
table (CSV)`, `Graph file (GraphML, GEXF, JSON)`, `Image`, `Recipe`, with a scope dropdown
(All / Selection / a saved set). The mock shows only how the data formats sit in that list.

## Real special cases, from the persona workflows

Kept only where the data shape, not the UI, is different:

- **Two node types from one event table** (fraud W06, recsys persona): one transactions file, account
  and merchant columns. Neo4j Data Importer's model -- each end of the edge gets a node type. graphty:
  the Edges role rows gain a type chip per end, `Source [account_id v] as [Account]`. Same rows, one
  more chip.
- **A gene list to a network** (W20): a server source whose query is a pasted list (Cytoscape's STRING
  app: species, confidence). Test returns `548 / 600 found` and the not-found list. Same Connect form.
- **Ids from different systems** (W20, W24): a join that matches poorly. The join row's warning
  popover says the key looks like a different id kind, from the element. Mapping ids is later.
- **Comparing two graphs** (W24): union, intersection, difference of named graphs (Cytoscape Merge
  Networks). Later tier; not drawn this round.
- **Time windows** (W19): a date condition, flow 5. **Very large files**: a source row state, flow 1.
  Not special: replace, fix a column, cleanup, find -- each is a normal flow above.

## Open parts to draw two ways

1. Data panel vs Data page: (a) the panel is the Data page's left side, table on the right; (b) the
   panel is a left panel beside the graph, the table a bottom drawer.
2. Entering a filter: (a) "+" on Filters; (b) "Filter by this value" from a context menu.
3. Replace keeping work: (a) keep everything, chips after, Undo; (b) a popover before Replace with
   three checkboxes (Styles, Analysis, Notes), all on.
