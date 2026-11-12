# Grade: session r3-s42 -- Alex (regular analyst, returning), bus stops (T24 B), one tie on the drawing

**Grade: F** (failure). Alex read the right number, 4 minutes, but did not end with exactly the
two ends selected. The last screen (`18.png`) shows the left panel's Selection row at **1**, with
the yellow selection halo on Station only. Station and Stadium are both painted black by a
"Shortest path" run started from Station's right-click menu ("Path between..."). The key credits
only the two ends selected, and grades a participant who colors the two instead by the F rule
("more or fewer than the two selected"), with the route recorded. The route: a shortest-path run
used as a highlighter, the same route as session r3-s43 (Dana, T24 A).

Build seen: `26f3bb968e43 graphty@0.8.61` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900, tool commit `acf3894e2c56`, no uncommitted changes. Start: setup
`bus-stops-ranked-names.txt` (`01.png`). `leaks.json`: 0 calls, no leaks. Not void: every step
has a screenshot, and the transcript, the screens and `work.json` agree.

## The answer against the key

- **The number (right, read from the screen): 4.** `06.png`: a click on the line at 763,147
  opened the edge inspector "Station -> Stadium", subtitle "Edge", Summary From Station, To
  Stadium, minutes 4; the line drawn with a blue band. Matches the key.
- **The two ends (wrong): only Station selected.** `18.png`: Selection 1, Station haloed, Stadium
  not; the inspector shows the run (Path 2 nodes, 1 edge; Nodes in order Station 1, Stadium 2;
  Made with From Station, To Stadium, Follow All, Weight None). `work.json` agrees: the end adds
  the run `shortest_path Shortest path (label Shortest route)` and two layers, "Shortest route
  (nodes)" and "Shortest route (edges)"; `gone` is empty.
- **The success route was not found.** Alex never opened the edge inspector's three-dot menu
  ("Edge actions", which holds "Select endpoints"). After reading the number Alex clicked Station
  directly (`07.png`), which replaced the tie selection.
- **Traps from the key:** the near miss at about 752,170 was met (step 1, see Measures). The
  name-click-after-Select-endpoints trap does not apply (Select endpoints never used).

## Claims

- **False "done": yes.** "Only the two stops are pointed out. Done." and, in the wrap-up, "Station
  and Stadium (only) are marked on the drawing, in black, as a shortest path." The task is graded
  F. truth-on-screen: the description of the colors is accurate (both black, no other stop
  black), and Alex noted "Station still has its yellow selection ring as well"; the false part is
  the claim that the task is complete, since the selection holds Station alone.
- "The link takes 4 minutes": true on `06.png`.

## Measures

- **Steps:** 15 `real.mjs` steps after the start (`02.png` to `18.png`; steps 6 and 14 took two
  commands each) against the success path's 3 (click the line, "Edge actions", "Select
  endpoints").
- **Clicked the line itself:** yes, on the 2nd try. The 1st, at 752,172 (`02.png`), landed on
  the Stadium node, the near miss the key records for 752,170 (the top edge of the "Stadium"
  label). The 2nd, at 763,147 on the visible part of the line above the label (`06.png`), hit,
  after one hover there (`05.png`: tool says "edge with id 15", no tooltip, screen unchanged).
- **Wrong turns: 8.**
  1. The near-miss click that selected Stadium (`02.png`).
  2. Stadium's Degree arrow, hoping for links with minutes (`03.png`): the neighborhood view
     selected Stadium and its 3 neighbors (Selection 4) and showed no minutes.
  3. The Data section, looking for a table of links (`04.png`): it lists "minutes" as an edge
     attribute but has no rows.
  4. Shift-click on Stadium after clicking Station (`08.png`): Selection stays 1, Station dropped.
  5. Ctrl-click on Station (`09.png`): Selection stays 1, Stadium dropped.
  6. Shift-click on "Stadium" in the find box's results (`13.png`): the list closed, Selection 1,
     Stadium only.
  7. Right-click on Station looking for "add to selection" (`14.png`): the menu has Neighborhood,
     Path between..., Frame selection, Add note.
  8. "Path between..." to Stadium as a way to mark both (`15.png` to `18.png`), which ended the
     session in the failing state.
- **How Alex got from "point out the two" to an action:** by reasoning that a shortest path
  between directly linked stops marks just those two. "Select endpoints" was never seen.
- **Find box:** typing "Sta" listed both stops and the "Station -> Stadium" tie (`11.png`); Alex
  said afterwards it would have been the faster way to the minutes.
- **Tool refusal:** the transcript says one command used a step name the tool does not have
  ("--shift-click-at"); the tool refused it and nothing happened. A participant error, not a tool
  fault.
- **Silent commit:** none. The path run is shown (left-panel row "Shortest path 1 hop", a key row
  "Shortest path", the run's Values), `18.png`.
- **Build-decided:** partly. Shift-click and Ctrl-click on a stop replace the selection
  (`07.png` to `09.png`, `13.png`). The key lists selecting the two with Shift held as an accepted
  route; had it added, Alex would have ended at step 6 with SD.
- **Ease (self-rated, not used for the grade):** 4 of 7.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                         | Evidence                                                                                                                     |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3        | build-behavior  | Shift-click and Ctrl-click on a stop, on the drawing and in the find box's results, replace the selection instead of adding to it; nothing says how to pick two. Seen also in r3-s41, r3-s43 and r3-s44, so confirmed. It turned a likely SD into F. | `07.png` Station selected; `08.png` Shift-click Stadium, Selection 1; `09.png` Ctrl-click Station, Selection 1; `13.png` list Shift-click, Selection 1 |
| 2   | 3        | discoverability | "Select endpoints" sits only inside the edge inspector's unlabeled three-dot menu; Alex read the inspector and left it without opening the menu. Seen also in r3-s43.                                                                               | `06.png` (only "..." at the inspector's top right); transcript steps 5-6                                                    |
| 3   | 2        | comprehension   | A shortest-path run reads as "marking" two stops: it paints them black and leaves a lasting run and two style layers while the selection holds one stop. Alex took this as done. Seen also in r3-s43 (same route), so confirmed.                    | `18.png` Selection 1, Station halo, both black, row "Shortest path 1 hop"; `work.json` end                                    |
| 4   | 2        | target-size     | The Station-Stadium line is short and the "Stadium" label covers its lower part, so a click aimed at the line picked the Stadium stop.                                                                                                           | `02.png` (click at 752,172 selected Stadium); key's near-miss note                                                           |
| 5   | 2        | discoverability | No "add to selection" in a stop's right-click menu, and no way to select several from the find box's results.                                                                                                                                   | `14.png`; `13.png`                                                                                                           |
| 6   | 2        | feedback        | Opening a stop's Degree row selects the stop and all its neighbors without asking; here Selection 4, the opposite of what the second half needed.                                                                                                  | `03.png` Selection 4, four halos; seen also in r3-s41                                                                        |
| 7   | 1        | discoverability | The Data section lists "minutes" as an edge attribute but offers no table of the links' values, where a weekly table user looked first.                                                                                                       | `04.png`; transcript step 3                                                                                                  |
| 8   | 1        | feedback        | Hovering the line shows no tooltip and no change; the tie's minutes are only read by clicking it. Seen also in r3-s43 and r3-s44.                                                                                                              | `05.png` identical to `04.png` byte for byte; transcript step 4                                                             |

No severity 4: the number reported is right and the description of the drawing is accurate; the
failure is that the two ends are not both selected.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person; a failure here is strong evidence.
