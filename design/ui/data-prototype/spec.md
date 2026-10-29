# Data management prototype: the design

Status: the build spec for round 3, 2026-10-19. One working prototype, not options. It replaces
the round 1 and round 2 mocks in `design/ui/mockups/data/` and answers the owner's round 2
feedback (`design/ui/mockups/data/round-2/owner-feedback.md`). The ranked requirements it serves
are in `design/data/data-management-requirements.md`; requirement numbers below are that
document's names for them.

The research behind every decision is in `research/`:

- `research/prior-designs.md` -- what earlier designs already decided (export, timeline,
  condition cards, table dock, sources)
- `research/joins.md` -- how Tableau, Power BI, Cytoscape, Gephi, Kumu and Neo4j join data, and
  the kinds of join a graph needs
- `research/servers.md` -- how graph tools load, expand, page and refresh from a server
- `research/audit.md` -- what graphty-element and the app already do, and the gaps

## 1. Ground rules

These come from the root `CLAUDE.md` and the owner's design rules, and every package below obeys
them.

- **Data logic is graphty-element's.** Matching, joining, type inference, counting, provenance,
  replace, refresh and time bins are element commands that return counts and `{ code, params }`.
  The app draws them. Each data command is one undo step.
- **No sentences as UI.** Property rows, chips, dropdowns, `+` sections, pop-overs and context
  menus, in the Figma manner. Words are labels and counts ("318 matched"), never explanations. A
  tooltip may hold one short phrase.
- **"Edges", never "links".**
- **Node and edge chips everywhere.** A node chip and an edge chip each have one fixed color and
  one icon, used in every place that counts or names nodes or edges (section 3.1).
- **Styling only through style layers.** Kinds, joined values and data-source membership become
  attributes; style layers and condition cards read them.
- **Plain ASCII, American spelling.**

## 2. The decisions on the owner's open questions

### 2.1 Drawn at once, or the data screen first?

**Decision: the first clean file draws at once; anything with unknowns or errors opens the table
full screen; a second source always opens full screen.**

- A file the element calls clean (`draft.report()` has no issue and no unsure role) draws at
  once. The left sidebar shows its source row and the special fields it guessed, so a wrong guess
  is one click from being fixed. This keeps requirement 5 (a clean file is one Enter, here zero).
- A file with an unsure role or a nonzero problem count still draws (nothing waits on the
  reader), and the table dock opens maximized on top of it with the warning icons in the headers.
  The reader fixes or ignores, then minimizes. Why: the owner's 50/50 was between "seeing the
  drawing" and "seeing the data". With problems the data is what the reader must look at, and the
  drawing behind the maximized table is one click away (Minimize). Without problems the data has
  nothing to say.
- A second file inside a project never merges silently. It opens the table maximized in join mode
  (section 3.6), because the reader must choose how it combines, and that choice needs both tables
  in view.

### 2.2 Which side do loading controls live on?

**Decision: the left.** Sources and special fields are in the left sidebar (the Data place). The
right side stays the inspector for what is selected. Reasons:

- The owner said sources in the left sidebar "seems right"; Tableau's Data Source pane, Power BI's
  Data pane and Cytoscape's Network panel all put sources at the left.
- Loading controls describe the source, and the source row is on the left, so the controls sit
  next to the thing they change. A right-side panel splits one task across both edges.
- The right panel is the inspector everywhere else in the app; putting load settings there makes
  one panel mean two things.

### 2.3 Several kinds of node from one event table: data or styling?

**Decision: data.** Each endpoint column of an edge table (and each node table) can carry a kind,
set in the special fields sidebar. The default is no kind, so nothing changes for readers who
never set one.

- Styling cannot do it. In an auth log, user "admin" and host "admin" are the same id string. If
  the load makes one node of them, no style layer can split it back into two. Ids are made by the
  load, so kinds must be set at load.
- Once a node has a kind it is an ordinary attribute (`kind`). Style layers color by it and
  condition cards filter on it, so the styling half is free.
- The reader knows the kinds because they are the column names: `user`, `host`, `ip`. The element
  proposes the column name as the kind; the reader can rename it. This matches how Neo4j's Data
  Importer and Kumu present types.
