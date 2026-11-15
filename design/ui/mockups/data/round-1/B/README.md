# Option B: the table is where data lives

## The idea

The graph's data is a spreadsheet under the drawing, and almost every data job happens on a
column. The Data page's preview (before loading) and the table under the canvas (after loading)
use the same column header: a type icon and name, the type in words with the column's role (Name,
From, To, Weight, Kind, Time) and where it came from (the file, a run, a joined table, counted),
and a bar showing how full the column is, with the count of values that do not fit ("14 blank",
"6 not dates"). So a column's menu works the same before and after loading. After a load the
table opens once by itself, with one sentence above the rows saying what loaded. Conditions are
set from a column's menu or typed into find, and they gather in one card above the rows that ends
in Select or Hide the rest. A second file shows up as new columns in the table, with the match
line above them, before anything changes. Export is the table's own button and exports what the
table shows. The Data panel on the left shrinks to the list of sources.

## On the first screen

- Opening a file: one sentence stating the mapping, with Change; the sample rows under the shared
  column header; focus on Load. An unclear file asks only about the unclear columns, in small
  pop-outs under those columns' headers, and Load still works.
- The load report, only when something is wrong: one line per kind of problem, with a count, the
  row where it starts and a fix.
- After loading: the drawing, the table under it with the summary sentence, and the header chip
  when a filter is on.
- Find on the toolbar takes a name or a condition in the data's own words ("padj < 0.05").
- A file dropped on an open graph: Replace, Add to this graph, or Add columns to nodes, with one
  chosen from how its headers and ids match, and the match line before confirming.
- Export on the table.

## A few clicks away

- A column's menu: type (each choice says how many values would not convert), role and what a
  weight measures, rename, show only rows where, sort, hide.
- Open network data, a tab beside Open a file on the Data page: one form per source, Test before
  Load, a limit on how much loads.
- Expand and Collapse on a node's own menu; Load more where a capped source is listed and in the
  table's summary.
- Cleanup offers on the same "things to check" lines above the table, each one undo step.

## Trade-offs

- For: readers already look for data in the table (18 of 21 looked for export there; 6 of 7 went
  to the column to say what a number means). One column header teaches type, role and fullness
  once and is reused everywhere, so there is one place to fix a column.
- Against: the open table takes 240 to 410 pixels of canvas height, and the drawing is shorter on
  every screen that shows it. A reader who closes the table and never reopens it loses the summary
  sentence, the condition card, the "things to check" lines and Export (the header filter chip and
  the toolbar's Table and Filter buttons are the only way back).
- Wide files: columns past the dock's width scroll sideways, so a misfit count on a far-right
  column is easy to miss. The Data page's question pop-outs and the "things to check" lines repeat
  the count to make up for this.
- Needs graphty-element: counts of values that would not convert for each type, the join's match
  line (matched, not in the graph, no value, matches ignoring case), the Replace difference (+12,
  -3, 40 changed, styles that no longer apply), a column's origin, and exporting only the rows
  shown.

## Files

`flows.json` lists every screen with a one-sentence caption. Each `.html` is one 1440 x 900
screen; the yellow numbered notes are annotations, not part of the app.

## Critique

A red team critic, an accessibility specialist and a content designer opened every screen at
1440 x 900 and checked it against the flows, the personas and the first-screen rule.

### Fixed

- Clipped column headers. The header is the idea of this option, yet "preferredName",
  "interactionType", "Whole number, counted", "expression.tsv" and the volume column's
  "Weight, capacity" were cut off with an ellipsis on 13 screens. The columns are widened so
  every header reads in full; only the long STRING ids in the unclear-file preview still cut
  off, as they would in the real table.
- A zero line on a first screen: the clean file said "Nothing to fix". Removed.
- Numbers that did not add up. The second file offered "19 more match ignoring case", but only
  6 nodes lacked a value, so at most 6 more could match; it now says 4 (screen and flows.json).
  The weight question said "0.40 to 0.99" over values of 0.999; now "0.400 to 0.999".
- The question about names asked about preferredName only, though the file has preferredName_A
  and preferredName_B; it now names both.
- The cleanup screen offered different fixes from the load report for the same problems ("Fill
  with 0" against "Count each as 1", "Drop them" against "Leave out"). The cleanup lines now use
  the report's words, as the option says they are the same lines.
- "+12, -3, 40 changed" did not say what was counted. The Replace card, the receipt and the
  summary now say "12 suppliers added, 3 gone, 40 links changed". "2 runs (run again on the new
  data)" read as an instruction; it now says the runs were redone. An unchanged row showed "--";
  it now says "same".
- The Replace screen's title said "Add to suppliers" while Replace was chosen; it is now "Bring a
  file into suppliers".
- After adding a second file, the drawing recolored its nodes in four colors that nothing asked
  for and nothing explained. Adding columns does not style anything, so the nodes keep the
  default color.
- Load more said "Load more" in the sources list and "Load 5,000 more" in the table; both say
  "Load 5,000 more".
- The same table was called Edges, Links and "links" depending on the screen. Table names now
  say Edges, as the real app does; sentences still say links.
- Export offered "with runs and expression", an internal word; it now says "as in the table".
- Contrast: "is less than" in the highlighted find suggestion measured 2.5:1; now white. Two
  annotations covered app content (a gene label, and one ran off the right edge); moved.

### Remaining weaknesses

- Contrast inherited from the app. The row numbers and the dimmed "100%" labels use the app's
  dimmed gray (#8c8c8c), which measures 4.2:1 on the panel and 3.5 to 3.8:1 on highlighted rows;
  white on the app's primary blue (#0c8ce9) measures 3.5:1. Both are below the 4.5:1 that small
  text needs. The mocks keep the app's colors; the fix belongs in compact-mantine's tokens.
- These are pictures: there is no keyboard focus order, only a drawn ring on Load. Whether a
  column's menu, the questions under the headers and the condition card can be reached and
  answered by keyboard is not shown.
- A dropped file reaches two different surfaces. Replace opens a full Data page with three cards;
  a second file opens a strip above the table with three tabs ("Replace data" there, "Replace
  suppliers-sept.csv" here). The option claims one drop flow and draws two.
- Several "pick one" rows show one choice already highlighted (Keep on self-loops) and others
  with none, so a reader cannot tell whether the highlighted one was chosen by the app or by them.
  The choice is also shown only by color.
- The table takes 240 to 410 pixels of every drawing, and when it is closed the summary, the
  condition card, the things to check and Export all go with it (see Trade-offs). Nothing drawn
  shows the closed state or the way back to these.
- Order of the priorities. The priority review moved loading from a server to the secondary tier
  and Expand to the advanced tier. Open network data is a tab beside Open a file, which fits;
  Expand is the first item of a node's own menu, which is more prominent than advanced.
- The fix-column screen says its menu is the same after loading, but only the before-loading
  state is drawn.
- Wide files still scroll sideways, so a misfit count on a far-right column can be missed.
