# Data management mocks, round 2: the plan

Round 2 narrows round 1's three designs down to one structure, built on the look of round 1's option B. Five rules from the owner's review hold on every screen:

- The data configuration panel owns all data configuration: sources, each column's type, role and name, warnings, joins and filters.
- The table only shows data. It sorts, chooses columns and follows the selection and the filter. It holds no configuration.
- Quick changes go in context menus, on a source row, a column row or a node on the canvas.
- Settings are compact property rows (a label and a value), chips, counts, dropdowns and status icons. Sentences are never the interface.
- The word is "edges". "Link" appears only inside the algorithm name "Link prediction".

The three options below share that structure. They differ only in the parts that are still open:

- where the configuration panel sits, and how it relates to the Data page
- how a filter is started
- how Replace keeps the reader's work
- whether a clean file is drawn at once

Each option is drawn across the same flows, on 1440 x 900 artboards in the study build's frame:

- the 40px header
- the rail
- 240px panels
- the floating toolbar with seven buttons
- the table dock
- dark theme first, with the canvas light
- built from compact-mantine parts

The Figma product designer leads the visual and interaction design and reviews every screen for Figma patterns: property rows, sections with "+", pop-overs for advanced settings, context menus and hover affordances.

Inputs:

- `brief-flows.md`: the flows, re-derived from the persona workflows
- `brief-app.md`: the app as it is today, and the frame
- `brief-patterns.md`: what to copy from Figma, Tableau, Power Query, Airtable, Cytoscape and Neo4j

## The flows

Five key flows and the common Export, then three special cases. Each option has 22 screens.

| Flow                                                    | Screens                                                                                                                                                                                                                                                                                                                                                 | Data drawn                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1. Open my file, get a right drawing                    | 3: a clean file with focus on Load (option A draws it at once instead); a file the app is unsure about, with only the name and weight rows marked; the drawing with the nodes named and the counts chip                                                                                                                                                 | cat social network, 20 nodes, 29 edges; ovarian STRING TSV, 318 nodes, 1,104 edges, weight `combined_score`, name `preferredName` |
| 2. See what loaded, fix what is wrong                   | 2: summary rows and a Warnings section with one row per type, each with a count and an action; a column row's context menu with Change type, and the count of values that will not convert                                                                                                                                                              | fraud ring, 200 nodes, 612 edges, 4 warning types, 27 issues; `amount` with 1 blank of 500                                        |
| 3. Filter: show only what matches                       | 3: the filter entry (it differs per option); one condition row `[padj v] [< v] [0.05]` with the live chip `60 of 318 nodes`, and Show only / Highlight; the filtered drawing with a count on the toolbar's Filters button and the table at 60 rows                                                                                                      | ovarian STRING after the join                                                                                                     |
| 4. Join a second file onto this graph                   | 3: the dropped file with Join already chosen, a `Match [gene_symbol v] = [preferredName v]` row, match chips and `+4 match ignoring case [Use]`; the Join button's menu (Join, Add as new nodes and edges, Open as a separate graph, Replace data); the result, with the joined columns marked by their origin icon and two source rows                 | `expression.tsv`: 340 rows, 312 matched, 28 not in the graph, 6 nodes without a value                                             |
| 5. Replace with a newer copy, keep my work              | 3: the source row's menu (Replace file..., Refresh from source); the replace step (it differs per option), with the mapping carried over and the chips `+12 -3 40 changed`; the result, with a warning row `Style "Tier": column tier not found [Map v]` and Undo                                                                                       | suppliers.csv plus ships_to.csv, 120 nodes, 400 edges; September, then October                                                    |
| 6. Export the filtered numbers (common Export)          | 1: the app's Export dialog on Data, Node table (CSV), with a scope row `[Filtered: 60 of 318 v]` (All, Filtered, Selection)                                                                                                                                                                                                                             | ovarian STRING, filtered                                                                                                          |
| 7. One event table, several kinds of node (special)     | 2: the mapping with a Nodes section and "+", one row per entity column with its kind (`user [User v]`, `host [Host v]`, `process [Process v]`), edge rows, and `Repeated events [Combine: count v]`; the drawing with the kind chips                                                                                                                    | security-events-120k.csv, 120,418 nodes, 1,104,206 edges, 4 node types, 6 edge types                                              |
| 8. Query a database, load more, expand a node (special) | 3, each a different kind of screen: the connect form as property rows, where Test returns live data (the first 20 rows in a small grid and `40,000 match`) before Load; the source row reading `5,000 of 40,000 [Load more]`; a right-click on a node on the canvas for Expand from source, with `Depth [1 v]`, `Limit [50]` and the result `50 of 212` | a Neo4j query matching 40,000 under a limit of 5,000; fraud `acct-4471`, degree 37                                                |
| 9. Filter steps, sets and a time window (special)       | 2: two steps as an ordered list, each with a toggle and its own count (`60 of 318`, then `38 of 60`), `In largest connected part` in the column dropdown, Save as set and a Sets list; a time column condition as a range row with a small histogram, `30 days [v]` and step arrows                                                                     | ovarian STRING; fraud windows A (120 of 200 nodes, 340 of 612 edges) and B (132 of 200 nodes, 388 of 612 edges)                   |

**Not drawn this round, with the reason:**

- **Gene list to a network.** It uses the same connect form as flow 8, with a paste box, species and confidence in place of the query. Round 3 draws it if the form is right.
- **Combining two networks** (union, intersection, difference). Rare, and a later tier.
- **Recipes.** A later tier.

