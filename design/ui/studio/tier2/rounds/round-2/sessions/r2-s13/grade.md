# Grade: session r2-s13 -- Elena (returning), bus stops (T22 A), make the slow links stand out

**Grade: SD** (success with difficulty). The last screen (`17.png`) shows exactly the three links
of 10 minutes or more drawn in red -- the two into the large dark Station node and the one into
Harbor at the top -- with every other line still gray, all 10 stops and 17 edges still drawn (Graph
Overview: Nodes 10, Edges 17) and no filter step. The count, 3, was read from the screen: "3 edges
selected" under the find box and in the inspector, with the "Selected edges" table School -> Harbor
12, Depot -> Station 15, Station -> Harbor 14 (`10.png`), which matches the answer key. The marking at
the end is a color, not the selection: a click on the empty canvas cleared the selection (the
Selection row has no count in `17.png`), but the "3 edges" layer Elena made from it colors the same
three edges red, which the key accepts ("a color on ... edges that separates exactly the
10-or-more ties", graded by the end state). SD, not S: her first try in the find box, the column
name "minutes" on its own, got only "No match" (`03.png`), a wrong turn before she found the
condition hint.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `bus-stops-ranked.txt` (PageRank run, size and color by PageRank).

## The answer against the key

- **Count (right).** "3 edges selected" under the box and in the inspector header, Summary Edges 3,
  Selection 3, and the table of three rows (`10.png`). Elena reported 3 and named all three links
  with their minutes.
- **Marked (right).** `17.png`: the three links red, every other line gray (A9A9A9). Legend "Edge
  color: 3 edges" with a red swatch.
- **Nothing taken off (right).** `17.png`: Nodes 10, Edges 17; `work.json` end state has no steps
  (no filter) and adds only the layer `edges_1 3 edges`.
- **Not a failure tag.** Not `hid-the-rest` (no filter), not `not-marked` (the color layer marks the
  three after the selection was cleared), not a wrong count, not `false-done`.

## Route

The round 2 route, the find box answering a typed condition with a rule:

1. `02.png` click the find box; `03.png` typed "minutes" -- "No match for "minutes"" (wrong turn).
2. `04.png` cleared; `05.png` clicked in again; `06.png` typed "minutes >= 10" -- the hint "Start
   with = to select by a value:" with "=minutes >= `10`".
3. `07.png` cleared; `08.png` clicked in; `09.png` typed the hint's line whole, "=minutes >=
   `10`" -- "Rule: press Enter to select matches".
4. `10.png` Enter -- 3 edges selected.
5. `11.png` to `16.png` Style tab, "Add to Line", Color (`13.png`, the new "3 edges" layer at
   A9A9A9, the same gray as every other line), color swatch, red picked (`15.png`), picker closed.
6. `17.png` click on empty canvas -- selection cleared, red stays.

- **Typed "=" unprompted:** no. She learned it from the hint that "minutes >= 10" brought up.
- **Copied the hint whole:** yes, backticks included, without knowing what they mean.
- **Where she looked for a separate "select where" dialog:** nowhere. She went to the Style tab
  of the selection to make the marking last.
- **Where she found `minutes`:** she already knew it from the task's prompt; she did not open the
  "=" list, the Data page or an edge's values.

## Measures

- **Steps:** 16 `real.mjs` steps after the start (`02.png` to `17.png`). The success path is 3 and
  the round 2 route 4. To the selection itself she took 9 (`02.png` to `10.png`): the extra 5 are
  the "minutes" wrong turn (2 steps) and clearing the box and clicking back into it twice (in place
  of select-all and type). The further 7 made a colored layer, which the task did not need but which
  is a valid route and made the marking survive the click that cleared the selection.
- **Wrong turns:** 1 -- plain "minutes" in the find box (`03.png`).
- **False "done":** none. Her "done" claims (`17.png`: three slow links red, every other line gray,
  10 nodes and 17 edges, count 3) are all true on screen. truth_on_screen: holds.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Silent commit (bar 4):** none by the bar's rule, since "Color" added a legend entry "Edge
  color: 3 edges" (`13.png`). But the canvas did not change: the new color defaulted to the gray
  every line already has (problem 3).
- **Numbers that disagree (bar 5):** none.
- **Broken habit:** partial. Her history names the find box (to jump to a name). Her first move
  there, the column name alone, gave only "No match" with no way on (`03.png`); the way on appeared
  only once she typed a whole condition.
- **Undo loss of earlier styling:** none; she did not press Control+Z.
- **Build-decided:** no. **Void:** no. Every step printed its screenshot and every click landed on
  the control the transcript names.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                   | Evidence                                                                                                                         |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | The find box's placeholder promises "values", but a column name typed alone ("minutes") gets only "No match", with no hint that a condition can be typed. The "Start with =" hint appears only for text already shaped like a condition. Elena: "If I'd typed '10 minutes' or 'slow', I don't think I'd ever have seen it." | `02.png` placeholder; `03.png`; `06.png`; transcript end                                                                         |
| 2   | 2        | comprehension   | A selection looks temporary, and it is: a click on empty canvas clears it (`17.png`, Selection row with no count). Nothing offers to keep the marked set; Elena had to work out on her own that a style on the selection would last.                                                       | `10.png`, `17.png`; transcript: "blue just means 'selected' -- if I click somewhere it'll probably vanish"                       |
| 3   | 2        | feedback        | "Add to Line" > Color on the selection's new layer starts at A9A9A9, the gray every edge already has, so adding a color changes nothing on the canvas (only the legend gains a gray "3 edges" entry). A user who stops there believes the links are marked when they are not.                | `13.png` (Color A9A9A9, lines unchanged except the selection band); transcript: "the color is A9A9A9, grey ... that does nothing" |
| 4   | 2        | wording         | The layer made from the selection is named "3 edges", and the legend reads "Edge color: 3 edges", not the condition. A reader of the picture cannot tell what red means, and Elena could not tell whether the layer follows the condition (more links if the data changes) or holds these three. | `13.png`, `17.png` legend and layer row; transcript end                                                                          |
| 5   | 1        | comprehension   | The hint and the "=" rule put backticks around the number (`` `10` ``) with no explanation; Elena copied them without knowing whether they matter.                                                                                                                                         | `06.png`, `09.png`; transcript end                                                                                               |
| 6   | 1        | feedback        | After the selection is cleared, the find box still shows the rule with "Rule: press Enter to select matches" under it, with nothing selected. It did not mislead Elena here, since her color layer holds the marking (known on this build).                                                | `17.png`                                                                                                                         |
| 7   | 0        | legibility      | The red lines are thin, the same width as the others; Elena worried they would not stand out to a colleague (opinion, held down one level).                                                                                                                                                | `17.png`; transcript end                                                                                                         |

No severity 3 or 4: the count and the marking were right and true on screen. The problems are
about getting to the condition and making its marking last and readable, not defects that broke
the task. Problem 3 would become a false "done" for a participant who stopped at the gray default.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
