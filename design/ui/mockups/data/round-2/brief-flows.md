# Data management, round 2: the flows to design for

Written by the user advocate for the second round of data mocks. It re-derives the data flows
from the documented use cases (`design/designloom/workflows/*.yaml`) and the persona files, keeps
only the ones that are really distinct, ranks them, and says for each who does it, how often,
what starts it, what the real app makes them do today, what they need, how it ends, and the data
to draw it with.

Rules every flow below follows (from the owner's review of round 1):

- The word is **edges**, never links (the app says "Edge table", "34 nodes, 78 edges").
- **No sentences as UI.** Needs are written as property rows (label + value), chips, counts,
  dropdowns, status icons and context menus. Where a flow says "shows X", draw it as a row or a
  chip, not a line of prose.
- **One data configuration panel owns all data configuration**: sources, each column's type,
  role and name, warnings, joins, filters. **The table is view-only**: it shows rows, follows the
  selection and the filter, sorts. It holds no conditions, joins, export or column fixes.
- **Quick changes go in context menus** (a source row, a column row, a node on the canvas).
- Save and export are the app's common Save / Export, not a data feature.

## What the use cases say, and what was dropped

Every documented use case that touches data, and where it went:

| Use case (file)                                      | Data step it needs                              | Flow          |
| ---------------------------------------------------- | ----------------------------------------------- | ------------- |
| Data import and validation (W18), onboarding (W14)   | open, detect, map, preview, check               | 1, 2          |
| Quick data assessment (W01)                          | size, structure, attributes, types              | 2             |
| Overview to detail (W02), anomaly (W12), hub (W17)   | filter by a value, details on demand            | 3             |
| Gene list to network with expression (W20)           | gene list in, keep connected part, join table   | 7, 9, 4       |
| Drug target discovery (W08)                          | merge PPI + experiment, module subnetwork       | 4, 9          |
| Criminal network (W09)                               | merge records, resolve duplicates, time frame   | 4, 2, 10      |
| Knowledge graph construction (W13)                   | several sources, match ids, merge duplicates    | 4, 8, 2       |
| Iterative analysis (W03), network evolution (W19)    | newer copy, time windows                        | 5, 10         |
| Threat hunting (W07)                                 | event log, query, refine, narrow scope          | 6, 8, 9       |
| Fraud ring (W06)                                     | one-account neighborhood, expand                | 8, 3          |
| Recommendation (W16)                                 | user-item graph from an interaction log         | 6             |
| Enrichment map (W22)                                 | cutoff sliders to thin the map                  | 9             |
| Condition comparison (W24)                           | two networks, union / intersection / difference | 11            |
| Findings (W15), publication (W25), influencers (W10) | export tables and figures                       | common Export |

Dropped as separate flows, and why:

- **"Find, then show only what matters"** was two things. _Find_ (go to one node I know by name)
  is the toolbar's find box, which already exists; selecting a node shows its data card in the
  inspector, which also exists. Neither is data configuration. _Show only what matters_ is
  filtering, which is flow 3 and flow 9.
- **"Take the numbers out"**: the common Export ("Save a picture and the numbers") already writes
  the node table as CSV. Data adds nothing special; the only data rule is that an export says
  whether it holds all nodes or only the filtered ones.
- **"Fix a column: type, role, name"**: not a flow. It is a column row in the data configuration
  panel (dropdowns for type and role, the name editable in place) plus the warning that points
  at it. Part of flow 2.
- **"Clean up what the load report found"**: the warnings section of the panel, part of flow 2.
  Merging spelling variants of one id ("Acme", "ACME", "Acme ") is a warning row with a Merge
  action, not its own screen.
- **"Repeat last month's steps"**: for the readers who do it (Alex, supply chain, security), it
  is Replace with "keep my work" (flow 5). A recipe file from a colleague stays later work.
- **Very large files**: a state of flows 1 and 6 (an estimated count, progress), not a flow.

## The flows, ranked

Key flows (first screen, zero or one click): 1 to 5. Special cases (a few clicks): 6 to 11.

| Rank | Flow                                                         | Kind    | Who, how often                                                                     |
| ---- | ------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------- |
| 1    | Open my file and get a right drawing                         | key     | 13 of 14 personas, every session that is not a sample                              |
| 2    | See what loaded, fix what is wrong                           | key     | every load; blocking for Alex, knowledge engineer, intelligence                    |
| 3    | Filter: show only nodes and edges that match                 | key     | 12 personas, many times a session                                                  |
| 4    | Join a second file onto this graph                           | key     | genomics and bioinformatics every session; intel, supply chain, knowledge engineer |
| 5    | Replace with a newer copy, keep my work                      | key     | Alex weekly, supply chain monthly, security, marketing                             |
| 6    | One event table, several kinds of node                       | special | security, recommender engineer, fraud, intelligence; every session for them        |
| 7    | Gene list to a network                                       | special | genomics, bioinformatics; most sessions for them                                   |
| 8    | Query a database, load more, expand a node                   | special | knowledge engineer, fraud (50 alerts a day), security, intel                       |
| 9    | Filter steps: several conditions, connected part, saved sets | special | Alex, fraud, security, genomics, enrichment map                                    |
| 10   | Time window                                                  | special | Alex, intel, fraud, security, bioinformatics                                       |
| 11   | Combine two networks                                         | special | genomics and bioinformatics (condition comparison), intel                          |

---

## Key flows

### 1. Open my file and get a right drawing

- **Who:** everyone with a file. Elena (a CSV from a product tool), Alex (a relationship
  spreadsheet, weekly), genomics (a STRING TSV), supply chain (a supplier and a shipment table).
  W01, W14, W18.
- **Trigger:** drop a file on the start screen or canvas, Open, paste, or a web address.
- **Today:** "Open project or file..." or "New from data..." opens the Data page "Open as a new
  graph": a preview grid with a role menu over every column (Key, Name, From -> node, To -> node,
  Weight, Time, Edge id, Attribute), "Each row is", Direction "As the file says", a weight line,
  "Import styles from the file", a match report. One Enter loads a clean file. Goes wrong: the
  name column is often not guessed (19 of 21 failed to name nodes in one study); a count column
  loads as Attribute with no weight; every column's menu is shown even when every guess is sure.
