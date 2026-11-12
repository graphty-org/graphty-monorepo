# Option A: everything in the left panel

## The idea

The Data place, the 240px panel beside the graph, is where data is configured. Sources, roles,
attributes, warnings, joins and filters are compact property rows: a label, a dropdown, a count
chip. Settings that need more room open in a pop-over beside their row. The graph stays on screen
the whole time. Dropping a clean file draws it at once, as a drop does in Figma, and the panel is
where you correct it. The Data page opens only when the app is unsure about a role, for a table
with several kinds of node, for a database connection, or from Edit source. A second file opens a
Join section that is already filled in. Replace keeps everything and offers Undo afterwards. The
table dock only shows data.

## On the first screen

- A clean file: the drawing, the counts chip, the drop notice with Undo, and the roles as rows
  (Name, Source, Target, Weight).
- An unsure file: the Data page with only the unsure rows marked (a status icon and an amber
  outline). Everything else is folded under "Other columns". Load still works.
- After loading: one row per source, with its counts. A Warnings section appears only when there
  is something to fix: one row per kind of problem, with its count and its fix.

## A few clicks away

- An attribute row's context menu: Rename, Change type (each type shows how many values will not
  convert), Use as, Show in table, Hide.
- Filters: the toolbar's Filters button opens the Filters section with a blank condition row.
  Each condition has a live "X of Y" chip and Show only / Highlight. Steps, sets and time windows
  are in the same section.
- A source row's menu: Replace file..., Refresh from source, Edit source..., Rename, Remove.
- The Join button's arrow: Add as new nodes and edges, Open as a separate graph, Replace data.
- On a canvas node's context menu: Expand from source, with Depth, Limit and the capped count.
- Export lives in the main menu's Export dialog, beside Image and Graph file, with a Scope row
  (All, Filtered, Selection).

## Trade-offs

- For: the graph never leaves the screen, every change shows on the drawing at once, and there
  is one place to look for anything about the data.
- Against: a wrong guess is drawn before the reader checks it. The drop notice's Undo and the
  role rows are the only safety net.
- Against: 240px is tight. Long column names cut off in the dropdowns, and a wide file's
  attribute list scrolls. To keep the Filters section usable, the Nodes and Edges sections have to
  collapse (see the two-steps screen).
- Against: the Data page still appears for unsure files, event tables and databases, so there are
  two configuration places. The reader learns the panel first and meets the page only when the
  app needs a decision.

## Numbers that differ from the brief

The brief says "+19 match ignoring case" for the join. Only 6 nodes are left without a value, so
at most 6 more can match. The mocks say +4.

## Files

`flows.json` lists every screen with a one-sentence caption. Each `.html` file is one
1440 x 900 screen. The orange numbered notes are annotations, not part of the app. The dashed
violet "needs graphty-element" tags mark counts that graphty-element cannot supply yet.

## Critique

A red-team, accessibility and content review of all 22 screens.

### Fixed

- Unsure file: "Other columns" showed a count of 5 and five bare type icons. The file has 9
  columns and 5 are in use, so it now reads 4 and names them (ncbiTaxonId, nscore, escore, tscore).
- Filtered drawing: the table's padj header carried a sort arrow over rows that are not sorted.
  The arrow is gone.
- Replace: after the October file there are 129 nodes, but the kept filter still said "48 of
  120". It now says "51 of 129" on both screens.
- Replace pop-over: it said "Styles 3 kept", while the next screen shows the Tier style broke. It
  now says "2 kept" and "1 to fix", which leads into the warning row.
- Event table: repeated events are combined into one edge with a count, yet the file had exactly
  as many rows as edges (1,104,206). The file now has 1,486,930 rows, so combining visibly does
  something.
- Event table drawn: the node Name dropdown read "value", an internal word. It reads "id". The
  annotation that covered the "User 2,140" chip has moved.
- Expand from source: the context menu covered the clicked node's label, so nothing said the
  node was acct-4471. The menu now names the node at its top.
- Contrast: row numbers and placeholder text (#8c8c8c, about 4.1:1 on the dark panel) are raised
  to #a3a3a3 (4.5:1 or better).

### Remaining weaknesses

- White text on the app's blue (primary buttons, the highlighted menu item) measures about
  3.5:1. That is the app's current theme, not these mocks, so the fix belongs in compact-mantine.
- The Filters section, with its "+", shows on the very first screen of a clean file. It is
  empty, so it arguably breaks "no zero-count line on the first screen". Keeping it makes
  filtering discoverable; hiding it until the toolbar's Filters is pressed is the other choice.
- 240px is tight, as the trade-offs say: "In largest connected part" is cut off in the step
  row, and the attribute list in the filter dropdown runs to the bottom edge of the screen.
- The second filter step's attribute list shows only padj and log2FoldChange under Nodes, while
  the first step's list shows five. A reviewer will read that as a different list.
- Replacing suppliers.csv also changes the edge counts (+15, -3), though the edges come from
  ships_to.csv. That is right only if edges that pointed at missing suppliers now find them;
  nothing on screen says so.
- Two configuration places remain: the panel, and the Data page for unsure files, event tables
  and databases. Moving between them is not shown. Nothing shows how to get back to the Data
  page after Load either, except Edit source... in the source row's menu.
- Changing a role on a clean file redraws at once. There is no screen showing what happens
  to styles or analysis that used the old role.
- The screens are static. Keyboard focus order, focus rings on the property rows and the
  accessible names of the icon-only toolbar buttons cannot be judged from them. The build has to
  check these.
