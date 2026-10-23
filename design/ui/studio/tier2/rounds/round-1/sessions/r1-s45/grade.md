# Grade: session r1-s45 -- Jordan (returning marketing analyst), T22 prompt A, bus stops

**Grade: SD** (success with difficulty). The last screen marks exactly the three links of 10
minutes or more (Depot to Station 15, Station to Harbor 14, School to Harbor 12) as thick red
lines, with all 10 stops and the other 14 links still drawn and no filter on. The count, 3, was
read from the screen: from the edge table sorted by minutes (`17.png`) and then from the
inspector's "3 edges selected" and its Summary "Edges 3" (`19.png`). The answer key accepts a
color that separates exactly the 10-or-more links as an end state, but this one was reached only
after three dead ends and by reading and hand-picking table rows, never by stating the condition.
That is a detour, so SD, not S.

Build seen: `946256efb876 graphty@0.8.56` (`session.json`), 1440 x 900, no uncommitted changes:
the frozen build the criteria name. The setup (`bus-stops-ranked.txt`) reached its end state
(`01.png`). Step 6's `--click Linear` found nothing by that name (it is a select box) and step
17's `--shift-click-at` does not exist in the tool; in both cases the screen did not change and the
driver retried with a click a person could make (a click on the select at its position; a
Shift-click on the row's "12" cell). Neither is a tool fault. The session is not void.

## What the last screen shows (`26.png`)

- Three thick red lines between the same stops the selection marked in `19.png`; every other link
  orange, thin, still drawn; all 10 stops drawn.
- Map key: "Edge color: 3 edges" with a red swatch, then Size and Color by PageRank, then "Edge
  color: Everything, 2 to 15".
- Data place: Filters empty. Inspector: Graph overview, Nodes 10, Edges 17.
- Edge table under the drawing, "Sorted by minutes, highest first": 15, 14, 12, 9.

## Measures

- **Route:** neither the rule in the find box nor Shift-clicks on the drawing. The participant
  sorted the edge table by minutes, counted the rows at 10 or more, selected those three rows
  (click, Shift-click), and added a style layer to the selection (Color FF0000, Width 30).
- **Typed "=" unprompted:** no. Typed `minutes`, then `minutes >= 10` (with and without Enter);
  both gave only "No match for ...".
- **Steps:** 24 after the start. The answer key's path is 3.
- **Wrong turns: 3.**
    1. Steps 1 to 6 (`02.png` to `08.png`): colored Everything's edges by minutes, then searched the
       Scale list for a cutoff. A ramp from 2 to 15 does not separate 9 from 10, and no scale offers
       "above a number".
    2. Steps 7 to 9 (`09.png` to `11.png`): the find box, `minutes`, then `minutes >= 10`, then
       Enter. "No match" each time.
    3. Step 10 (`12.png`): Everything's Values tab, which holds only a summary (10 nodes, 17 edges).
       Steps 11 to 15 (Data place, the minutes attribute, its "..." menu, Show in table, sort) were the
       route that worked, not detours. The participant saw "Filter to..." and rightly avoided it.
- **Places looked for a "select where" control:** the Style tab's color-by popover and its Scale
  list; the find box; Everything's Values tab; the Data place's minutes summary and its "..." menu.
- **False "done": none.** The closing claim (3 links, those three named, drawn thick red, nothing
  removed) matches `26.png` and the answer key. The participant also checked the final look by
  deselecting before claiming done (`26.png`).
- **The ramp left on Everything's edges** (orange by minutes) is styling the participant added on
  the way and did not remove; it does not hide or mislabel the three red links.
- **Self-rating** (3 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 3 (confirmed: r1-s43, r1-s44, r1-s46 hit the same screen) -- the find box says it
   finds "values", but a condition typed the obvious way (`minutes >= 10`) gets only "No match for
   ...", with no hint that a rule starts with "=" or that numbers go in backticks.** The rule path
   exists and gives the count in one step, but nothing on screen leads to it. Here the participant
   got round it by reading a 17-row table; on a file of thousands of links that route does not
   exist (debrief). Held at 3, not 4, because this session finished the task correctly. Evidence:
   `09.png`, `10.png`, `11.png`.
2. **Severity 2 -- coloring by an amount offers no threshold.** The Scale list (Linear,
   Logarithmic, Negative logarithmic, Square root, Power, Equal bins, Quantiles, One color per
   value, As written) has no "above a value" or custom break, so "make the ones over 10 stand out"
   cannot be done by color either. Evidence: `05.png`, `06.png`, `08.png`.
3. **Severity 2 -- the map key titles the minutes ramp "Edge color: Everything" (the layer's name)
   instead of the column it shows.** A reader of the picture cannot tell what the orange means.
   The same naming makes the red entry read "3 edges" rather than anything about minutes, and the
   participant did not find where to rename it. Evidence: `05.png`, `26.png`.
4. **Severity 2 -- the minutes attribute summary gives range and distinct values but no way to
   select by value;** its menu offers only "Filter to..." and "Show in table". Evidence: `14.png`,
   `15.png`.
5. **Severity 1 -- a Color added to a selection's layer starts at A9A9A9 gray, duller than the
   orange links it is meant to lift out; a Width added starts at 8, the width every link already
   has, so adding it changes nothing; the width has no unit.** Evidence: `22.png`, `24.png`.
6. **Severity 1 -- while the links are selected, the blue selection band grows with the layer's
   width and covers the line, so the real result is visible only after deselecting.** Evidence:
   `25.png`, `26.png`.
7. **Severity 1 -- Shift-click on table rows also selects the cell text, like on a web page.**
   Evidence: `19.png`, `22.png`.

What worked: the edge table's sort by minutes, row selection that marks the same links on the
drawing and opens "3 edges selected" with a Selected edges list, and styling a selection into its
own layer that stays after the selection is dropped.

## Implementation defects versus what the user needs

Nothing in this session was a broken control: every click did what the answer key says the build
does, and no time went to a crash, a wrong count or a control that did nothing. Problems 3, 5, 6
and 7 are polish-level design or labeling issues the participant noticed in passing. The time went
to problems 1, 2 and 4, which are about the need the task tests: a returning analyst expects to
state a condition ("minutes 10 or more") and get the count and the marking from the program, and
reaches first for the search box, then for a threshold in color-by, then for the column's own
menu. None of those places accepts a condition. That is a finding about what users need (a
discoverable "select where" entry), not a defect in a working feature.