- **Needs:** a compact mapping in the panel, one property row per role, each a dropdown with the
  guessed column: `Node id [gene_id v]`, `Name [preferredName v]`, `From [protein1 v]`,
  `To [protein2 v]`, `Weight [combined_score v]` with a small "higher = stronger" toggle chip,
  `Direction [Undirected v]` only when the file does not say. A header chip with the counts
  (`318 nodes`, `1,104 edges`). Only a role the app is unsure of is marked (a status icon on its
  row). Everything else is a column list with a type icon each, collapsed. Load is focused. A
  project, style or recipe file opens as itself, not as data.
- **End state:** the graph is drawn, nodes carry their names, a clean file took zero choices.
- **First failure to draw:** a CSV where the name column and the weight are both unsure (two
  rows marked, the rest quiet).
- **Fixture:** clean: `cat-social-network.json`, 20 nodes, 29 edges, no warnings. Unsure:
  `ovarian_de_string.tsv`, 318 nodes, 1,104 edges, weight `combined_score` 0.4 to 0.99, name
  `preferredName`.
- **Large-file state:** `security-events-120k.csv` while loading: `about 120,000 nodes`, progress
  `48,000 (40%)`, `312k edges so far`, `about 12 s left`; exact 120,418 / 1,104,206 at the end.

### 2. See what loaded, fix what is wrong

- **Who:** Elena ("what is this?"), Alex (a wrong import spoils every answer), Emma, genomics,
  knowledge engineer, intelligence (duplicates across records). W01, W09, W13, W18.
- **Trigger:** the first drawing; or a filter that matched nothing; or a warning icon.
- **Today:** the Data place lists Sources and Attributes, each attribute with a type glyph whose
  word is only in a tooltip. No count of parts, no percent filled, no "from the file or from a
  run" (file values and run results looked the same 12 of 12). A column's role can be set only on
  the Data page before loading; after loading nothing on a column can be changed.
- **Needs (all in the data configuration panel):**
    - Summary rows: `Nodes 200`, `Edges 612`, `Directed`, `Parts 1`, kinds as chips
      (`96 accounts` `48 devices` `34 phone numbers` `22 merchants`).
    - A **Warnings** section, present only when there is one, one row per type with its count and
      one action: `Repeated pairs 5 [Combined: sum v]`, `Edges without amount 14 [Show]`,
      `Non-date values in opened 6 [Show]`, `Self-loops 2 [Kept v]`. Header chip `4 issue types, 27`.
    - **Columns** as property rows: type icon, name (rename in place), type dropdown, role
      dropdown, a fill bar or `98%`, and an origin icon (file / joined / result of a run). A type
      change shows the count that will not convert before it applies (`1 blank of 500`).
    - Column row context menu: Rename, Change type, Use as (name / weight / time / kind), Hide.
    - Every change is one undo step.