## The three options

All three share:

- the panel's sections: Sources, Summary, Warnings (only when there is one), Nodes, Edges, Joins (only after a join) and Filters
- the view-only table
- context menus on source rows, column rows and canvas nodes
- one undo step per change

Every count comes from graphty-element. A count it cannot supply yet carries a small "needs graphty-element" tag on the artboard.

### Option A: Everything in the left panel

**Structure:**

- The Data place in the left panel, beside the graph, holds every setting inline as property rows. Advanced settings open in pop-overs anchored beside a row.
- Dropping a clean file draws it at once, as a drop does in Figma. The Data page opens only when a role is unsure, or from Edit source.
- A second file, a join or a replace is set up in the panel's rows, without leaving the graph.

**Filter:** the toolbar's Filters button opens the Filters section of the panel with a blank condition row.

**Replace:** keeps everything. The change chips and Undo appear afterwards.

**What it bets on:** the graph never leaves the screen, and 240px is enough for property rows.

**Risk:** a wrong guess is drawn before the reader checks it, and a long column list in 240px scrolls.

### Option B: The Data page is the workbench

**Structure:**

- The rail's Data opens the full Data page:
    - the configuration panel on its left (sources, roles, columns, warnings, joins, filters)
    - the view-only table preview on its right
- Every file opens there with Load focused, a clean file included. A second file, a join and a replace also open there.
- The left panel beside the graph shows only a compact list of the sources and the active filters, with counts. Each item opens the page at that section.

**Filter:** the toolbar's Filters button opens a small popover over the canvas for quick conditions. Steps and sets are edited on the page.

**Replace:** asks first, in a small popover with three checkboxes that start on (Keep styles, Keep analysis, Keep filters), the change chips and Replace.

**What it bets on:** configuration is a separate task, done with room to see the rows.

**Risk:** it is a trip away from the graph for every change, and the filter has two homes.

### Option C: List on the left, details in the inspector

**Structure:**

- The Data place is a compact tree: sources, columns, warnings, joins and filters, each a row with a glyph, a name and a count chip.
- Selecting any row opens its property rows in the inspector on the right. This is the pattern the study build already uses for the filter step editor and for a selected attribute.
- The Data page is used only to open a file. A join and a replace open in the inspector, from the source row.

**Filter:** right-click a column row, a node or a table cell for "Filter by this value", which fills in the condition. "+" on Filters adds a blank one.

**Replace:** the inspector shows the source's mapping in a "replacing" state: the rows carried over, the chips, the keep checkbox (on), and Replace.

**What it bets on:** one pattern everywhere (pick on the left, edit on the right) that readers already use for nodes and styles.

**Risk:** two panels open at once leave the canvas narrower, and a context menu is less discoverable as the first way into filtering.

## Answers for the comparison page

- **Find, filter and the data card (point 6).**
    - Find goes to one node you know by name. It is the toolbar's find box, which already exists.
    - Clicking a node or an edge shows its data card in the inspector, which also exists.
    - Filter shows only the nodes and edges that match a condition (flow 3). Steps, saved sets and time windows are flow 9.
    - The table header gets sort only: no search and no conditions, because the table only shows data.
- **Newer copy (point 7).** Manual, never automatic.
    - A file from this computer has no live link to its original.
    - A number that changes without the reader asking breaks a weekly comparison and a reproducible result.
    - There are two commands on the source row: Replace file..., and Refresh from source for a web address or a server.
    - Opening a file with the same name or the same columns chooses Replace in advance.
    - Keeping styles, filters and analysis is on by default. The options differ only in whether you confirm before or undo after.
- **Second file (point 8).** Join is the default. It matches on node id and shows the match counts before you confirm.
    - A table of values adds columns to the matched nodes.
    - A file of edges adds its edges, and creates the nodes that are new.
    - Add, Open as a separate graph and Replace are in the Join button's menu.
- **Server loading (point 11).** These are now three different screens in three different places:
    - connect and query is a form
    - load more is a chip on the source row
    - expand is a right-click on a node on the canvas

    Test returns live data, the first rows and the match count, so you can confirm it is the right data before Load.

## Rules every screen follows

- The first screen shows none of these:
    - a later-tier control
    - a setting left at its default (Direction "As the file says", Error limit)
    - a zero-count chip
    - an internal word (Key, Edge id, Attribute as a role)
- There is no Warnings section on a clean file.
- The table dock holds no conditions, joins, export controls, column fixes or warnings.
- The toolbar keeps its seven buttons.
- Before loading the word is "column". After loading it is "attribute", as in the app today.
- Every number is one graphty-element returns, or the screen tags it "needs graphty-element".

## Questions for the owner

1. Which home for data configuration is right:
    - the left panel beside the graph (A)
    - the full Data page with the table beside it (B)
    - a list on the left with details in the inspector (C)
2. Should a clean file be drawn at once on drop, with the panel to correct it afterwards (A)? Or should every file stop on the Data page with Load focused (B, C)?
3. How should a filter start: the toolbar's Filters button opening the panel (A), a quick popover over the canvas (B), or "Filter by this value" from a context menu (C)?
4. Should Replace keep everything and offer Undo afterwards (A), or ask first with keep checkboxes (B, C)?
5. Should a server source (database query, gene list) stay a few clicks away for now, or come onto the first screen of Open?
