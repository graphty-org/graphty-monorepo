# Option C: drop it, then confirm on the canvas

Canvas first, the way Figma handles a pasted image: a file you drop is drawn at once, and a receipt
card on the canvas says what happened in one sentence ("318 proteins and 1,104 links. Nodes are
named by preferredName; links are weighted by combined_score. Undirected.") with Change and Undo.
Nothing asks you to confirm a clean file. Only a file graphty cannot read with confidence, or a
press of Change, opens the full Data page, and then only the unclear columns are open for a
choice. A second file dropped on a graph that is already open gets a small card on the canvas
with three choices: Replace, Add to this graph, Add its columns to the nodes. The likely choice is
already picked, and the match line shows before anything changes. Find on the toolbar takes
either words or a condition, and grows into the condition card where the toolbar was. The Data
panel turns into a running list of what happened to the data, in order: each load, join, replace
and cleanup, with its receipt and its own Undo. Any problem shows as one warning on the receipt,
which opens the load report.

The screens are 17 static 1440 x 900 HTML files, one per screen, listed with captions in
`flows.json`. Numbered yellow badges point at the parts the short note in each corner explains.

## On the first screen

- The drawing, right away, and a receipt that states the mapping in one sentence, with Change,
  Undo and Done. Done has the focus, so Enter keeps the drawing.
- A warning line on the receipt only when the load found something; a clean file shows none.
- The Data panel: one summary sentence, "What happened" (the steps), and "Columns", where each
  column shows its type in words, how full it is, and whether it came from the file, a run or a
  joined file.
- Find on the toolbar, which accepts a name or a condition such as "padj < 0.05".

## A few clicks away

- Change on a receipt reopens the Data page on that file, with the full mapping.
- The load report (the warning on the receipt), with a fix offered on each line that found a
  problem: combine repeated links, keep or drop self-loops, fill missing amounts. Each fix lands
  in the step list with its own Undo.
- A column's menu (click the column in the Data panel or in the table header) to change its type,
  role or name, or to hide it. Each type says how many values will not convert before you pick it.
- Export on the table dock: the node table as CSV, scoped to what is shown, with one line naming
  what the format leaves out.
- Open network data, beside Open: a form per source, Test before Load, then a capped load with
  Load more, and Expand on a node in the inspector.

## Trade-offs

- **For:** a clean file costs no clicks, and most files are clean. Every change to the data is
  listed and can be undone, which also answers "where did this column come from" and "what did
  last month's replace do".
- **For:** a newer copy or a second file never silently doubles the graph. The card on drop names
  the danger ("every one of its 117 suppliers would appear twice") before anything changes.
- **Against:** a wrong guess is drawn before anyone checks it. The receipt and Undo must be
  impossible to miss, and a reader who dismisses the receipt without reading it can work on a
  mis-read file. Option C relies on the drawing itself looking wrong when the guess is wrong.
- **Against:** the list of steps is a new idea for readers; nothing in today's app works that
  way. A study should check whether readers find Undo for an older step there or reach for the
  header undo.
- **Against:** cards on the canvas cover part of the drawing while they are open.

## Questions for the owner

1. Is drawing a clean file at once, with a receipt and Undo and no confirm step, right?
2. Should the step list replace the Sources section of today's Data place, or sit beside it?
3. Should the Filter button stay on the toolbar once Find can grow into the condition card?

## Notes on the numbers

- The expression join: 293 rows match exactly and 19 more match ignoring case, so after Use the
  totals agree with the fixture (312 matched, 28 rows not in the graph, 6 nodes with no value).
- The fraud `amount` column: 500 of the 612 links are transactions; 485 have an amount, 14 are
  empty (the load report's line) and 1 reads "N/A" and loads as a blank.
- Invented for these screens and not in FIXTURES: the STRING column names, the supplier names, the
  Neo4j load (1,846 nodes), and 391 links after the October replace.
- graphty-element cannot yet supply several of these facts: a join and its match counts, a
  Replace report (+12 / -3 / 40 changed, what no longer binds), the step list with Undo per step,
  counts of values that will not convert to another type, and export scoped to what is shown.

## Critique

A red-team critic, an accessibility specialist and a content designer reviewed all 17 screens
against the flows, the personas and the first-screen rule, and fixed what follows in place.

Fixed:

- Wrong numbers. The cleanup step said "607 links became 607"; it now says 612 became 607. The
  cleanup report still said "27 in all" after one fix; it now says "22 of 27 left", matching the
  step list. Replace said the October file has 132 rows; it has 126 suppliers. Export said "All 9"
  columns and the table "7 of 9"; the graph has 8 node columns.
- A contradiction. The filtered screen said export "still sees all 318", but the export screen
  opens on "what is shown: 60 of 318". The note now says runs see all 318 and Export asks.
- Columns that appeared from nowhere. degree and pagerank showed up after the join with no step
  that made them, and the protein column vanished after the join. Every expression screen now
  lists "Ran degree and PageRank" as a step and keeps protein in the column list.
- The join's match line read "to the node name", but the graph has no column called name; it now
  names preferredName. The fix-column screen's load step was missing its "27 things to check"
  warning, which every other fraud screen shows.
- Where a column came from was a bare "file" beside "from a run" and a bare file name; all now read
  "from file", "from a run" or "from expression.tsv".
- Contrast. Link blue (Undo, Change, Hide report) measured 3.1 to 4.5 to 1 on the panel and on
  selected rows; dimmed text 3.5 to 4.1 to 1 on selected rows; the Enter and Esc hints 2.3 to 1.
  All text on every screen now measures 4.5 to 1 or better. The ring around unmeasured nodes was
  pale yellow on a near-white canvas (under 2 to 1); it is now a darker amber (3.5 to 1). These
  are lighter or darker than the app's own colors; if the owner keeps this option, the fix belongs
  in compact-mantine's theme, not in these screens.

What an honest reviewer should still know:

- The core risk is unproven. A wrong guess is drawn before anyone checks it, and the mocks only
  show guesses that were right or flagged. No screen shows a file that was read wrongly and
  silently (say, a weight column taken as the name), so the claim that "the drawing will look
  wrong" is untested. That is the one screen to add next.
- Cards cover the drawing. The receipt, the report and the drop card sit over the canvas; in the
  join receipt one of the six ringed nodes is hidden behind it, so a reader counts five.
- Undo on an older step is drawn only as a word on the step. Nothing shows what Undo of the
  Opened step would do to the join and runs after it, which is the hard case for a step list.
- The cleanup report draws Keep in solid blue before anyone chose it, which reads as a choice
  already made.
- Static HTML: there are no real focus rings beyond the one on Done, no labels a screen reader
  could use, and no keyboard path is shown for Find's condition card or the column menu.
- On the canvas, some labels collide (BRCA2 over BRCA1, ERBB2 under a node). That is the mock's
  drawing, not a design claim, but it makes the "named nodes" screen look less clean than intended.
- Open network data is described as sitting beside Open in the main menu and on the start page,
  but no screen shows either place, so how a reader finds it is not shown.
