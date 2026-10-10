# Grade: session r2-s11 -- Dana (regular analyst), bus stops (T22 A), make the slow links stand out

**Grade: S** (success). The last screen (`20.png`) shows exactly the three links of 10 minutes or
more -- Depot to Station 15, Station to Harbor 14, School to Harbor 12 -- drawn as thick red lines,
with all 10 stops and the other 14 gray links still on the map, and no filter step (the Data
place's Filters section is empty in `08.png`, and `work.json` ends with `"steps": []`). The key
reads "Edge color: Slow links (10+ min)" with a red swatch. Dana gave the count 3, read from the
screen twice: from the edge table sorted by minutes, highest first (`06.png`, the fourth row is
already 9), and from the inspector's "3 edges selected", Summary Edges 3, and the "Selected edges"
list of the same three links (`08.png`). Both agree with the answer key.

The route was not the find box. Dana went to the Data place, opened the `minutes` attribute's
"..." menu, chose "Show in table", sorted the table by minutes, clicked the top row and
Shift-clicked the third, which selected the three links on the map. She then added a style layer
to that selection (Style tab, Line, Color E00000, Width), renamed the layer "Slow links (10+ min)"
and clicked away. The answer key grades other routes by the end state, and a color that separates
exactly the 10-or-more links is one of them. She never typed "=" and never looked for a dialog to
select by a condition; she went where the numbers were, which is the Data place.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `bus-stops-ranked.txt` (PageRank run, nodes sized and colored by it).

## The answer against the key

- **The matching links are marked (right).** `20.png`: three red lines; `work.json` end state adds
  one layer, "edges_1 Slow links (10+ min)", to the three the setup made, and nothing else.
- **Nothing taken off (right).** 10 stops and 17 links still drawn; no filter step; the PageRank
  layer and run are unchanged.
- **Count (right).** 3, read from the sorted table and confirmed by "3 edges selected" (`06.png`,
  `08.png`). Not `read-wrong`, not `hid-the-rest`, not `not-marked`.
- **The mark is a fixed list, not a condition.** The layer applies to the three edges that were
  selected, not to "minutes 10 or more". That meets this task. Dana herself suspected it ("the red
  stays on these three and doesn't follow the 10-minute cutoff") and said nothing on screen tells
  her which it is (problem 4).

## Measures

- **Route:** the Data place's table (sort, click, Shift-click), then a color on the selection's
  style layer. Not the find box rule, and not a filter.
- **Typed "=" without being shown it:** no. She never opened the find box. Places she looked for a
  way to pick by a value: the Data place's `minutes` attribute panel (`03.png`) and its "..." menu
  ("Filter to..." and "Show in table", `04.png`), which she skipped because a filter takes links
  off. She did not look for a separate "select where" dialog.
- **Where she found `minutes`:** the Data place's Attributes list, under Edges (`02.png`).
- **Steps:** 17 `real.mjs` steps after the start that produced screens (`02.png` to `20.png`),
  plus one step the tool refused (`--shift-click-at`, "no such step", no screenshot). The task
  itself was met at `08.png` (7 steps: marked by selection, count read); steps 8 to 17 made the
  mark permanent, legible and named. The find box route is 3 to 4 steps.
- **Wrong turns:** 0. Every move went forward. Two tool slips cost a step each without changing
  the screen: a Shift-click by a name ("School") that matched more than one thing (`07.png`), and
  "Graph" matching both the rail button and another control (`16.png` unchanged). The Width
  correction (8, then 20) was a fix to a default that drew no visible change, not a wrong place.
- **False "done":** none. "I'm done" (`20.png`) is true: the three links are marked, nothing is
  hidden, and the count is on screen. truth_on_screen: holds. Her remark that the red lines "seem
  to have lost their arrowheads" is a perception, not a claim about the task (problem 8).
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Lost earlier styling:** no. She never pressed Escape or Control+Z; the PageRank size and color
  layer survives (`20.png` key).
- **Build-decided:** no. **Void:** no. Every step that ran printed its screenshot, and the tool
  named each ambiguous match it refused.
- **Scripted exit:** not applicable; she finished.

## Problems

| #   | Severity | Kind               | Problem                                                                                                                                                                                                                                                                                                                    | Evidence                                                                                                                                           |
| --- | -------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability    | Nothing on her route points to selecting by a value. The `minutes` attribute panel and its "..." menu offer only "Filter to..." and "Show in table"; neither says that the find box takes a rule. She counted and Shift-clicked by eye, which works for 17 rows and, in her words, not for 1,400 suppliers.                  | `03.png`, `04.png`; transcript wrap-up: "Nothing told me it could do 'minutes 10 or more'... With 1,400 suppliers I'd want to type the condition" |
| 2   | 2        | default-value      | Adding Width to an edge layer puts 8 in the box, and the lines are drawn barely thicker than the gray ones; it took 20 to make them stand out. The box shows no unit, so she could not tell what 8 meant or what to type instead.                                                                                          | `14.png`, `15.png` (red lines about as thin as the gray ones at Width 8), `20.png` (Width 20); transcript steps 12, 13 and 17                       |
| 3   | 2        | wording            | The layer made from a selection is named by its size, "3 edges", and the drawing's key shows that name ("Edge color: 3 edges"). A colleague reading the key learns nothing about why those links are red. She renamed it herself by double-clicking the layer row.                                                         | `11.png`, `12.png`, `15.png` key; `17.png` to `19.png` rename                                                                                      |
| 4   | 2        | comprehension      | A style layer added to a selection paints that fixed set of edges, not the condition that picked them, and nothing on screen says so. Dana guessed correctly that next month's file would keep the red on the same three links, but she could not confirm it; a user who guesses the other way would trust a stale mark. | `20.png` (layer panel shows only Line, Arrows, Label; no "applies to"); transcript wrap-up                                                         |
| 5   | 1        | feedback           | While the edges are selected, the blue selection band is drawn over the new color and width, so the effect of each change cannot be judged until the selection is dropped.                                                                                                                                                 | `12.png`, `14.png`; transcript steps 11 and 12                                                                                                     |
| 6   | 1        | visual-glitch      | Shift-clicking a table row also makes a browser text selection: the cell words of the rows in between are painted in browser blue on top of the row highlight.                                                                                                                                                              | `08.png` (Station, Harbor, School, Harbor, 14, 12 in blue text boxes)                                                                              |
| 7   | 1        | legibility         | The inspector's section labels (Line, Arrows, Label, Color, Width) are small gray text that the persona had to squint at.                                                                                                                                                                                                  | `09.png`, `20.png`; transcript step 8                                                                                                              |
| 8   | 1        | rendering          | Arrowheads keep their size when the line gets thicker, so at Width 20 they are about as wide as the line and read as missing. They are still drawn (`20.png`, the head into the top stop and the head into the large node).                                                                                                | `15.png` against `20.png`, the three red links                                                                                                     |
| 9   | 1        | accessibility-name | Two names the participant used matched more than one control: "School" (a table cell and the inspector) and "Graph" (the rail button and another control). The tool refused both; each cost one step.                                                                                                                     | `07.png`, `16.png` unchanged; transcript steps 6 and 14                                                                                            |

No severity 3 or 4: the answer was right, nothing was hidden, and every problem she raised was
about wording, defaults or discoverability on a path she completed. Problem 1 is the finding this
task exists to measure: a returning user whose habit is a spreadsheet went to the table, not the
find box, and reached the result only because the set was small.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a pass here is weak evidence.
