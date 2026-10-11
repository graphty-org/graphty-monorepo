# Grade: session r4-s08 -- Elena (tier 1 graduate), bus stops (T24 B), one tie on the drawing

**Grade: SD** (success after a detour). Both halves of the task are met, but the first click
aimed at the Station-Stadium line selected the Stadium stop instead, which the answer key names as
a detour ("a missed click on the line"). The number: after the second click on the line, the
inspector reads "Station -> Stadium", subtitle "Edge", Summary From Station, To Stadium, minutes 4
(`03.png`), and Elena answered 4 minutes, the key's value. The two ends: the last screen
(`05.png`) shows Station and Stadium with yellow rings, the inspector titled "2 nodes selected"
(subtitle "Selection") with Summary Nodes 2 and "Edges joining these nodes 1", and the left
panel's Selection row 2. No other stop has a ring. Elena selected the two one at a time (a click on
Station, then a Shift-click on Stadium) and never opened the tie's "Edge actions" menu; the key
lists that route as valid on this build with the same end state as Select endpoints
(`rounds/round-4/pilot/T24B/06.png`, `07.png`). It was her first choice of route, not a fallback
after failing to find an ends command, so it adds no second detour.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `bus-stops-ranked-names.txt` (ranked, colored and sized by
PageRank, every name drawn). Tool commit `71ed347b39a5`, no uncommitted changes.

## The answer against the key

- **Number (right).** `03.png`: From Station, To Stadium, minutes 4. Read from the inspector, not
  from the line's look.
- **Ends (right).** `05.png`: exactly Station and Stadium selected. The click on Station
  (`04.png`) replaced the tie's selection with Station alone (Selection 1, the blue band gone), so
  nothing was left over from the tie.
- **The near miss.** `--click-at 752,165` landed on node Stadium (`02.png`: the Stadium node
  inspector, id Stadium, Degree 3, PageRank 0.08953, #4 of 10). The key warns that a point at the
  top edge of the "Stadium" label picks the stop. The second try, `--click-at 765,140`, hit the
  line (`edge with id 15`).
- **Direction.** Elena noticed the "->" in the title and wondered whether the bus runs one way,
  then set it aside. The key notes the arrow is the file's direction, not a fact about the bus. Not
  misled.
- **Work kept.** `work.json`: start and end identical (one PageRank run, four style layers, no
  notes, no steps, one source bus-stops.csv); nothing gone.

## Measures

- **Clicked the line itself:** yes, on the second try. First try 752,165 hit the Stadium node;
  second 765,140 hit the line, 3 pixels from the success path's 762,145.
- **Route to the two ends:** click Station, Shift-click Stadium, from spreadsheet habit. "Select
  endpoints" was never seen; the "Edge actions" menu was not visited.
- **Steps:** 4 `real.mjs` steps after the start (`02.png` to `05.png`). The success path is 3
  actions (click the line, Edge actions, Select endpoints).
- **Wrong turns:** 1 (the click that selected Stadium instead of the line).
- **False "done":** none. The end claims ("takes 4 minutes", "Station and Stadium are the only two
  picked", "2 nodes selected") are all true on `03.png` and `05.png`. truth-on-screen: holds.
- **Silent commit:** none. Each click changed the selection marks, the inspector and the Selection
  row.
- **Numbers that disagree:** none. minutes 4 matches the key; Nodes 2 and "Edges joining these
  nodes 1" match the two rings and the one line between them.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool reported what
  each pointer action hit, `leaks.json` shows no leaks over 14 calls, and `session.log` is empty.
- **Scripted exit:** not applicable; Elena finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                  | Evidence                                                                                      |
| --- | -------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | 2        | target size     | The Station-Stadium line is short and runs behind the "Stadium" label, so a click aimed at it picked the Stadium stop. Elena had to notice the wrong inspector and aim again nearer Station. | `02.png` (Stadium node inspector after a click aimed at the line); transcript step 1 and end  |
| 2   | 1        | discoverability | Nothing on screen says that Shift-click adds a node to the selection. Elena tried it from spreadsheet habit, unsure whether it would add or replace; the tie's own "Select endpoints" sits behind a three-dot menu she never opened. | `04.png`, `05.png`; transcript end: "I was not sure shift-click would add rather than replace" |
| 3   | 1        | wording         | The tie's title "Station -> Stadium" uses an arrow, which made Elena wonder whether the bus runs only one way. The arrow is the file's column order, and nothing says so.                 | `03.png`; transcript end                                                                      |

Problem 1 matches the answer key's known near miss on this build (a point at the top of the
"Stadium" label picks the stop). Problem 2 was also raised in r4-s07 (Shift-click with no hint),
so it rests on two participants. Problem 3 rests on this participant alone.