- **End state:** the reader can say how big the graph is and what is wrong, and fix a type or a
  role without leaving the panel.
- **First failure to draw:** fraud `amount` read as a number with `1 blank`; a yes/no column read
  as text (the studio's filter that kept 0 nodes).
- **Fixture:** `fraud-ring-synthetic.json`, 200 nodes, 612 edges, the 4 warning types and 27
  issues of FIXTURES 2.6 (repeats combined with sum, self-loops kept on acct-4471 and merch-88).
  Clean contrast: the cat network shows no Warnings section at all.

### 3. Filter: show only the nodes and edges that match

- **Precisely:** the reader has a condition on a column in mind ("padj below 0.05", "amount over
  5000", "kind is account") and wants the drawing (and the table, which follows it) to show only
  what matches, without deleting anything. Not find (one node by name) and not selection.
- **Who:** Alex every session, fraud, intelligence, security, genomics, marketing. W02, W06, W12,
  W17, W20.
- **Trigger:** a question about a subset.
- **Today:** there is no filter. Readers hide a whole layer in the graph place, or type the
  condition into the find box (every participant tried the find box first, in the data's own
  words).
- **Needs:** an always-visible Filter entry (a toolbar button with a count chip when on). One
  condition is one property row: `[padj v] [< v] [0.05]`, live count chip `60 of 318 nodes`,
  `Show only` / `Highlight` as a segmented control. Hidden nodes take their edges with them; the
  count shows both (`60 nodes, 214 edges`). A condition on a column whose type is wrong shows the
  column's warning icon, not an empty result. Hiding never deletes; export says
  `Filtered: 60 of 318` and offers all.
- **End state:** 60 of 318 nodes drawn, the toolbar's Filter shows `1`, the table shows 60 rows.
- **Open part (draw 2 variants):** where a filter is entered -- a toolbar popover with the
  condition rows, versus a Filter section in the data configuration panel opened by the toolbar
  button.
- **Fixture:** ovarian STRING after its join: `padj < 0.05` matches 60 of 318;
  `abs(log2FoldChange) > 1` matches 44 of 318. Fraud: `kind = account` matches 96 of 200.

### 4. Join a second file onto this graph

- **Precisely:** with a graph open, the reader brings a second file whose ids match the graph's
  nodes. The default is to **join on node id**: a table of node values adds columns to the
  matching nodes; a second edge file adds its edges between the matching nodes (and creates the
  nodes that are new). Adding the file as an unrelated second graph is the rare choice (flow 11).
- **Who:** genomics (blocking: expression onto STRING nodes), bioinformatics (experiment onto a
  PPI network), intelligence (a second record source), supply chain (a shipment table onto the
  supplier table), knowledge engineer (several systems). W08, W09, W13, W20, W21.
- **Trigger:** drop or Add data with a graph open.
- **Today:** "Add data..." and the Data page's "Add a table" add a node table and an edge table
  together. There is no join onto existing nodes, and a second file sharing node ids silently
  drops its values for every node already in the graph.
- **Needs:** dropping a second file opens the join in the data configuration panel, pre-chosen
  from how its ids match:
    - `Match [gene_symbol v] = [preferredName v]` (the file column, the node column).
    - Match chips: `312 matched`, `28 not in graph`, `6 nodes without a value`, `0 repeated keys`
      (a zero chip is not drawn).
    - Ids that differ only by case or spaces: a row `+19 match ignoring case [Use]`.
    - `Adds 4 columns` with the column chips (`log2FoldChange` `padj` `baseMean` `go_terms`).
    - For an edge file: `Adds 62 edges`, `26 new nodes`, `14 nodes updated`.
    - A verb dropdown on the Join button for the rare cases: Join (default), Add as new nodes and
      edges, Open as a separate graph, Replace data.
- **End state:** the expression columns sit on the nodes with the "joined" origin icon, the 6
  unmeasured nodes are listed (a `[Show]` on their chip), the file is a second source row.
- **First failure to draw:** the key differs in case (`tp53` vs `TP53`), the +19 row.
- **Fixture:** `expression.tsv` onto `preferredName`: 340 rows, 312 matched, 28 not in graph,
  6 nodes without a value, adds log2FoldChange, padj, baseMean, go_terms (FIXTURES 3.1).

### 5. Replace with a newer copy, keep my work

- **Decision: manual, never automatic.** A file opened from this computer has no live link, and
  a number that changes under the reader breaks Alex's weekly comparison and Emma's
  reproducibility. Two explicit doors: **Replace file...** in the source row's context menu (7 of
  8 readers right-clicked the source row looking for it), and dropping or opening a file with the
  same name or the same headers, which pre-chooses Replace (already decided by the studio). A
  source loaded from a web address or a server also gets **Refresh from source** in the same
  menu.
- **Keep my work is an option, on by default:** one checkbox row `Keep styles, filters and
analysis`. Analysis reruns on the new data. Off means a fresh graph from the new file.
- **Who:** Alex (the reason Alex comes back), supply chain (monthly export), security, marketing.
  W03, W19.
- **Today:** no visible Replace; "Open project or file..." opens "Add to <project>" and Load
  doubles every edge (a 41-edge file opened twice became 82). On the replace page, 8 of 8 left
  the weight's meaning unset although the old source had one.
- **Needs:** the old mapping carried by header name (the role rows arrive filled, a `from
suppliers-sept.csv` chip on the mapping header); difference chips `+12 nodes` `-3` `40
changed`; a warning row for anything that no longer binds (`Style "Tier" : column tier not
found [Map v]`). One undo brings the old data back.
- **End state:** October's graph with September's styles, filters and analysis on it.
- **Open part (draw 2 variants):** the replace confirmation as a small popover from the source
  row, versus the data configuration panel's mapping in a "replacing" state.
- **First failure to draw:** the new file renamed a column, so one style no longer binds.
- **Fixture:** supply chain `suppliers.csv` + `ships_to.csv`, 120 nodes, 400 edges; October:
  `+12 nodes`, `-3`, `40 changed`.

---

## Special cases, a few clicks away

### 6. One event table, several kinds of node

- **Precisely:** each row is an event (a login, a purchase, a transaction) that names two or more
  things of different kinds in different columns. The reader wants one node per thing, a kind
  per column, and repeated events combined. Distinct from flow 1 because the "from" and "to"
  columns are different kinds and there may be more than two.
- **Who:** security (users, hosts, processes, IPs from SIEM events), recommender engineer (users
  and items from an interaction log), fraud (accounts and merchants), intelligence (call
  records). W06, W07, W09, W16.
- **Today:** the role menus allow one From and one To, both of one kind; a third entity column
  cannot be a node.
- **Needs:** in the mapping, a `Nodes` section with `+`: one row per column used as nodes with
  its kind (`user [User v]`, `host [Host v]`, `process [Process v]`); an `Edges` row
  (`user -> host`, `host -> process`, `+`); `Edge kind [event_type v]`; `Repeated events
[Combine: count v]`. Kind chips with counts in the header.
- **Fixture:** `security-events-120k.csv`: 61,200 processes, 41,300 hosts, 12,900 users, 5,018 IP
  addresses = 120,418 nodes; 1,104,206 edges; `4 node types, 6 edge types`; repeats into `count`.

### 7. Gene list to a network

- **Precisely:** the reader has a list of gene names, not a graph, and wants the known
  interactions among them from a public database. Different from flow 8: no query language, no
  sign-in; the input is a pasted list plus species and a confidence cutoff.
- **Who:** genomics (starts here most sessions), bioinformatics. W20 step 1, W08.
- **Today:** "Open network data" lists NDEx and web APIs as "on the way".
- **Needs:** `Open network data > Gene list`: a paste box, `Species [Homo sapiens v]`,
  `Confidence [0.4 v]`; **Test returns live data**: `287 found`, `13 not found [Show]`, a preview
  of the first rows of the edge list (protein1, protein2, combined_score) and the counts
  `318 nodes, 1,104 edges`; then Load.
- **Fixture:** a 300-gene list: 287 found, 13 not found; the network is the ovarian STRING one
  (318 nodes, 1,104 edges, after adding interactors).

### 8. Query a database, load more, expand a node

- **Precisely:** the data lives in a graph database or an API, too big to load whole. Three
  steps that look different: (a) **connect and query** (address, sign-in, a query or a seed id),
  (b) **load more** when a load hits its limit, (c) **expand** one node on the canvas from the
  source. (b) is a chip on the source row; (c) is a canvas context menu, not a form.
- **Who:** knowledge engineer (Neo4j, 10,000 to 10,000,000 nodes), fraud (each of 50+ alerts a
  day starts from one account), security, intelligence (seed entities). W06, W07, W13.
- **Today:** only a graph file at a web address.
- **Needs:** (a) source form as property rows (`Address`, `Sign-in`, `Query` or `Start from`,
  `Limit [5,000]`); **Test returns live data**: the first 20 rows or nodes in a small preview
  grid and `40,000 match`, or `Sign-in refused` before anything loads. (b) the source row reads
  `5,000 of 40,000` with `Load more`. (c) right-click a node: `Expand from source` with `Depth
[1 v]` and `Limit [50]`; the new nodes arrive marked, and a capped expand shows `37 of 37` or
  `50 of 212`. A reopened project shows the saved graph and asks before querying again.
- **Fixture:** Neo4j query matching 40,000 under a 5,000 limit; fraud: expand `acct-4471`
  (degree 37) with a limit of 50.

### 9. Filter steps: several conditions, connected part, saved sets

- **Precisely:** once one filter is on, the reader stacks a second condition, keeps only the
  connected part around what is left, or saves the result to reuse.
- **Who:** Alex, fraud, security (refine a hunt), genomics (keep the largest connected part,
  W20 step 2, every session), enrichment map (two cutoffs tuned by slider, W22), bioinformatics
  (module subnetwork, W08).
- **Needs:** the filter's condition rows become an ordered list once there are two, each with an
  on/off toggle and its own count (`step 1: 60 of 318`, `step 2: 38 of 60`); a structural
  condition in the column dropdown, `In largest connected part`; a numeric condition can show a
  slider (W22's q-value and similarity cutoffs); `Save as set` and a `Sets` list; paste a list
  of ids as a set (`47 matched`, `3 not in graph`).
- **Fixture:** ovarian: step 1 `padj < 0.05` 60 of 318, step 2 `abs(log2FoldChange) > 1`; fraud:
  `kind = account` then `In largest connected part`.

### 10. Time window

- **Precisely:** the data has a time column and the reader wants to see one period, step through
  periods, or compare two. A filter on a time column with a range control instead of a value box.
- **Who:** Alex and bioinformatics (network evolution, W19), intelligence (case time frame, W09),
  fraud (velocity), security (incident window).
- **Needs:** choosing a time column in Filter gives a range row with two dates and a small
  histogram, a `30 days [v]` width and step arrows; counts `120 of 200 nodes, 340 of 612 edges`.
  The column must already be typed Time (flow 2).
- **Fixture:** fraud window A 2026-01-05 to 2026-02-04: 120 of 200 nodes, 340 of 612 edges;
  window B 2026-02-18 to 2026-03-19: 132 of 200, 388 of 612 (FIXTURES 2.7).

### 11. Combine two networks

- **Precisely:** two graphs on the same kind of ids, each loaded as its own, combined as union,
  intersection or difference, with a membership column saying where each node and edge came
  from. Rare, and distinct from a join, which adds to one graph.
- **Who:** genomics and bioinformatics (disease vs control, W24), intelligence (two cases).
- **Needs:** from the join's verb dropdown (`Open as a separate graph`), then a `Combine` action
  on two source rows: `[Union v]`, `Match on [name v]`, result chips; a `membership` column
  (both / tumor only / control only) usable in style and filter.
- **Fixture (new, to add to FIXTURES):** tumor = ovarian STRING, 318 nodes, 1,104 edges; control
  296 nodes, 1,020 edges; shared 271 nodes, 842 edges; union 343 nodes, 1,282 edges.

---

## Answers for the comparison page

- **Find and filter (point 6).** Find goes to one node you know by name: the toolbar's find
  box, already in the app. A selected node's data card is the inspector, also already in the
  app. Filter shows only what matches a condition, and it is the new work: flow 3, with steps,
  sets and time in flows 9 and 10. The table header gets sort only, no search and no conditions,
  because the table is view-only and follows the filter.
- **Newer copy (point 7).** Manual. Replace file... on the source row, or opening a file with the
  same name pre-chooses Replace. "Keep styles, filters and analysis" is a checkbox that starts
  on. A file from a web address or a server also gets Refresh from source. Never automatic: a
  number that changes without the reader asking breaks a weekly comparison.
- **Second file (point 8).** Join is the default: match on node id, add columns to matched nodes
  or edges between them. Adding it as a separate graph is a choice in the Join button's menu.
- **Server loading (point 11).** Three different things now: a gene list to a network (paste,
  species, cutoff), a database query (address, sign-in, query, limit), and expanding a node from
  its source (a canvas context menu). Every Test shows live data -- the first rows and the
  counts -- before Load.

## What the first screen must not show

No server form, filter steps, sets, time range, combine or join settings until their flow; no
Warnings section on a clean file; no Direction row when the file says; no "Import styles" row
when the file has none; no zero-count chip; no internal word ("Key", "Edge id", "Attribute",
"source" as a column role) where a plain one exists.