- When the same id appears under two kinds, the element counts it and the reader picks
  `[Same node | Different nodes]` on a chip (default "Same node", today's behavior).

### 2.4 Hide, unhide and hide others

Hiding a column is a data fact, not only a table preference: a hidden column leaves the table,
the condition card field list, the style binding pickers and the export column list (export can
add it back). It is saved in the project. It never deletes values. This answers the owner's "to
prevent them from polluting data sets".

### 2.5 Time

The timeline is a tool along the bottom of the canvas, opened from the bottom toolbar's clock
button, which appears only when some column has the time role. It is a visibility window that
combines with filters into one mask; it never re-lays out and never deletes. Nodes follow their
edges (a node is shown while any of its shown edges is), set by the app as an element option.

## 3. The places

```
+--------------------------------------------------------------------------------------+
| header: project menu | Undo Redo | autosave | [filter chip: 140 of 900 (N)]  Export  |
+------+----------------------+----------------------------------------+---------------+
| rail | LEFT SIDEBAR (Data)  |                                        | INSPECTOR     |
|      | Sources          [+] |               canvas                   | (selection)   |
|      |  > ppi.tsv  (N)60 (E)120                                      |               |
|      |  > expr.tsv (link) 52/70                                      |               |
|      | Fields                |                                       |               |
|      |  Id      [symbol   v] |                                       |               |
|      |  Label   [symbol   v] |                                       |               |
|      |  Source  [bait     v] |                                       |               |
|      |  Target  [prey     v] |                                       |               |
|      |  Weight  [confid.. v] |                                       |               |
|      |  Time    [none     v] |                                       |               |
|      |  Kind    [none     v] |                                       |               |
|      | Filters          [+] |                                        |               |
|      |  [card: score > 0.7] |   [timeline strip, when open]          |               |
|      |                      |  [Table] [Clock] [Analyze] [Layout] .. |               |
+------+----------------------+----------------------------------------+---------------+
| TABLE DOCK (when open):  (N) Nodes 60 | (E) Edges 120 |  Columns 8 of 12 v  [max] [x] |
| | symbol (T) | degree (#) | log2fc (#) (!) | ...                                     |
+--------------------------------------------------------------------------------------+
```

### 3.1 Node and edge chips (everywhere)

- **Node chip:** a filled circle icon and the node accent color (the existing theme's blue
  family); text is a count or a name: `(o) 60`, `(o) TP53`.
- **Edge chip:** a line-segment icon and the edge accent color (the theme's orange family):
  `(-) 120`, `(-) TP53 - MDM2`.
- Used in: source rows, table tabs, join match chips, replace receipt, condition card counts
  ("140 of 900"), filter chip, export scope, server preview, load report, Test result, timeline
  counts, the inspector header.
- One shared component in compact-mantine (`EntityChip`, `kind: "node" | "edge"`), so every
  caller gets the same look. Colors are theme tokens, checked for 3:1 contrast in both themes.

### 3.2 Left sidebar: Sources

- One row per source (`data.sources()`): kind icon (file, server, sample, joined), name, node chip,
  edge chip. A joined table shows a link icon and `matched/rows` (`52/70`).
- A source that a server feeds adds `500 of 40,000`, a "changed" dot when a check found changes,
  and two icon buttons on hover: Load more, Refresh. A reopened project's waiting load shows
  Approve (requirement 27).
- Click a row: selects it; the Fields section below shows that source's special fields.
- Row context menu (right-click or the row's `...`): Edit join (joined only), Replace with file...,
  Refresh, Load more, Edit query (server), Rename, Remove. Items whose precondition is missing are
  absent, not disabled.
- `+` on the section: a menu with File..., Samples..., Server..., Paste. Dropping a file anywhere
  is the same as File....
- Once two sources exist, the inspector shows a `Source` row naming each source an element came
  from (requirement 29).

### 3.3 Left sidebar: Fields (special fields)

The owner liked choosing special fields in a sidebar. One property row per role, each a dropdown
of the selected source's columns plus `none`:

- Nodes: Id, Label, Kind, Time.
- Edges: Source, Target, Weight, Time, Kind of source, Kind of target.
- Weight adds a small meaning dropdown beside it when set: distance, similarity, capacity,
  unknown (requirement 9). Default is the element's guess.
- Direction is one segmented control at the end: directed / undirected / auto.
- A guessed role that the element is unsure of shows the warning icon on the row; hover shows the
  alternatives with counts.
- No "other fields" list. Every other column is in the table.
- A change is one element command (`data.setRole`), one undo step; the drawing updates.

### 3.4 Left sidebar: Filters

Filters are the existing condition cards (the Which picker and its cards from the style layer
targets, on branch `design/studio-tier3`), not a new UI.

- `+` adds a card; its field list is the condition card's field list (hidden columns left out).
- Each card shows its own `X of Y` with node or edge chip, and a Select / Hide toggle
  (requirement 12). Cards combine with AND.
- **Data source condition:** once two or more sources are loaded, the field list gains `Data
source`, a category card whose values are the source names with counts. Style layer targets get
  the same card, because they use the same picker.
- The header filter chip `(o) 140 of 900` appears while anything is hidden; clicking it opens the
  Filters section. Its `x` clears all filters (one undo step).

### 3.5 The table dock

- **Open:** the Table button at the bottom-center toolbar (and Shift+T). It opens the dock at the
  bottom: tabs `(o) Nodes 60` and `(-) Edges 120`, the `Columns 8 of 12` chooser, Maximize, Close.
- **Maximize:** the dock takes the whole canvas area and shows configuration: a left column with
  Sources, Fields and the Issues list (section 3.5.3); the toolbar, minimap and legend hide.
  Minimize returns to the dock. Esc minimizes.
- **Headers carry all column configuration.** No configuration blocks in the table body.

#### 3.5.1 A column header

```
| (#) log2fc  (!) (link) v |
```

- Type icon: text, number, yes/no, date, category, id. Click: the type menu.
- Role badge when the column has a special role (id, label, source, target, weight, time, kind).
- Warning icon when the column has an issue; hover shows the issue as a short label with counts
  ("1 not a number", "3 decimal commas"), and the fixes inline as buttons, each with Ignore.
- Origin icon for joined columns (link) and computed columns.
- Click the name: sort. Hover the name: the column summary (fill, unique, min/max or top values).

#### 3.5.2 The header context menu

One level, no submenus except Type and Role, which are short pick lists:

```
Type        >  text | number | yes/no | date | category       (shows "1 will not convert")
Role        >  none | id | label | source | target | weight | time | kind
Rename...
Hide
Hide others
Unhide all          (only when something is hidden)
Match on this       (only in join mode)
Sort ascending / Sort descending
```

Type change first shows the count that will not convert and what happens to them (become blank)
in the menu row itself; choosing it applies, and Undo reverses it (requirement 17). Rename keeps
every style, filter and run that reads the column (requirement 37).

#### 3.5.3 Issues and fixes

- Each issue is a warning icon in its column header (or on the source row for row-level issues
  such as edges naming unknown nodes).
- The maximized view's left column lists every issue flat, one row each: icon, column, count, the
  fix buttons, Ignore. No multi-level menu. Example rows:
    - `amount  1 not a number    [Make blank] [Ignore]`
    - `amount  3 decimal commas  [Read as decimals] [Ignore]`
    - `edges  18 unknown ends    [Add nodes] [Leave out] [Ignore]`
    - `edges  5 repeated         [Merge] [Keep] [Ignore]`
    - `id  2 repeated ids        [Keep first] [Merge rows] [Ignore]`
    - `name  1 padded spaces     [Trim] [Ignore]`
    - `row 412  refused          [Show] [Ignore]`
- Ignore is saved in the project; an ignored issue leaves the header and the list (an "Ignored 2"
  toggle at the list's end brings them back).
- A fix is one undo step. Zero-count issues are never shown.

### 3.6 Join (full screen)

Entered by dropping or adding a second file while a graph is open, by `Edit join` on a joined
source, or by the header menu `Match on this`.

```
+-------------------------------------------------------------------------------------+
| Join  expression.tsv onto ppi              [Join v]  [Cancel]                       |
| Match  [symbol v] = [Id (symbol) v]  [ ] ignore case  [ ] ignore spaces  [+]          |
| (o)52 matched  10 not in graph [Show]  8 nodes, no value [Show]  (!)1 repeated key   |
| +6 ignoring case [Use]  +1 ignoring spaces [Use]                                    |
+------------------------------------------+------------------------------------------+
| GRAPH NODES                              | EXPRESSION.TSV                           |
| | Id (key) | label | degree |            | [x]symbol(key) | [x]log2fc | [x]padj    |
| | TP53     | TP53  | 14     |            |  TP53          | 2.1       | 0.001      |
| ...  (rows aligned by match; unmatched shaded)                                      |
+------------------------------------------+------------------------------------------+
```

- Side by side: the graph's node table (or edge table) and the incoming file. No noodle canvas.
- The element suggests the key pair and the shape (values for nodes, edges between nodes, or new
  nodes). The reader changes the key with the Match dropdowns or with `Match on this` on either
  side's header, which moves the key icon.
- Match chips update live from the element's join report: matched, not in graph, nodes with no
  value, repeated keys (warning, hover fixes: Keep first, Keep both, Ignore), extra matches if
  case or spaces are ignored with `[Use]`.
- Each incoming header has an include checkbox; a clashing name shows a clash icon whose hover
  offers Keep, Overwrite, Keep both (default Keep both).
- `+` on the Match row adds a second key pair (compound key). A mapping table dropdown appears
  in the Match row only when a loaded source could map ids (requirement 52).
- An edge file shows two key icons (source and target) and its chips read `(-)62 edges added`,
  `(o)26 new nodes`, `(o)14 nodes updated`, `3 rows, no end`. With kinds set, a chip such as
  `42 ids in both user and host [Same node | Different nodes]` appears.
- The `Join` button's dropdown: Join (default), Add as rows, Replace data, Open as a separate
  graph. The choice is pre-picked from the element's suggestion (requirement 13).
- After Join: one undo step; the joined file appears as a source with a link icon; joined columns
  carry the link origin icon in the table header.

### 3.7 Replace with a newer copy

Round 2 option A, which the owner liked:

- Source row menu `Replace with file...`, or drop a file whose headers match a loaded source (the
  element says it matches; the join screen pre-picks Replace data).
- It applies at once and keeps everything: styles, runs, filters, joins, mapping, notes.
- A receipt notice at the bottom of the canvas: `Replaced sept.csv with oct.csv  (o)+12 (o)-3
40 changed  1 style unbound [Show]  [Undo]`. The same numbers stay on the source row's hover.
- Undo brings back the earlier data and results in one step.

### 3.8 Common export

The app's one Export dialog (Mod+E, main menu, project menu, and the table dock's `...`), from
the prior design (`structure-b-refined.md` section 12.1):

- Left list: Image, Video, Data, Styles, Recipe, Project. Right: that output's property rows.
- **Image:** size preset, background, scale; graphty-element's screenshot presets.
- **Video:** view or tour of saved views, length, size, frame rate; graphty-element's
  `captureAnimation`, with a dropped-frames warning chip.
- **Data:** format (from `catalog.formats()`), scope (`All`, `Shown 140 of 900`, `Selection`,
  a set), columns (hidden columns off by default), and the loss chip when the format drops
  something. Opened from the table dock, Data is pre-picked with the spreadsheet format and the
  current tab.
- **Styles:** the style layers only, as a style file.
- **Recipe:** the data steps (mapping, joins, type changes, fixes, filters) plus styles, naming
  columns by role or name, never node ids.
- **Project:** the whole project file.
- A Recent list at the bottom of the left column.

### 3.9 Server sources

`+` > Server... opens a pop-over form in the left sidebar (not a modal), Figma-style rows:

```
Kind      [Neo4j / Cypher v]     (Cypher, SPARQL, NDEx, OpenAlex, REST mapping)
Endpoint  [bolt+s://demo.neo4jlabs.com]
Sign in   [user] [password]     (never saved in the file)
Start     [Query | Seed nodes | Everything]
Query     [ MATCH (m:Movie)<-[r]-(p) RETURN m,r,p ]
Limit     [500]
Expand    [x] on double-click   (pop-over: depth 1, direction both, edge types any, limit 50)
          [Test]   [Load]
```

- **Test** returns live sample rows: up to 25 nodes and their edges as node and edge chips, the
  columns with type icons, and the server facts (version, counts when free). Errors show as a
  coded chip with the reason ("sign-in refused").
- **Load** runs the query with the limit and draws.
- **Expand on double-click** (default on for servers that can expand): double-click a node adds
  its neighbors; the canvas node menu has Expand... (depth, direction, types, limit) and Collapse.
  A node with more neighbors on the server carries a small `+N` badge.
- **Load more** on the source row: Cypher and SPARQL page automatically because the element
  writes the ORDER BY and LIMIT; a Cypher "query" load (the reader's own query) runs again with a
  larger cap and merges. OpenAlex pages by cursor. A REST mapping pages only if the mapping
  declares how (cursor, offset, Link header, next URL); otherwise Load more is absent. NDEx and
  STRING download whole and have no Load more; STRING's "more" is a new load with more
  interactors.
- **Refresh** on the source row re-runs the load, its pages and its expansions and applies only
  the difference as one undo step, reported as `(o)+3 (o)-1 5 changed`. Check for changes
  (row menu) sets the changed dot without loading, for sources whose check is cheap.
- What a source cannot do is absent: no Load more for NDEx and STRING; no Expand for a REST
  mapping without `expand`.

### 3.10 Timeline

- The clock button appears on the bottom toolbar when a column has the time role.
- It opens a strip above the toolbar: play / step back / step forward, a window band over a
  density histogram of the time column, a readout `2024-03-01 .. 2024-03-08`, the window size
  dropdown (day, week, month, or integer steps when the column is a number), counts
  `(o) 140 of 900  (-) 210 of 1,400`, and a gear pop-over: field, start and end fields (for
  intervals), nodes follow edges, step unit.
- Comma and period step. The window combines with filters (one mask); clearing it is in the
  filter chip too.

## 4. Progressive disclosure map

"Immediate" is drawn whenever its place is open. "One click" is one click on something immediate.
"Menu" is behind a context menu, dropdown or pop-over.

| Feature        | Immediate                                 | One click                               | Menu                                                                         |
| -------------- | ----------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| Load a file    | Drop anywhere; Sources `+`                | File picker, Samples                    | Paste, Server                                                                |
| Sources        | Source rows with chips                    | Select row: its fields                  | Row menu: Replace, Refresh, Remove, Rename, Edit join, Edit query            |
| Special fields | Fields rows with chosen column            | Each dropdown                           | Weight meaning, kind ids rule                                                |
| Warnings       | Header warning icons; source row icon     | Hover: details and fixes                | Maximized Issues list; Ignored toggle                                        |
| Table          | Table button                              | Maximize; sort; summary hover           | Header menu: Type, Role, Rename, Hide, Hide others, Unhide                   |
| Filters        | Filters section; filter chip while hiding | `+` card; Select/Hide                   | Data source field (only with 2+ sources)                                     |
| Join           | Second file opens the join screen         | Match dropdowns; include boxes; `[Use]` | Compound key `+`; mapping table; clash rule; Join dropdown                   |
| Replace        | Receipt with Undo after replacing         | --                                      | Row menu Replace with file...                                                |
| Export         | Header Export; Mod+E                      | Output in left list                     | Scope, columns, format                                                       |
| Server         | --                                        | Sources `+` > Server                    | Expand pop-over; Load more, Refresh on row hover; node menu Expand, Collapse |
| Timeline       | Clock button (when a time role exists)    | Strip opens; play                       | Gear: fields, unit, follow edges                                             |
| Kinds          | --                                        | Kind field dropdowns                    | Same node / different nodes chip                                             |

Never shown: a zero-count issue, a verb whose precondition is missing (Load more on a file, the
Data source condition with one source, Unhide with nothing hidden), element words (join key,
schema, rule tree, recipe command).

## 5. Flows the prototype serves

Personas are in `design/designloom/personas/`; workflows in `design/designloom/workflows/`.

| Flow                                               | Personas                                    | Workflows          | Requirements           |
| -------------------------------------------------- | ------------------------------------------- | ------------------ | ---------------------- |
| Open a clean file, get a right drawing             | Analyst Alex, Explorer Elena, every persona | W01, W14, W18      | 4, 5, 7, 10, 21        |
| Open a messy file, see and fix what is wrong       | Fraud analyst, supply chain, Alex           | W18, W06, W12      | 8, 17, 30, 37          |
| Choose special fields, weight meaning, direction   | Genomics, supply chain, fraud               | W18, W05, W11      | 7, 9, 39               |
| Hide noisy columns, configure in headers           | Knowledge engineer, ML engineer, Alex       | W13, W16, W03      | 38, 17, 37             |
| Filter with condition cards; data source condition | Every persona; intelligence, bioinformatics | W02, W04, W09, W17 | 12, 28, 29             |
| Join an expression table onto a protein network    | Genomics, bioinformatics                    | W20, W08, W23      | 14, 58, 52             |
| Add an edge file to a node file                    | Supply chain, fraud                         | W11, W06           | 13, 15                 |
| One event table, several kinds of node             | Cybersecurity, fraud, intelligence          | W07, W06, W09      | 42                     |
| Replace September with October, keep the work      | Supply chain, Alex, marketing               | W11, W19, W03      | 16, 57                 |
| Export image, video, data, styles, recipe          | Every persona; Emma, bioinformatics         | W15, W25           | 20, 35, 49             |
| Query a server, expand, load more, refresh         | Knowledge engineer, genomics                | W13, W20           | 23, 24, 25, 26, 27, 48 |
| Time window over an event table                    | Cybersecurity, supply chain, marketing      | W19, W07, W12      | 33                     |

## 6. Fixture data the prototype ships

Small, real-shaped files under `graphty/public/prototype-data/`, listed in the Samples dialog
(Sources `+` > Samples...) and loadable by drop. Counts are exact so reviewers and tests can check
them. Each is generated by `graphty/scripts/make-prototype-data.mjs` (deterministic, seeded), so
the counts below are guaranteed by the script, and a `README.md` beside the files says where the
real-world shapes came from.

| File                                | Shape                                                                      | What it exercises                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `proteins/tp53-interactions.tsv`    | `bait, prey, confidence, evidence`; 60 HUGO symbols around TP53, 120 edges | clean edge list; weight = confidence (similarity)                                                                                                                        |
| `proteins/tumor-expression.tsv`     | `symbol, log2fc, padj, tissue`; 70 rows                                    | join: 52 matched, 10 not in graph, 8 nodes without a value, TP53 twice (repeated key), 6 lowercase symbols (`+6 ignoring case`), 1 trailing space (`+1 ignoring spaces`) |
| `supply-chain/suppliers.csv`        | `id, name, country, tier`; 40 suppliers                                    | node file; `"Acme "` padded                                                                                                                                              |
| `supply-chain/ships-to-2024-09.csv` | `from, to, volume, lead_days`; 150 edges                                   | node file + edge file together                                                                                                                                           |
| `supply-chain/ships-to-2024-10.csv` | same headers, other order                                                  | replace: +12 edges, -3, 40 changed volumes                                                                                                                               |
| `fraud/accounts.csv`                | `account, holder, opened, flagged`; 300 rows                               | 2 repeated ids; `flagged` yes/no read as text                                                                                                                            |
| `fraud/transfers.csv`               | `from, to, amount, time`; 450 rows                                         | 18 unknown ends, 5 repeated edges, 3 decimal-comma amounts, 1 "N/A" amount, row 412 refused                                                                              |
| `events/auth-log.csv`               | `time, user, host, ip, result`; 400 rows over 14 days                      | kinds user, host, ip; "admin" both a user and a host; timeline                                                                                                           |

Live server sources (no fixture file; listed under Samples > Live):

- **OpenAlex** (built-in source, CORS, no key): works matching "network visualization", seed
  works, expand by citing and referenced works, cursor Load more, Refresh by `updated_date`.
- **NDEx** (built-in): search "TP53", load one network, expand by neighborhood query, Refresh by
  `modificationTime`; no Load more.
- **Neo4j demo movies** (graph-io's sample, read-only demo server): Cypher Query start, Expand on
  double-click, Load more.
- Memgraph on this machine is only for the developers, and only with bounded queries (`LIMIT`).

The existing `graphty/public/samples/*.gml` and the graph-samples datasets stay in the Samples
list.

## 7. Work packages

Build in this order. graphty-element packages come first; each app package owns its files, so the
app packages can be built one after another without editing each other's files. Menus, toolbar
buttons and Quick actions are built from the command registry (`workspace/commands/registry.ts`),
so a later package adds an entry to an earlier package's menu by registering a command with that
menu's context, not by editing the earlier file.

Every API below is additive: a new method, type, rule kind, role or optional option whose default
keeps today's behavior. Each element package runs `npm run build` then `npm run api:report` in
graphty-element and commits the API report.

### 7.0 Carry over the condition cards (element and app)

The Which picker, its cards and the Filters section exist only on `design/studio-tier3`, and
merging that branch would conflict in 237 files. Decision (reversible): copy the needed files from
that branch and adapt them, not merge it.

- Element: `session/visibility/steps.ts` (filter steps), `data.sources()`, `data.valueCounts`,
  value labels, with their tests.
- App: `style/WhichPicker.tsx`, `style/cards.ts`, `data-place/Filters.tsx`,
  `data-place/filterSteps.ts`, with the helpers they import that this branch lacks.

### 7.1 graphty-element

**E1. Source provenance and the data source condition** (requirements 29, 54)

```ts
interface SourceEntry {
  readonly key: SourceKey;                    // stable id, saved in the project
  readonly kind: "file" | "server" | "sample" | "join";
  readonly name: string;                      // file name or source title
  readonly counts: { readonly nodes: number; readonly edges: number };
  readonly joinedOnto?: SourceKey;            // for a joined table
}
data.sources(): readonly SourceEntry[];        // every load still in the graph (from 7.0)
data.sourcesOf(id: NodeId | EdgeId): readonly SourceKey[];
data.removeSource(key: SourceKey): Promise<RemoveSourceResult>; // keeps what another source also supplied
// RuleTree gains:
{ readonly kind: "source"; readonly sources: readonly SourceKey[] }
// AttributeDescriptor gains: readonly sources?: readonly SourceKey[]
```

**E2. Column commands** (requirements 17, 37, 38, 39)

```ts
data.setRole(column: ColumnRef, role: ColumnRole | null): Promise<void>;
data.previewType(column: ColumnRef, type: ValueType): TypeChangePreview; // { converts, fails, examples }
data.setType(column: ColumnRef, type: ValueType): Promise<void>;
data.renameColumn(column: ColumnRef, name: string): Promise<void>;   // styles, filters, runs follow
data.setHidden(columns: readonly ColumnRef[], hidden: boolean): Promise<void>;
// AttributeDescriptor gains: readonly hidden: boolean
```

`ValueType` is `"text" | "number" | "boolean" | "date" | "category"`; `date` is new. Hidden is
saved in the project file.

**E3. Column issues with fixes and ignore** (requirements 8, 30)

```ts
interface DataIssue {
  readonly id: IssueId;                     // stable across reloads
  readonly code: IssueCode;                 // "not-a-number", "decimal-comma", "unknown-end",
                                            // "repeated-edge", "repeated-id", "padded-space",
                                            // "case-variant", "blank-id", "refused-row", "mixed-type"
  readonly column?: ColumnRef;
  readonly source?: SourceKey;
  readonly count: number;
  readonly params: Readonly<Record<string, unknown>>;
  readonly fixes: readonly FixCode[];       // "make-blank", "read-decimal-comma", "add-nodes",
                                            // "leave-out", "merge", "keep", "keep-first",
                                            // "merge-rows", "trim", "merge-case"
}
data.issues(options?: { includeIgnored?: boolean }): readonly DataIssue[];
data.fix(issue: IssueId, fix: FixCode): Promise<FixResult>;  // one undo step
data.ignoreIssue(issue: IssueId, ignored?: boolean): Promise<void>; // saved in the project
```

**E4. Kinds** (requirement 42)

```ts
// ColumnRole gains "kind"; LOAD_ROLES.nodes.takes and .edges.takes gain "kind".
// LoadMapping gains, for edge tables:
readonly sourceKind?: string;   // a kind name, or a column whose values are kinds
readonly targetKind?: string;
// LoadChoices gains:
readonly kindIds?: "shared" | "scoped";  // default "shared": same id string = same node
// LoadReport gains: readonly kinds?: { readonly sharedIds: number; readonly byKind: Readonly<Record<string, number>> }
```

With `"scoped"`, a node's id is `<kind>:<value>` only for ids that appear under two kinds; every
node with a kind carries the `kind` attribute.

**E5. Join** (requirements 13, 14, 45, 52, 58)

```ts
data.prepare(source, { onto: "graph" }): Promise<Draft>;   // new option on the existing method
draft.suggestJoin(): JoinSuggestion;
interface JoinSuggestion {
  readonly shape: "node-values" | "edge-values" | "edges" | "rows" | "replace";
  readonly keys: readonly JoinKey[];         // { file: string; graph: Path }
  readonly confident: boolean;
}
interface JoinChoices {
  readonly keys: readonly JoinKey[];
  readonly ignoreCase?: boolean;             // default false
  readonly ignoreSpaces?: boolean;           // default false
  readonly columns?: readonly string[];      // default every column
  readonly clash?: Readonly<Record<string, "keep" | "overwrite" | "both">>; // default "both"
  readonly repeated?: "first" | "both";      // default "first"
  readonly via?: SourceKey;                  // a mapping table source
}
draft.joinReport(choices: JoinChoices): JoinReport;
interface JoinReport {
  readonly matched: number; readonly notInGraph: number; readonly withoutValue: number;
  readonly repeatedKeys: number; readonly extraIgnoringCase: number; readonly extraIgnoringSpaces: number;
  readonly newNodes: number; readonly newEdges: number; readonly updatedNodes: number;
  readonly clashes: readonly { readonly column: string; readonly code: "clash" }[];
}
draft.load({ join: JoinChoices }): Promise<void>;   // one undo step; the table stays a source
data.joins(): readonly JoinRecord[];                // saved; reapplied on open, refresh, replace
data.editJoin(source: SourceKey, choices: JoinChoices): Promise<void>;
// LoadChoices gains: readonly existing?: "keep" | "update"  (default "keep", today's behavior)
```

**E6. Replace** (requirements 16, 57)

```ts
data.replaceSource(key: SourceKey, source: DataSourceInput, choices?: LoadChoices): Promise<ReplaceReport>;
interface ReplaceReport {
  readonly nodes: { added: number; removed: number; changed: number };
  readonly edges: { added: number; removed: number; changed: number };
  readonly unbound: readonly CodedFact[];   // styles, filters, joins that no longer match
}
data.matchesSource(source: DataSourceInput): Promise<SourceKey | null>; // headers match a loaded source
```

One undo step restores the earlier data, results and joins.

**E7. Export scope, styles file, recipe file, presets** (requirements 20, 35, 49)

```ts
exportGraph(format, { scope?: RuleTree | "shown" | "selection" | { set: SetId }; columns?: readonly string[] });
session.styles.toFile(): StyleFileDocument;    // style layers only
session.recipe(): RecipeDocument;              // data steps and styles, columns by role or name
catalog.screenshotPresets(): readonly ScreenshotPreset[];  // published, so the app copy goes
```

**E8. Time** (requirement 33)

```ts
visibility.timeHistogram(attribute: Path, options?: { bins?: number }): TimeHistogram;
// TimeWindow gains:
readonly end?: Path;                          // intervals: start attribute + end attribute
readonly nodes?: "own" | "follow-edges";       // default "own" (today); the app sets follow-edges
```

**E9. Server preview, paging, refresh** (requirements 23, 26, 48, 25)

```ts
data.previewSource(input: SourceInput, options?: { maxNodes?: number }): Promise<SourcePreview>;
// SourcePreview: { nodes, edges, columns, more: boolean, facts, issues: CodedFact[] }; changes nothing
data.more(options?: SourceLoadOptions & { load?: string }): Promise<void>; // pick a load
// SourceLoadRecord gains: readonly total?: number; readonly expand?: ExpandBehavior
data.checkSource(load: string): Promise<{ changed: boolean | null }>;
data.refresh(load: string): Promise<RefreshReport>;   // { added, removed, updated }, one undo step
// catalog.sources() descriptors gain: features: { expand: boolean; more: boolean; refresh: boolean }
// SourceLoadOptions gains: readonly expand?: ExpandBehavior   (per-load double-click expand)
```

graph-io: Cypher "query" previews send the cap to the server (`CALL { ... } WITH * LIMIT $n`).

**E10. SPARQL source** (graph-io, then registered in the element)

A `sparql` source in `graph-io/src/sources/sparql/`: CONSTRUCT queries, IRI objects are edges and
literals attributes, `ORDER BY ... LIMIT/OFFSET` paging, `VALUES ?s {ids}` expand, refresh by
hash. Tested against a local fixture server, demoed against Wikidata with a small query.

### 7.2 The graphty app

**A1. Chips and the bottom toolbar**
Files: `compact-mantine/src/components/EntityChip.tsx` (+ story, test, export),
`graphty/src/workspace/glyphs` additions, `graphty/src/workspace/toolbar/WorkspaceToolbar.tsx`.
The node and edge chips; the Table button and the clock button on the bottom toolbar, each drawn
only when its command (`table.toggle`, `timeline.toggle`) is registered and available.

**A2. Left sidebar: Sources, Fields, Filters host**
Files: `graphty/src/workspace/data-place/DataPlace.tsx`, new `data-place/Sources.tsx`,
`data-place/SourceRow.tsx`, `data-place/Fields.tsx`, `data-place/AddSourceMenu.tsx`,
`data-place/words.ts`, the data-place commands. Source rows with chips and menus built from
registered `source-row` commands; Fields rows (E2 `setRole`, E4 kinds, weight meaning,
direction); hosts the Filters section from 7.0 and adds the Data source card (E1). Deletes the
app's role list copy (`ROLES_BY_KIND`).

**A3. Loading: doors, samples, first file**
Files: `graphty/src/workspace/start/open.ts`, new `start/SamplesDialog.tsx`, `start/samples.ts`,
`graphty/public/prototype-data/**`, `graphty/scripts/make-prototype-data.mjs`. Drop, picker,
paste, Samples; the decision in 2.1 (clean draws at once, problems open the table maximized, a
second file opens the join screen); the fixture files and their generator.

**A4. Table dock with full screen and header configuration**
Files: `graphty/src/workspace/table/*` (TableDock.tsx, columns.ts, new `HeaderCell.tsx`,
`HeaderMenu.tsx`, `IssuesList.tsx`, `MaximizedPanel.tsx`), `table/table.css`. Maximize and
minimize, header type, role, warning and origin icons, hover details with fixes and Ignore, the
header menu, hide, unhide, hide others (E2), the flat Issues list (E3). Deletes the run-column
probe and the Pill workaround (moved to compact-mantine).

**A5. Join screen**
Files: new `graphty/src/workspace/join/*` (JoinScreen.tsx, MatchRow.tsx, MatchChips.tsx,
join.css, commands.ts). Side by side tables, live match chips (E5), include boxes, clash rule,
kinds chip (E4), the Join dropdown, Edit join.

**A6. Replace**
Files: new `graphty/src/workspace/replace/*` (ReplaceReceipt.tsx, commands.ts). The row menu
command, the drop routing hook A3 calls when `matchesSource` returns a key, the receipt notice
with Undo (E6).

**A7. Common export**
Files: `graphty/src/workspace/export/*`. Image, Video, Data (scope, columns), Styles, Recipe,
Project, Recent (E7). Deletes the copy of the screenshot presets in `export/choices.ts`.

**A8. Server sources**
Files: new `graphty/src/workspace/server/*` (ServerForm.tsx, PreviewRows.tsx, commands.ts),
`graphty/src/workspace/start/NetworkDataDialog.tsx` (replaced by the form), canvas node menu
commands for Expand... and Collapse. Test with preview rows, Load, expand on double-click,
Load more and Refresh source row commands, Approve for waiting loads (E9, E10).

**A9. Timeline**
Files: new `graphty/src/workspace/timeline/*` (TimelineStrip.tsx, timeline.css, commands.ts).
The strip, histogram, window, play and step, counts, gear (E8).

## 8. Acceptance flows

Reviewers run each flow in the dev server, by mouse and once by keyboard alone.

1. **Analyst Alex, clean file.** Samples > tp53-interactions.tsv. _Success:_ it draws at once with
   no dialog; Sources shows `(o)60 (-)120`; Fields shows Source bait, Target prey, Weight
   confidence (similarity).
2. **Fraud analyst, messy files.** Drop accounts.csv and transfers.csv together. _Success:_ the
   table opens maximized; headers show warnings on `amount` (1 not a number, 3 decimal commas)
   and `flagged` (text that looks yes/no); the Issues list shows 18 unknown ends, 5 repeated
   edges, 2 repeated ids, row 412 refused; each has its fixes and Ignore; Ignore on repeated
   edges removes it and survives a reload; Minimize shows the drawing.
3. **Fraud analyst, type fix.** Header menu on `flagged` > Type > yes/no. _Success:_ the row shows
   the count that will not convert before applying; after applying, a condition card
   `flagged = yes` counts nodes; Undo restores text.
4. **Knowledge engineer, hide columns.** Header menu on `holder` > Hide others. _Success:_ only
   `holder` stays; the condition card field list no longer offers the hidden columns; Unhide all
   restores them; the hidden set survives a reload.
5. **Genomics researcher, join.** With tp53-interactions loaded, drop tumor-expression.tsv.
   _Success:_ the join screen opens with symbol = Id suggested; chips read 52 matched, 10 not in
   graph, 8 nodes no value, 1 repeated key, +6 ignoring case, +1 ignoring spaces; Use on case
   makes 58 matched; Join adds log2fc and padj with the link icon; Sources shows
   `tumor-expression.tsv 58/70`; one Undo removes the join.
6. **Bioinformatics researcher, data source condition.** After flow 5, add a filter card.
   _Success:_ the field list offers Data source with both sources and counts; the same card is
   offered in a style layer's target picker; with one source loaded it is absent.
7. **Supply chain analyst, node file plus edge file.** Drop suppliers.csv, then
   ships-to-2024-09.csv. _Success:_ the join screen pre-picks edges between nodes: 150 edges
   added; Join; then style by tier and filter `country = DE`.
8. **Supply chain analyst, replace.** Row menu on ships-to-2024-09.csv > Replace with file >
   ships-to-2024-10.csv. _Success:_ the style and filter stay; the receipt reads +12 / -3 / 40
   changed; Undo brings September back with the same counts as before.
9. **Cybersecurity analyst, kinds and timeline.** Load auth-log.csv; Fields: Source user, Target
   host, Kind of source `user`, Kind of target `host`, Time `time`. _Success:_ the chip `1 id in
both user and host` offers Same node / Different nodes; Different nodes makes two `admin`
   nodes; a style layer colors by kind; the clock button appears; play moves a one-day window
   and the counts change; filters still apply inside the window.
10. **Expert Emma, export.** Mod+E. _Success:_ Image, Video, Data, Styles, Recipe and Project are
    listed; Data with `Shown 140 of 900` writes 140 nodes; Styles writes only layers; Recipe
    names columns, not node ids; Video records a short tour.
11. **Knowledge engineer, server.** Sources + > Server > Neo4j demo, Query start, Limit 100,
    Test. _Success:_ Test shows up to 25 preview nodes with chips and columns; Load draws 100;
    the row shows `100 of N`; Load more adds the next page; double-click a node adds neighbors;
    node menu Collapse removes them; Refresh reports a difference (0 changes is valid).
12. **Genomics researcher, live REST.** Samples > Live > OpenAlex. _Success:_ works load with a
    cursor; Load more adds a page; expand on a work adds citing works; NDEx shows no Load more.
13. **First-screen audit.** For flows 1, 2 and 11, a screenshot of the first screen shows no
    zero-count issue, no absent-precondition verb and no sentence.

## 9. Running the prototype

graphty's Vite dev server compiles graphty-element from source (`graphty/vite.aliases.ts`), so
element changes show without a build. HTTPS is not required by the config, but use it: the page is
served on the machine's hostname, which is not a secure context over plain HTTP, and WebGPU,
`crypto.subtle` and the clipboard need one. Start it through servherd:

```jsonc
servherd_start({
  name: "graphty-data-prototype",
  cwd: "/home/apowers/Projects/graphty-monorepo/.worktrees/feat-data-prototype/graphty",
  protocol: "https",
  command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} npm run dev",
  env: { PORT: "{{port}}", HOST: "{{hostname}}" }
})
```

The workspace is the default page (`/`). Fixture files are at `/prototype-data/...`.
