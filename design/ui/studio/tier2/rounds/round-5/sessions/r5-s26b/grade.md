# Grade: session r5-s26b -- Dev (tier 1 graduate), bus stops (T24 B), one tie on the drawing

**Grade: S** (success). Dev read the Station-Stadium link as 4 minutes, which is the answer key's
value, from the edge inspector after one click on the line itself. He then selected Station with a
click and added Stadium with a Shift-click. The last screenshot shows exactly those two stops
selected and nothing else. The key lists this route (one node, then the second with Shift held)
as a route from build 5277e2cbe with the same end state as the edge menu's "Select endpoints".
He never looked for an ends command and failed to find it. He went straight to selecting one stop
at a time, so the SD clause ("selected one at a time after the ends command was not found") does
not apply. No detour, no missed click.

Build seen: `8c015b806086 graphty@0.8.65` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900, tool commit `753bae997bc6`, no uncommitted changes. Start: setup
`bus-stops-ranked-names.txt` (bus-stops.csv loaded, PageRank run, size and color by PageRank, every
stop's name drawn, `01.png`). `session.log` is empty: no script, console or request errors.
`leaks.json`: no leaks over 11 calls. Not void.

## The answer against the key

- **The number (right): 4 minutes.** `02.png`: inspector "Station -> Stadium", subtitle "Edge",
  From Station, To Stadium, minutes 4 under "Summary", the left panel's Selection row 1, the line
  drawn with a blue band. This matches the key's screen. The tool printed `edge with id "15"`, the
  key's tie.
- **The two stops selected (right).** `03.png`: a plain click on Station selects it alone (yellow
  halo, Selection 1, the tie's blue band gone). `04.png`, the last screenshot: a Shift-click on
  Stadium (the tool clicked the node at 726,221). The result is the key's end state: Station and
  Stadium ringed in yellow, the inspector "2 nodes selected" (subtitle "Selection"), Nodes 2,
  "Edges joining these nodes 1", the left panel's Selection row 2, and no other stop ringed.
- **Known traps not met.** He did not click a drawn name after selecting the two (that click drops
  the selection to one stop). He did not use a Ctrl-click (that replaces the selection), and he did
  not miss the line. The Stadium click went to the node, not its label.
- **Work kept.** `work.json`: start and end are the same (one PageRank run, four layers, one
  source, no notes, no steps). Nothing is gone. Selection is not saved work, so it does not show
  there.

## Measures

- **Clicked the line itself:** yes, on the first try (`--click-at 763,158`, `02.png`). That is
  1 try at a 1-pixel target, close to the key's point 762,145.
- **Steps:** 3 `real.mjs` steps after the start (`02.png` to `04.png`). The key's success path is
  3 (line, "Edge actions", "Select endpoints"), so this route ties it.
- **Wrong turns:** 0.
- **From "the two on this tie" to a selection:** he did not use the app's word "endpoints" or the
  edge menu. He took the file-manager habit "Click Station first, then hold Shift and click
  Stadium, like picking two files". He never opened the "Edge actions" menu, so "Select endpoints"
  was neither found nor missed.
- **Broken habit:** none. His history names clicking dots, not lines. He said so ("Last time I
  only clicked dots, never a line"), and the line click still worked at once.
- **False "done":** none. His "done" claim (4 minutes; Station and Stadium both glow, "2 nodes
  selected") matches `02.png` and `04.png`. His truth-on-screen claims hold: Selection went
  1 -> 1 -> 2 (`02.png`, `03.png`, `04.png`) and the line went back to gray after the Station click
  (`03.png`).
- **Silent commit (bar 4):** none. Nothing was changed.
- **Earlier work kept (bar 2):** yes. `work.json` shows nothing gone.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot and `--end` closed the
  session (follow-up none).
- **Participant priming:** none found. The briefing's tool table lists `--shift-click` as one of
  the tool's generic modifiers, next to `--ctrl-click` and the rest. It says nothing about
  selecting two nodes and does not name "Select endpoints" or the edge inspector.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                     |
| --- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 1        | wording         | The edge inspector's title "Station -> Stadium" has an arrow, so he briefly wondered whether the 4 minutes count only one way. The arrow is the file's column order, not a fact about the bus. It did not change his answer.                                                                                       | `02.png` title; transcript, "What confused me" ("I wondered for a second if the 4 minutes only counts one way")                              |
| 2   | 1        | affordance      | Nothing on the drawing says a line can be clicked. He was "not sure a thin line could be clicked at all" and tried only because he had no other idea. It worked first try, so this cost him nothing here.                                                                                                       | transcript, Step 1 and "What confused me"; `01.png` (the line is thin and gray, with no hover cue in view)                                    |
| 3   | 1        | feedback        | After the plain click on Station he could not tell whether the tie was still selected too. Only the Selection count staying at 1 and the band turning gray told him. Once the tie is no longer selected, nothing marks the tie itself; the key notes the same for "Select endpoints".                              | `02.png` to `03.png` (blue band gone, Selection 1 -> 1); transcript, "What confused me"                                                      |
| 4   | 0        | discoverability | The edge inspector's "Select endpoints" (in the "..." menu) went unused. He reached the same end state with Shift-click, so this is not a defect in this session. It is recorded because T24 measures how participants get from "the two on this tie" to a selection.                                              | `02.png` (the "..." button at the top right of the inspector, never opened); steps 2 and 3                                                   |

No severity 2 or above: the answer and the end state were right on the first try with no detour.

Not studied: keyboard-only and screen-reader use. This session is a simulated returning user
briefed with a history, not a real person, so a pass here is weak evidence.
