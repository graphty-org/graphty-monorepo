# Tier 4 round 1: screenshot audit of the data screens

Build: 79ed770292 (graphty@0.8.92), served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292`. Window sizes:
1200 x 900 and 900 x 700. Audited 2026-10-30 by the design engineer.

## What was captured

Every screenshot below was looked at. Paths are relative to
`design/ui/studio/tier4/rounds/round-1/expert/engineer/` (the screenshots stay on disk, not in git).

| Walk | Start | Screens | Scheme |
| --- | --- | --- | --- |
| `bars-<size>/sessions/data-screens-<size>/` | empty app | start screen, web address box (from the start screen and from Sources +), Sources +, the join screen, after the join, the issue list, Fields +, the Filters picker, Export on Data | dark |
| `gauges-<size>/` | gauges.csv open on Data | header menu, Type submenu, a date column, the issue list (three issues), Fields + (node fields), an empty Time row with its list, the Filters picker, a sorted date column, Export with GraphML | light |
| `volunteers-<size>/` | volunteers.graphml ranked by PageRank | Data place, a category card (role, Is any of, staff ticked), a number card (hours, Between), the collapsed card summary | light |
| `narrowed-<size>/` | two files joined, a Data source card on | the Edges table with Shown and All, Export on Edges, its Scope list, a source row's menu | light |
| `cards-<size>/` | gauges and flows joined, tidied | a yes/no card, a date card (Before 2005) on Hide and on Select, the selection inspector, the Edges table, the Filters picker with nothing found | light |

The `bars` walks are `tool/bars.mjs --tier 4 --size <size>`; besides the screenshots they measure
cut text (`bars-<size>/bars.json`, "bar10") and axe. The other walks are `real.mjs` sessions
started with `REAL_VIEWPORT=<size>`; each was ended.

## Findings

Severity: 4 data lost or wrong with no sign; 3 a task blocked for most people or a result a reader
would misread; 2 friction a person recovers from; 1 wording or cosmetic; 0 not a problem.
"Known" means the dry run's backlog (`../../../backlog.md`) already holds it; it is listed because
it is still on screen on this build.

No severity 3 or 4 problem was found. No screen shows "links" or "ties" for edges (the walk's
vocabulary files hold neither word).

### Severity 2

1. **The table dock's header row overflows at 900 x 700, and the issues chip is drawn over the
   Edges tab.** With one file, "Columns: 8 of 8" is cut to "Columns:..." and the node count is
   dropped; after a join the "With issues 2" chip covers the Edges tab ("Edge" shows); with a Hide
   card on, the Shown / All control reads "how" and the Edges tab is not visible at all; on the Edges
   table the Nodes tab reads "lodes". The bar 10 check of `bars.mjs` confirms "Columns: 8 of 8" is
   cut with no way to read it whole. At 1200 x 900 the row fits.
   Screen: the table dock (Data place). Evidence: `bars-900x700/sessions/data-screens-900x700/04.png`,
   `.../08.png`, `cards-900x700/08.png`, `cards-900x700/09.png`, `cards-900x700/10.png`,
   `narrowed-900x700/02.png`. Package: graphty app (the table toolbar's layout).

2. **Source names in the Sources list are cut to one letter once a second file is added**, and cut
   even with one file. After the join the second row reads "d.." (deliveries.csv) and "f..."
   (flows.csv) at both sizes; one file alone reads "gauges....", "pantries..." and "voluntee..." at
   1200 x 900 with the panel at its default width. The row's chips keep their room and the name
   gives way first; the whole name is only in the accessible name, with no tooltip (bars.json reads
   it as readable by "name" only). Known (the backlog's "flows...." row; the decided "name truncates
   last" is not built), and now worse: one letter.
   Screen: Data > Sources. Evidence: `bars-1200x900/sessions/data-screens-1200x900/08.png`,
   `cards-1200x900/03.png`, `gauges-1200x900/01.png`, `volunteers-1200x900/02.png`.
   Package: graphty app (the source row; the chips are compact-mantine's EntityChip, used as
   designed).

3. **A column's kind is drawn with different glyphs in the table and in the lists that offer
   columns.** gauges.csv: the table draws depth_cm (a mixed column) with the shapes glyph and
   telemetry (category) with the tag glyph; the Fields Time list and the Filters picker draw depth_cm
   as text (Aa) and telemetry with a three-circle glyph. The same reader sees two icon sets for one
   fact. Known (repeated in every dry-run pass); still on this build.
   Screen: table header, Fields + list, Filters picker. Evidence: `crops/glyphs-1200.png` (cut from
   `gauges-1200x900/01.png`, `04.png`, `09.png`, `12.png`). Package: graphty app.

4. **Export's Columns chip says "1 of 1" for the Edges table while the table says "Columns: 3 of 3"
   and the preview writes three columns** (source, target, trips). A reader checking what will be
   written sees one column. The Nodes table's chip matches (8 of 8).
   Screen: Export on Data, Table Edges. Evidence: `narrowed-1200x900/03.png` against
   `narrowed-1200x900/02.png`. Package: graphty app (the chip's count; if the count is read from
   graphty-element's export description, the fix is there).

5. **At 900 x 700 with the table open the drawing is about 360 x 190 px and the floating canvas
   toolbar covers about a third of its height**, so the graph a filter or a fix changes is mostly
   hidden behind controls. Screen: Data place with the table. Evidence:
   `bars-900x700/sessions/data-screens-900x700/04.png`, `narrowed-900x700/02.png`,
   `cards-900x700/08.png`. Package: graphty app (dock and toolbar layout).

6. Still on screen, already in the backlog at severity 2: volunteers.graphml loads with Fields
   "Coordinates: phone" (phone numbers read as a location), `volunteers-1200x900/02.png`
   (graphty-element, location detection); after the join pantries.csv's row loses its issue chip
   while the table says "With issues 2", `bars-1200x900/sessions/data-screens-1200x900/08.png`
   (graphty app).

### Severity 1

7. **The inspector's "12 nodes joined to no other no..." is cut at both sizes** (readable by its
   tooltip; not while a dialog is open). Known. Evidence:
   `bars-1200x900/sessions/data-screens-1200x900/04.png`. Package: graphty app.
8. **At 900 x 700 the Edges table's only data column (trips, km) sits past the right edge**; Source
   and Target take the width, so reading weights needs a sideways scroll in a three-column table.
   Evidence: `cards-900x700/10.png`, `narrowed-900x700/02.png`. Package: graphty app (column widths).
9. **Export: the "Advanced" icon button sits alone on a row under Format**, with no label next to
   it, and the row above it changes by format (CSV: "No styles" under Format; GraphML: "Include
   styles" in the right column above Scope), so the layout jumps on a format change. The button's
   name is a known backlog row; its placement is new. Evidence:
   `bars-1200x900/sessions/data-screens-1200x900/12.png`, `gauges-1200x900/20.png`. Package:
   graphty app.
10. **Two modal treatments.** Open network data dims the page behind it and has a large title;
    Export has no dimming and a small title in a header bar. Evidence:
    `bars-1200x900/sessions/data-screens-1200x900/06.png` against `.../12.png`. Package: graphty
    app (if one of them bypasses compact-mantine's Modal defaults, use the shared one).
11. **The join screen's options wrap unevenly at 1200 x 900**: "Ignore spaces" drops alone to a
    second row while "Ignore case" stays on the first; and the "1 not in graph" chip is drawn in a
    smaller type than "18 edges added" and "1 new node" beside it. Evidence:
    `bars-1200x900/sessions/data-screens-1200x900/07.png`, `bars-900x700/.../07.png`. Package:
    graphty app.
12. **The inspector's "Time: opened" offer row starts 16 px left of the value rows under it**
    (Nodes, Edges, ...). The row's meaning is a known backlog row; the alignment is new. Evidence:
    `bars-1200x900/sessions/data-screens-1200x900/04.png`. Package: graphty app.
13. **The selection summary wraps values onto two lines** ("44.39 to 44.48, mean / 44.44") at both
    sizes, with the label column left wide. Evidence: `cards-1200x900/09.png`,
    `cards-900x700/10.png`. Package: graphty app.
14. **With no edges, the Degree histogram is a solid gray block over 0 to 0**, and Mean reads "0.0"
    beside "0" for every other row. Evidence: `gauges-1200x900/01.png`,
    `bars-1200x900/sessions/data-screens-1200x900/04.png`. Package: graphty app.
15. **Source rows' chips do not line up from row to row**: pantries.csv's chip sits at the right,
    the joined file's chips start right after its one-letter name. Evidence:
    `bars-1200x900/sessions/data-screens-1200x900/08.png`. Package: graphty app.
16. **The web address box repeats its label as its placeholder** ("Web address" above, "Web address
    of a graph file" inside). Evidence: `bars-1200x900/sessions/data-screens-1200x900/03.png`.
    Package: graphty app (content designer's call).

### Severity 0 (checked, not a problem)

- The condition card's number and date boxes are filled while its match list is outlined
  (`volunteers-1200x900/07.png`): these are compact-mantine's own Figma-locked defaults (text
  inputs filled, the native select outlined), not an app override.
- The issue list draws one fix filled ("Add nodes") and others outlined ("Make blank", "Trim"):
  filled marks the fix already in effect (`table/IssuesList.tsx`, `aria-pressed`), so the two
  variants mean two states.
- Menus and the Filters picker open over the panel rows they came from, and the issue list over the
  source row; each fits inside the window at both sizes, scrolls where it is longer, and the picker
  says "Nothing found" for no match (`cards-1200x900/12.png`).

## Also seen by the axe walk

On every Data screen with the table open, at 1200 x 900 and 900 x 700 (dark), axe reports
`aria-valid-attr-value` (critical) on the table's Nodes tab, whose `aria-controls` names a panel
that is not in the page. This is the open bar 5 defect already recorded; it holds at both audit
sizes. Package: graphty app (the table's Tabs).
