# Tier 4 round 1: visual walkthrough of the data screens

Build 79ed770292 (graphty@0.8.92), served from the frozen copy named in `../../../criteria.md`, driven
with `tool/real.mjs`. Four sessions, every screenshot looked at, small text read from 2x and 3x crops:

| Session | Scheme, size | What it covers |
| ------- | ------------ | -------------- |
| `visual/v1-pantries-light/` | light, 1440 x 900 | start screen and the network data box; pantries.csv open; Sources "+"; the join screen with deliveries.csv; the joined Sources rows; an issue list; Fields "+" and a Label row; Filters "+" and a date card; the header menu and its Type submenu; the Edges table; Export on Data |
| `visual/v2-gauges-dark/` | dark, 1440 x 900 | gauges.csv's issue list and all three fixes; a yes/no card with a second condition; a date card switched to Select; the selection |
| `visual/v3-narrowed-900/` | light, 900 x 700 | the T68 start (a Data source card on); Export at the small size; Sources "+" > Network data... from inside a project |
| `visual/v4-join-900-dark/` | dark, 900 x 700 | the join screen at the small size; Fields' edge Weight row with "Higher means" |

Severity follows `../../../criteria.md` (4 data wrong with no sign, 3 blocks most people or is misread, 2
friction, 1 cosmetic). No finding here is rated 3: none has yet had a reader who paid for it. Two
items to watch in the sessions are marked "watch". "Known" means the backlog or `decided.md` already
holds it; it is listed so the report has it by screen.

## Summary

