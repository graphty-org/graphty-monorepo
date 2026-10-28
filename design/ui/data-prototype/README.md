# Data management prototype

One working prototype of how the graphty app loads, checks, joins, filters, replaces, exports and
times data. It answers the round 2 feedback in `design/ui/mockups/data/round-2/owner-feedback.md`.
The full design is `spec.md` beside this file.

**Open it:** https://dev.ato.ms:9706/ (branch `feat/data-prototype`, servherd server
`data-prototype`). The fixture files are listed under Sources `+` > Samples, and are also at
`/prototype-data/...` for dropping.

## What to try first

| Try                   | Fixture                                                                                        | What you should see                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A clean file          | Samples > `tp53-interactions.tsv`                                                              | Draws at once: 60 nodes, 120 edges; Fields shows Source bait, Target prey, Weight confidence (similarity)                                                           |
| A messy pair          | Drop `accounts.csv` + `transfers.csv` together                                                 | Table dock with warning icons on `amount` and `flagged`; Issues: 18 unknown ends, 2 repeated ids, row 412 refused, 5 repeated edges, each with fixes and Ignore     |
| Fix a type            | Header menu on `flagged` > Type > yes/no                                                       | The count that will not convert, before applying; then a `flagged = yes` card counts nodes                                                                          |
| Hide columns          | Header menu on `holder` > Hide others                                                          | 1 of 5 columns; hidden fields leave the filter list; Unhide > Unhide all; survives reload                                                                           |
| Join                  | With tp53 loaded, add `tumor-expression.tsv`                                                   | Full-screen join, symbol = Id; chips 52 matched, 10 not in graph, 8 no value, 1 repeated key, +6 ignoring case [Use], +1 ignoring spaces [Use]; one Undo removes it |
| Data source condition | After the join, Filters `+`                                                                    | Data source: tp53 (60), tumor-expression (58); also in a style layer's target picker; absent with one source                                                        |
| Node file + edge file | `suppliers.csv`, then `ships-to-2024-09.csv`                                                   | Join pre-picks edges between nodes: 150 edges; color by tier, filter country = DE                                                                                   |
| Replace               | Source row menu > Replace with file > `ships-to-2024-10.csv`                                   | Receipt +12 / -3 / 40 changed with Undo; styles and filters stay                                                                                                    |
| Kinds and timeline    | `auth-log.csv`; Fields: Rows are edges, Source user, Target host, kinds, then Time `time` last | Chip "1 in both" with Same node / Different nodes; two `admin` nodes; clock button; play moves a one-day window                                                     |
| Export                | Mod+E                                                                                          | Image, Video, Data, Styles, Recipe, Project in one dialog                                                                                                           |
| Server                | Sources `+` > Server > Neo4j demo movies, Test, Load                                           | Test previews live nodes and edges as chips; Load more; double-click a node expands, node menu Collapses; Refresh reports +0 -0                                     |
| Live REST             | Samples > Live > NDEx TP53 or OpenAlex                                                         | NDEx loads one network, no Load more; OpenAlex loads by cursor (Load more is broken, below)                                                                         |

## What is visible when

| Feature        | Immediately                                                 | One click                     | In a menu                                                   |
| -------------- | ----------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| Load           | Drop anywhere; Sources `+`                                  | File picker, Samples          | Paste, Server                                               |
| Sources        | Rows with node and edge chips                               | Row: its fields               | Row menu: Replace, Refresh, Remove, Rename, Edit join       |
| Special fields | Fields rows (Id, Label, Source, Target, Weight, Time, Kind) | Each dropdown                 | Weight meaning, Same/Different nodes                        |
| Warnings       | Header warning icon; source row icon                        | Hover: details, fixes, Ignore | Maximized table's Issues list                               |
| Table          | Table button on the bottom toolbar                          | Maximize, sort                | Header menu: Type, Role, Rename, Hide, Hide others, Unhide  |
| Filters        | Filters section; filter chip in the header                  | `+` condition card            | Data source field (2+ sources only)                         |
| Server         | --                                                          | Sources `+` > Server          | Load more, Refresh on the row; Expand, Collapse on the node |
| Timeline       | Clock button (only when a column has the Time role)         | Strip opens; play             | Settings: field, step                                       |

## graphty-element additions (all additive)

- Columns: `data.setType`, `previewType` (`TypeChangePreview`), `setRole` (`ColumnRole`),
  `renameColumn`, `setHidden`, `hiddenColumns`, column `hidden` and `yearLike`.
- Sources: `reloadSource` (new choices, same source), `renameSource`, `nodeSource`
  (`NodeSource`), `expand` (`SourceExpandResult`), `LoadedSource.total`, `features`, `choices`,
  `kinds` (shared ids and counts by kind), `kindIds: "shared" | "scoped"`, endpoint kinds.
