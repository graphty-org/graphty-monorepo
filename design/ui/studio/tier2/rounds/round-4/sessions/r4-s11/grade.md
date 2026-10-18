# Grade: session r4-s11 -- Dana (regular analyst), bus stops (T22 A), mark the slow links

**Grade: S** (success). Every part of the task is met on the last screen (`12.png`). Exactly the
three links of 10 minutes or more are drawn red: Depot -> Station (15), Station -> Harbor (14) and
School -> Harbor (12). They are the same three lines that carried the blue selection band in
`07.png`, where the inspector read "3 edges selected" and listed School -> Harbor, Depot ->
Station and Station -> Harbor, and the table's three highlighted rows read 15, 14 and 12. Every
other link stays gray. Nothing was removed: the Graph inspector reads Nodes 10, Edges 17, all ten
stops are drawn, there is no Filters row in the left panel, and `work.json` lists no steps. Dana
answered "three links", the key's count. She read it from the edge table sorted by minutes
("Sorted by minutes, highest first": 15, 14, 12, then 9, `05.png`), and the screen confirmed it
with "3 edges selected" and Edges 3 (`07.png`).

The key grades routes other than the find-box rule by their end state, and a color that marks
exactly the matching ties is one of them. Dana took a route the key does not list: she selected
the three rows in the edge table, then added a Line color from the selection's Style tab, which
made a layer of those three edges. This was her first route, and nothing in it was a detour: no
wrong comparison, no filter, and no selection lost and remade. Clearing the selection on purpose
at the end (`12.png`) left the red layer in place, so the links are still marked. This is not the
`not-marked` case.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `bus-stops-ranked.txt` (bus-stops.csv loaded, PageRank run,
color and size by PageRank, no stop names drawn). Tool commit `435e878a1d4c`, no uncommitted
changes.

## The answer against the key

- **Count (right): 3.** Read from the sorted table (`05.png`). The screen confirms it with "3
  edges selected" in the inspector header, Summary Edges 3 and Selection 3 (`07.png`), and the
  layer the color step made is named "3 edges" (`10.png` to `12.png`).
- **Marked (right).** `12.png`: three red lines, with no selection band left and no other line
  colored. The legend reads "Edge color: 3 edges" with a red swatch.
- **Nothing hidden (right).** `12.png`: Overview Nodes 10, Edges 17. No filter step
  (`work.json`, `steps: []`).
- **Work kept.** `work.json`: the start and end match, apart from the new layer `edges_1 3
  edges`. The PageRank run and its layer are unchanged, and nothing is listed as gone.

## Measures

- **Route:** edge table (Shift+T is in the tooltip, but she opened it with a click), the Edges
  tab, a sort on minutes, a click on the top row, Shift-clicks on the next two rows, then the
  selection's Style tab, "+" next to Line, Color, and the hex typed as e00000. The find box was
  never used, so no rule was tried and "=" was neither typed nor shown.
- **Places looked for a way to select by a condition:** none tried. Dana said she "never found a
  way to say minutes 10 or more as a rule", but she did not open the find box, the "=" list or
  the selection's "..." menu. She saw the Filters button and chose not to use it because "a
  filter felt risky and nothing told me it wouldn't hide things". The task did not call for the
  design's deferred "select by condition" dialog: the route she chose worked.
- **Steps:** 11 `real.mjs` steps after the start (`02.png` to `12.png`; step 7 held two
  Shift-clicks). The success path is 3 steps. The extra steps belong to the route she chose
  (opening the table, sorting, picking rows, adding the color), not to detours. The hover in step
  2 is exploration.
- **Wrong turns:** 0.
- **False "done":** none. Her end claims, three links (Depot -> Station 15, Station -> Harbor 14,
  School -> Harbor 12), red on the drawing, and all 10 stops and 17 links still there, are all
  true on `12.png` (truth-on-screen holds). The drawing has no stop names, so she named the links
  from the table and the selection list in `07.png`, and those names are right.
- **Silent commit:** none. Each action changed the screen visibly: the band in `06.png`, the
  three bands in `07.png`, the new layer row and legend entry in `10.png`, and the red in
  `11.png`.
- **Numbers that disagree:** none.
- **Ease (from the transcript):** 5 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, and `leaks.json` shows
  no leaks over 29 calls.
- **Scripted exit:** does not apply. Dana finished the task.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                                                                                     |
| --- | -------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | discoverability | Dana never found that the find box can select by a value ("=minutes >= `10`"). She marked a fixed list of three edges by hand, and she says it will not follow next month's file: "the red layer will still be those same three links whether they're slow or not". On repeat work this route has to be rebuilt each time the data changes. | Transcript debrief, first point under "confused me"; the find box is unused in `02.png` to `12.png`                                         |
| 2   | 2        | wording         | A color added from a selection makes a layer named only by its size, "3 edges". Neither the layer list nor the legend ("Edge color: 3 edges") says why those edges are marked, so a colleague reading the drawing cannot tell that red means 10 minutes or more. Dana did not find a way to rename it.                                    | `10.png`, `11.png`, `12.png` (layer row and legend title); transcript: "tells nobody what it means"                                          |
| 3   | 1        | visual          | A new Line color starts as black (000000), which hardly stands out on the gray links, and the colored line keeps the default width, so the marking is thin. Dana had to type a hex code to get red.                                                                                                                                        | `10.png` (Color 000000, black under the blue band); `12.png` (thin red lines); transcript step 10                                           |
| 4   | 1        | visual          | Shift-clicking table rows also makes the browser select the text in the cells, so blue text highlight covers the From, To and minutes cells. Dana took it for a glitch.                                                                                                                                                                     | `07.png` (highlighted text in rows 14 and 12 and on the number 15); transcript step 7                                                        |
| 5   | 1        | trust           | The Filters button gives no sign beforehand of whether it hides things, so Dana avoided it on a task that said not to remove anything. Here that was the right choice (a filter does hide the rest), so it did not change the outcome.                                                                                                      | Transcript step 1 and the last point of the debrief                                                                                          |
| 6   | 1        | visual          | No stop names are drawn, so the marked lines cannot be matched to stops on the drawing alone. Dana had to go back to the table. This comes from the setup and is a known note in the answer key.                                                                                                                                            | `12.png`; transcript debrief                                                                                                                 |

Every problem rests on this one participant, so none is confirmed by this session alone.
Problem 1 is the one to check against the other T22 sessions.
