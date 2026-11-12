# Option B, round 2: the Data page is the workbench

## The idea

Data configuration is its own task, done on a page with room to see rows. Rail Data opens the
full Data page: a configuration panel on the left (Sources, Nodes, Edges, Warnings, Joins,
Filters, Sets, each a compact section of property rows with "+" where the list grows) and a
view-only table preview on the right. Every file opens there with Load focused, a clean one
included, and so do a second file (Join), Replace, a database query and the filter steps. The left
panel beside the graph is only a compact list: the sources, the active filters with on/off
toggles, any warning that needs a fix, and the layers. Each row opens the Data page at that
section. The table, both on the page and in the dock under the graph, only shows rows: no types,
joins, conditions, warnings or export in it.

## On the first screen

- Opening a file: property rows for the guessed roles (Name, Kind, From, To, Weight), counts as
  chips on the source row, the other columns collapsed, the preview on the right, Load focused.
  A clean file asks nothing. An unsure file marks only the unsure rows with a warning icon.
- After loading: the drawing with a counts chip, and the compact list beside it.
- When something is wrong: a Warnings section in the panel, one row per kind of problem with its
  count and one action (Show, or a dropdown). No Warnings section on a clean file.
- The toolbar's Filters button, with a count badge when a filter is on.

## A few clicks away

- Quick filter: toolbar Filters opens a small popover over the canvas. Pick a column, then one
  condition row `[padj] [<] [0.05]` with a live count chip and Show only / Highlight.
- Filter steps, In largest connected part, saved sets and time windows: the Filters section of the
  Data page.
- A column's type, role and name: right-click its row on the Data page. Change type shows how many
  values convert and how many go blank before it applies.
- Join: drop a second file. Join is pre-chosen with the match row and match chips; Add as new
  nodes and edges, Open as a separate graph and Replace data are in the Join button's menu.
- Replace: right-click a source row, Replace file... (or Refresh from source for a web or server
  source). A popover asks first, with change chips and Keep Styles / Analysis / Filters, all on.
- Database: Open network data. Test runs the real query and shows live rows and the match count.
  Load more is on the source row; Expand from source is on a node's right-click menu.
- Export: the app's one Export dialog. The only data-specific row is Rows: All, Filtered or
  Selection.

## Trade-offs

- For: configuration has room. Rows and the panel are side by side, so a reader checks a guess
  against real values before the drawing exists. One home for every data setting.
- Against: every configuration change is a trip away from the graph. The compact list's deep
  links and the quick filter popover soften this, but a reader fixing three columns in a row
  leaves the drawing each time.
- Filter has two entry points: the toolbar popover for one condition, the Data page for steps
  and sets. Both edit the same filter list (the popover's condition is step 1 on the page), but
  readers may not know where a step was made.
- Every file, even a clean one, takes one Enter on the Data page before it is drawn.
- Needs graphty-element: role guesses with how sure each is, per-type convert counts, join match
  counts (matched, not in graph, nodes without a value, matches ignoring case), the replace
  difference (+ nodes, - nodes, edges changed, styles whose column is gone), filter and expand
  counts before running, and the query test preview.

## Notes on the numbers

- The join's ignoring-case row says +4, not +19. Only 6 nodes have no value, so at most 6 more
  can match.
- Expand: the menu screen asks for depth 2 and a limit of 50 and shows 212 nodes within two steps
  before it runs; the result screen shows the 50 it loaded.
- The database query returns one row per edge, so a limit of 5,000 loads 5,000 edges (3,140
  nodes), and the expand adds 50 nodes and 50 edges to that.

## Files

`flows.json` lists every screen with a one-sentence caption. Each `.html` is one 1440 x 900
screen; the yellow numbered notes are annotations, not part of the app.

## Critique

A red team, accessibility and content review of these screens. Fixed in the files:

- Numbers that did not add up. The database load said 5,000 nodes and 9,812 edges from a query
  capped at 5,000 rows of edges; it now says 3,140 nodes and 5,000 edges. The expand menu asked
  for depth 1 (37 neighbors) but the result was depth 2 (50 of 212); the menu now asks for depth
  2 and shows 212. After the join, the blank rows were ERBB2 and ATM, which the join screen had
  matched; they are now MYC and CCNE1, the two that differ only in case. go_terms now shows its 6
  blanks like the other joined columns. Replace said "40 edges changed" and then showed the edge
  file growing from 400 to 404, though only the node file was replaced; it now says 40 nodes
  changed and the edge file stays at 400. The time window lit 45 days of the histogram for a 30
  day window starting in January; it now lights the right bars.
- Names that did not match. The join matched on "preferredName", a column the graph does not
  have (its node column is name). The replace warning said "Style Tier", but the layer is called
  Tier colors. After replacing, the source row still read suppliers.csv; it now reads
  suppliers-oct.csv.
- A claim the screen did not show. Refresh from source is said to be only for a web or server
  source, but the source row looked like a local file; the row now shows where it came from, and
  the note says the blue dot means the web copy is newer (refresh stays manual).
- Wording: "4 types, 27" on Warnings is now 27; "8 node, 3 edge" (wrong: one edge column is
  unused) is now "7 more"; unexplained "100%" on full columns is gone; "Analysis, rerun" is now
  "Analysis (runs again)"; Export no longer offers "Selection: 4" when nothing is selected.
- The first screen of an unsure file listed every column, against this option's own rule; the
  other columns are collapsed to "1 more".
- Clipping and cover-up: chips no longer shrink (the "6 kinds" chip was cut to "6 kind"), the
  database address no longer runs out of its field, and the numbered notes no longer cover the
  "+" on Nodes, the Show button or table values they point at.
- Contrast: the faint gray text (counts, menu headings) was about 4.2:1 on the panel and the
  placeholder about 2.5:1; both now pass 4.5:1.

What an honest reviewer should still know:

- Every configuration change leaves the drawing. Fixing three columns is three trips to the
  Data page and back; nothing here shows the drawing update while the panel is open.
- Filtering has two homes (the toolbar popover and the Data page Filters section). The screens
  never show a step made in the popover appearing as step 1 on the Data page, which is the claim
  that makes the two homes acceptable.
- A clean file still costs one Enter on the Data page. For the common case that is a screen the
  reader did not need.
- The toolbar icons have no visible labels, and the static mocks do not show focus order or
  keyboard paths for the context menus (right-click on a source, a column or a node). Each needs
  a keyboard route (a "..." button or Shift+F10) before it is built.
- Warnings on the graph page appear in the compact list (replace) but most warnings live only on
  the Data page; a reader on the graph page may not see that a join left 6 nodes blank.
- The joined-column tint and the green/amber/red chips rely partly on color; each also carries
  an icon or a word, but the table's tint for joined columns has no other cue.
- The event table screen offers no way to see or change how repeated events combine beyond the
  one dropdown, and the time window is drawn only on the Data page, not on the graph.