- Issues: `IssueCode` (adds `could-be-yes-no`), `FixCode`, issue `status`, `current`, `fixedBy`.
- Join: `editJoinReport`, per-row matches, `JoinWarning`, `ignore` and `repeated` in the choices.
- Server: preview rows with `{ id, label }`, coded server facts, refresh and expand facts
  (`I_SOURCE_REFRESHED`, `I_SOURCE_EXPANDED`, ...); graph-io's capped Cypher load keeps the edges
  among its nodes.
- Filters: rule leaves `text` and `flag`, and `side` (nodes or edges) on rule leaves.
- Time: `visibility.firstWindow`, `stepWindow`, `addTimeStep`, `summaryOf`.
- Export: `EXPORT_LOSS_CODES`, `styles.toFile()` (`StyleFileDocument`), `recipe()`, a tour of
  saved views for `captureAnimation`.
- `graphty-element/api/*.api.md` is updated.

## What the reviews found and fixed

Six reviews (red team, Figma patterns, information architecture, accessibility, architecture and
a walk through every flow) ran each flow by real mouse and keyboard input. Fixed:

- The first file loaded into a new project drew nothing; it now draws, with a browser test.
- An event table could not become edges; Fields and the header Role menu now offer it, and the
  element guesses edge ends, weight (confidence, score) and label (name, title).
- Load more made a second source and dropped edges; it now pages into the same source.
- Undo changed the selection; it no longer does.
- The Server pop-over grew off-screen after Test; it stays usable.
- Condition cards wrote hand-made queries; they now use the element's rule leaves, and readers
  can add their own style layers.
- The join screen's Escape discarded the file; Cancel is now undoable and Escape is scoped.
- One Samples dialog with search, providers and sizes; every sample is added as a source.
- Export losses are compact rows and every loss code has words; the CSV false losses are gone.
- Timeline band outlined at 3:1, quiet while playing, reachable by Tab.
- Screen readers hear header type, role and joined icons; contrast fixes in compact-mantine.
- A build cycle, two failing test shards and a "Field not changed" bug on Kind of source/target.

## Still open

- Reloading a source after changing kinds keeps one edge per pair: the auth log goes from 400
  edges to 332, and its source row shows 91 (distinct pairs). The replace receipt uses the same
  pair rule, so this is a design change, not a small fix.
- Reloading a source drops the Edge time role: set Time last.
- A restored project gains an extra node column `id` (the project file round trip).
- OpenAlex Load more now needs an API key (401); the app shows only "Nothing more loaded" and
  the form has no key field. The first OpenAlex page is very large (14,546 nodes).
- The Neo4j row shows only the count, not "100 of N".
- The messy pair opens the table docked, not maximized (maximize only when edge ends cannot be
  guessed). Pick one: docked keeps the drawing in view, maximized matches the original flow.
- Smaller: the restore banner and image export legend note are still sentences; an ignored
  repeated-edges issue still shows in the Inspector; Neo4j years show as "1,964"; Neo4j node
  titles are raw ids; the NDEx row is named "NDEx", not the network; the data export loss list
  repeats node fill color; the recipe does not keep kinds or Different nodes.
- The graphty-element browser and Storybook test shards were not run.

## Decisions on the open questions

- **Drawn at once or data first:** a clean file draws at once and its guesses show in Fields; a
  file with problems still draws and opens the table with warnings; a second file opens the join
  screen.
- **Sources live on the left;** the right stays the inspector.
- **Several kinds of node from one event table is a data feature.** In an auth log, user "admin"
  and host "admin" are the same id; once the load makes one node, no style layer can split it.
  So kinds are set at load (Kind of source, Kind of target), shared ids get Same node / Different
  nodes, and the kind becomes an attribute that style layers and cards use.
- **Joining** matches a key column, as Tableau, Power BI and Cytoscape do, on a full-screen
  side-by-side screen with live match chips. One flow covers adding values to nodes, adding an
  edge file to a node file, and new nodes.
- **Replace** keeps everything and shows a receipt with Undo.
- **Hiding a column** is saved with the project and removes it from the table, filters, style
  pickers and export (export can add it back). It never deletes values.
- **Server paging:** Cypher and SPARQL page by ORDER BY and LIMIT; OpenAlex by cursor; a REST
  mapping pages only if it declares how (cursor, offset, Link header, next URL), else Load more
  is absent; NDEx and STRING download whole and have no Load more.
- **Timeline** is a strip above the bottom toolbar, a visibility window that combines with
  filters and never re-lays out.
- **Export** is the app's one Export dialog for image, video, data, styles, recipe and project.
