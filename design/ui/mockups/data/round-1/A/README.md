# Option A: Load page, then the Data panel

Every file goes through the full-width Data page, as it does today, but the page is much shorter.
A clean file shows one sentence saying how it will be drawn ("Each link joins source to target,
weighted by value. Nodes are named by id.") with Change beside it, the first rows under it, and
focus on Load, so Enter draws it. An unclear file opens only the columns the app is unsure about
(here: which column names the nodes, which one weighs the links), each with its type and how many
values do not fit. The load report appears only when it found something, one line per problem with
a count, a real row and its fix already set. After loading, the Data panel on the left is the home
for what loaded: one summary sentence, the sources, any filters, and every column with its type in
words, how full it is, and whether it came from the file or a run. A column's details and fixes
open in the inspector. Filtering is one condition card that pops up from the toolbar's Filter
button (Find also offers a condition when you type one). A second file or a newer copy reopens the
Data page, where Load becomes a split button: Add, Add columns, Replace.

## The screens

`flows.json` lists the 17 screens in order with one sentence each. Open any `.html` file in a
browser; each is a 1440 x 900 frame. The orange numbered labels mark what to look at and are not
part of the design.

## On the first screen

- The Data page: one mapping sentence with Change, the sample rows, Cancel and Load (focused).
- Only nonzero report lines, only uncertain column choices. Direction, file settings and the
  error limit are hidden while they hold their defaults.
- After loading: the summary sentence and column list in the Data panel, the drawing with names.
- Always on screen: Filter and Find on the toolbar, a header chip while a filter is on, Export on
  the table dock, Undo on every receipt.

## A few clicks away

- Fixing a column: right-click it in the Data panel (type, role, rename, hide, fill), with the
  number of values that will not convert shown before you change the type.
- Cleanup: a warning on a source opens what the load found in the inspector, each line with its
  own fix (combine repeated links, keep or drop self-loops, fill blanks), each one undo step.
- Server data: Open network data sits beside Open; Neo4j's form has Test before Load. A capped
  load shows Load more on the canvas and on the source; a node's menu has Expand and Collapse.

## Trade-offs

- For: it is what readers already find, and each job has one home: loading on the Data page,
  what loaded in the Data panel, one thing's details in the inspector, rows in the table.
- For: Replace is pre-chosen when Add would repeat every link, and the receipt names the style
  that no longer binds, so a monthly refresh is one drop plus one Enter.
- Against: there is still a page between the reader and the drawing for every file, even a clean
  one. Option C ("drop it, then confirm on the canvas") removes it.
- Against: the toolbar's Filter button and Find both lead to the condition card, so there are two
  doors to one card.

## Needs graphty-element

Every number on these screens has to come from graphty-element. These do not exist there yet:
the confidence behind "only the uncertain columns ask", the load report's repeated pairs,
self-loops and blank counts with an example row, the join's match counts (including "2 more
match ignoring case"), the Replace report (+12 / -3 / 40 changed and the style that no longer
binds), changing a column's type with a count of values that will not convert, cleanup actions,
export limited to shown rows and columns, and capped server loads with Load more and Expand.

## Critique

A red-team, accessibility and wording pass over all 17 screens.

Fixed in the screens:

- Numbers that did not add up. The Replace receipt now says 369 the same (40 changed plus 369
  the same is the 409 links already in the graph). The second file's "19 more match if case is
  ignored" is now 2: only 6 nodes lacked a value, so 19 could never match. The two left unused
  (MKI67, MUC16) now appear in the list of 6 nodes with no value on the next screen. The weight
  range now reaches 0.999, which the rows show.
- Summaries that said "one connected group" over drawings with plainly separate groups (the
  fraud ring and the supply chain) now give the number of groups.
- The node columns listed in the Data panel now match the table: stringId and pagerank were
  missing, and the table said "5 of 9" columns when there are 6.
- Load on a new graph is a plain button. It had a split arrow, but with nothing to add to there
  is nothing for it to offer; the split button now appears only when a graph already exists.
  Load's focus ring has a dark gap so it shows against the blue.
- The load report tints both rows of the repeated pair, not only the second.
- Row numbers in the file previews were gray at 3.4:1; now 5.6:1.
- The unclear file said "Two choices left:" with a check mark, which read as all clear; it now
  says "Check the two guesses below."
- The second file's three choices now use the same names as the Load button's menu: Add, Add
  columns, Replace.
- The expand limit (50, its default) is gone from the node's inspector.
- Callouts no longer say "the element" or promise an Undo the filter row does not show.

Still weak:

- The rename is caught twice. The Data page offers "Read lead_time as lead_time_days"; if the
  reader presses Enter without it, the receipt then reports the broken style. That is coherent,
  but the "one drop plus one Enter" claim only holds if the reader takes the first offer.
- The check mark beside the mapping sentence stays on the unclear file, where two choices are
  guesses. A neutral icon would be more honest.
- The Data panel column list will grow long on a wide file (dozens of columns) and nothing here
  shows how it collapses or is searched.
- "After loading" already shows a column from a Degree run, which could not exist the moment a
  file loads; it is there to show the origin label.
- The Neo4j form asks the reader to write a database query; there is no simpler path for someone
  who does not know the query language.
- Secondary text on a selected row measures 4.2:1, and white on the app's blue button 3.6:1;
  both come from the current app's theme, so the fix belongs in the shared theme, not here.
- Node labels overlap in the denser drawings (RB1 and MYC, PTEN and CDK12).
- These are pictures: none of the controls are real buttons, so keyboard order and screen reader
  names are not shown; focus is drawn only on Load.