- 0 findings at severity 3 or 4.
- 14 at severity 2 (3 of them already known), 15 at severity 1.
- The two strongest visual themes: **one mark, two meanings** (the link glyph means both "from a web
  address" and "joined"; a column's kind glyph differs between the table, Fields and the Filters
  picker) and **the deciding text is the smallest** (filter card titles and summaries, the join's
  "1 not in graph", the export's loss line, the web address box).

## Findings

### Several screens

1. **Severity 2 -- the link glyph means two things.** A joined local file's Sources row draws the web
   address glyph, the same mark T60's address source gets, so `deliveries.csv`, picked from the
   computer, reads as "came from the web". The app has a separate join glyph (`GLYPHS.join`, used for
   the row menu's Edit join), but `SourceRow.tsx` maps `join` to `GLYPHS.webAddress` (line 19 at the
   build). The Edges table's joined `trips` column carries a link mark too. Evidence:
   `visual/v1-pantries-light/07.png`, `13.png`, `23.png`. Owner: graphty app. Smallest change: draw
   the join glyph for a joined source.
2. **Severity 2 (watch T62) -- a column's kind has three looks.** The table header, Fields' column
   list and the Filters picker draw a column's kind with different glyphs: `families` is the
   category mark in the table and `Aa` in Fields and the picker; `volunteer_run` is a tag in the table
   and three circles in Fields; `opened` (B `installed`) is `Aa` (text) in the table and in Fields but
   a calendar in the Filters picker while its Type is still text. T62 is graded by the header glyph,
   and a reader who saw the calendar in the picker may take the column as already a date. Evidence:
   `visual/v1-pantries-light/15.png` (Fields list, header row), `17.png` (picker), crops of each;
   `visual/v2-gauges-dark/05.png` (installed). Known for `families` (backlog, T66A-15). Owner: graphty
   app: the header uses `table/typeIcons.ts`, the picker `VALUE_GLYPHS`, Fields its own `TypeGlyph`;
   one map from the element's column facts, used by all three.
3. **Severity 2 -- a blank list box is drawn as a finished field.** A new yes/no card opens on an
   empty select with no placeholder, and Fields' edge Weight row adds "Higher means" as an empty
   select; both look like fields that are done, though the weight is not read until "Higher means" is
   chosen (answers.md, T64). Evidence: `visual/v2-gauges-dark/06.png`, `07.png`;
   `visual/v4-join-900-dark/05.png`. Owner: graphty app (a placeholder that names the choice, such as
   "Choose...", in the words the content designer picks).
4. **Severity 1 -- the warning glyph has two colors.** Orange on Sources rows, table headers and the
   issue list; black on the join screen's "1 repeated key". Evidence: `visual/v1-pantries-light/06.png`
   (crop of the chip row) against `04.png`. Owner: graphty app.
5. **Severity 1 -- selection has two colors.** Selected nodes get a gold ring on the canvas and an
   olive green row fill in the table. Evidence: `visual/v2-gauges-dark/12.png`. Owner: graphty app
   (the table's row fill); the ring is the element's.

### Network data dialog and the web address box (T60)

6. **Severity 2 -- the address box is the smallest, last thing in the dialog.** Three large service
   cards (13 px titles, 60 px tall) come first; the address, the case T60 and most readers have, is a
   one-line 11 px box under a small label. The only control in the box is an upload arrow (Choose
   file), which reads as "send" inside an address box; decided.md R8 asked for an Open button beside
   it, and the build has none (answers.md, T60). Evidence: `visual/v1-pantries-light/02.png`;
   `visual/v3-narrowed-900/05.png` (from inside a project). Owner: graphty app.
7. **Severity 1 -- the monogram tiles mix cases.** "ND", "N4j", "API". Evidence: the same screenshots.
   Owner: graphty app.

### Sources rows

8. **Severity 2 (known) -- the second file's name is cut to one letter.** After a join the row reads
   "d.." (B "f..."): the counts and the issue chip keep their room and the name gives way, as
   decided.md R11 and "A source row's counts are drawn whole" chose; the tooltip names it. The first
   row's name is also cut ("pantries...", "gauges....") while its issue chip shows, though about 40 px
   stay free at the row's end. Evidence: `visual/v1-pantries-light/04.png`, `07.png`, `08.png` (crop);
   `visual/v2-gauges-dark/01.png`; `visual/v4-join-900-dark/05.png`. Owner: graphty app. Not
   re-proposed: the decision is binding; recorded for the report.
9. **Severity 2 (known) -- the first file's issue chip disappears after a join.** pantries.csv's row
   loses its "2" while the table still says "With issues 2" and its headers keep their warning marks.
   Evidence: `visual/v1-pantries-light/07.png`, `13.png`. Backlog T61A-6, T66B-12. Owner: graphty app.
10. **Severity 1 -- the counts of two rows do not line up.** The first row's "12" chip starts at x 215,
    the second row's "13" at x 128. Evidence: `visual/v1-pantries-light/07.png`. Owner: graphty app.

### Join screen (T61)

11. **Severity 2 -- four counts, four looks, and the warning is the plainest.** "18 edges added" is an
    orange chip, "1 new node" a blue chip, "1 not in graph" a gray chip with visibly smaller text
    (about 8 px against 11 px), and "1 repeated key" -- the one T61 asks the reader to notice -- is
    plain text after a black glyph, not a chip; at 900 px it drops to its own line. decided.md R13
    made all four chips styled like "With issues". Evidence: `visual/v1-pantries-light/06.png` (2x
    crop of the header); `visual/v4-join-900-dark/03.png`. Owner: graphty app.
12. **Severity 1 -- the two tables beside each other use two row heights** (33 px on the left, 41 px on
    the right), so rows never line up across the divider, and the two panes are headed two ways (a
    "12 nodes" chip; "deliveries.csv 19 rows" as text). Evidence: `visual/v1-pantries-light/06.png`.
    Owner: graphty app.
13. **Severity 1 -- "Ignore case" and "Ignore spaces" boxes sit above their text's center.** Evidence:
    the same crop. Owner: graphty app (or compact-mantine if the Checkbox is its).

### Fields (T63, T64)

14. **Severity 1 -- rows start at two left edges.** Location and Label rows have a glyph and their
    names start at x 91; Id and "Rows are" have none and start at x 73. Evidence:
    `visual/v1-pantries-light/04.png`, `16.png`. Owner: graphty app.
15. **Severity 1 -- Fields "+" and the header's Type submenu are text-only.** Sources "+" draws a glyph
    per item (decided.md R7: every Data menu uses the Style "+" grammar); the role menu does not, and
    the Type submenu (text, number, yes/no, date, category) shows none of the glyphs the header will
    switch to, so it never teaches them. Evidence: `visual/v1-pantries-light/14.png`, `21.png`. Owner:
    graphty app.

### Filters cards (T65, T66)

16. **Severity 2 -- the card's title and its resting summary are its smallest text.** The field name
    ("opened", "telemetry, depth_cm") is about 8 px bold while "Add a condition" and the count chip are
    11 px; a written card rests as an 8 px gray sentence over two lines ("telemetry is Yes and depth_cm
    is between 70 and 210"). The name is what tells two cards apart. Evidence:
    `visual/v1-pantries-light/19.png` (3x crop); `visual/v2-gauges-dark/12.png`. Owner: graphty app
    (`data-place.css`, R4's header).
17. **Severity 2 -- removing a card and removing a condition look the same.** The card's X and each
    condition's X are the same glyph at the same size, stacked in one column about 50 px apart.
    Evidence: `visual/v2-gauges-dark/09.png`. Undo brings a card back, so friction, not loss. Owner:
    graphty app.
18. **Severity 2 (watch T65) -- a Select card and a Hide card look the same at rest.** Only the 8 px
    segmented control differs; the count chips are the same blue chip whether they count what stays
    or what is marked. Evidence: `visual/v2-gauges-dark/12.png`. R4's re-test question ("which of your
    two rules marks some while leaving everyone in the picture?") depends on it. Owner: graphty app.
19. **Severity 1 -- the dark dropdown has no edge.** The match list opens on a background almost the
    panel's, with no visible border. Evidence: `visual/v2-gauges-dark/07.png` (crop). Owner:
    compact-mantine (Figma-locked: the owner's call).

### Issue list (T67)

20. **Severity 2 -- a suggestion is drawn as a fault.** "11 values could be yes/no" gets the same
    warning glyph as "1 not a number", and the table's "With issues 11" then counts every row.
    Evidence: `visual/v2-gauges-dark/02.png`, `01.png`. Owner: graphty app (the kind of each issue
    should come from the element as a fact, if it does not already).
21. **Severity 1 -- the first fix is primary in one list and not in another.** "Add nodes" is a filled
    green button in deliveries.csv's list; "Make blank", "Trim" and "Read as yes/no" are outlined;
    "Ignore" is bare text in both. Evidence: `visual/v1-pantries-light/11.png`;
    `visual/v2-gauges-dark/02.png`. Owner: graphty app.
22. **Severity 1 -- a warning glyph with 0.** With every issue fixed and the list still open, the row
    chip reads "warning 0" until the list closes. Evidence: `visual/v2-gauges-dark/04.png`. Owner:
    graphty app.

### Export on Data (T68)

23. **Severity 2 (known) -- "Advanced" is a lone 10 px green glyph on its own row**, with no label,
    its state shown only by color, under "No styles". Evidence: `visual/v1-pantries-light/25.png`
    (crop), `26.png` (hover: tooltip "Advanced"); `visual/v3-narrowed-900/04.png`. Backlog T68B-15.
    Owner: graphty app.
24. **Severity 1 -- the loss line is smaller than its link.** "Lost in CSV: positions not written, ..."
    is about 8 px; "Details" beside it is 11 px. Evidence: the same crop. Owner: graphty app.
25. **Severity 1 -- Format and Table are side by side at two heights** (24 px and 20 px), so their
    bottoms do not align. Evidence: the same crop. Owner: graphty app (or compact-mantine's Select
    sizes).
26. **Severity 1 -- a hovered page looks selected.** In the dialog's page list the hover fill is the
    selected fill (both rgb 245); only the selected item's weight differs. Evidence:
    `visual/v3-narrowed-900/04.png` ("Data" selected, "Project" under the pointer). Owner:
    compact-mantine `PageList` (Figma-locked: the owner's call).

### Inspector beside the data screens

27. **Severity 1 -- three small faults.** "12 nodes joined to no other no..." is cut mid-word; a graph
    with no edges draws its degree histogram as one solid gray slab (bright in dark), which reads as a
    loading or broken chart; the selection summary wraps a number range so "44.44" sits alone on its
    own line. Evidence: `visual/v1-pantries-light/04.png`; `visual/v2-gauges-dark/01.png`, `12.png`.
    Owner: graphty app.

### At 900 x 700 (not a study size)

28. **Severity 2 -- the table's bar collapses.** The Edges tab is cut to "Edge" or gone, the "12 of 13
    nodes" count disappears, "Shown" is clipped to "how", and "Columns: 8 of 8" becomes "C...".
    Evidence: `visual/v3-narrowed-900/01.png` (3x crop); `visual/v4-join-900-dark/05.png`. Owner:
    graphty app. For the screenshot audit to confirm.
29. **Severity 2 -- the join screen gets 362 of 900 px.** The Data panel and the inspector stay open,
    so both file names in the join's header are cut ("flows....", "gauges....") and each table shows
    one column. Evidence: `visual/v4-join-900-dark/03.png`. Owner: graphty app.

## What holds up

- After "Make blank" the column turns into a number at once: right-aligned values and the `#` glyph
  (`visual/v2-gauges-dark/03.png`). After Type > date the cells read "Mar 2, 2015" and the header
  takes the calendar (`visual/v1-pantries-light/22.png`).
- The top bar's "5 of 13 nodes, 4 of 18 edges" and the table's "Shown / All" agree with the cards.
- The export preview in a monospace block shows exactly what will be written.
