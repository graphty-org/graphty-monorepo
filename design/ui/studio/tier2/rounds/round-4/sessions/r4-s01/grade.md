# Grade: session r4-s01 -- Alex (regular analyst), running club (T24 A), one tie on the drawing

**Grade: S** (success). Both halves of the task are met. The number: after a click on the
Gus-Ivan line, the inspector reads "Gus -> Ivan", subtitle "Edge", Summary From Gus, To Ivan,
weight 1 (`03.png`), and Alex answered "1 run", the key's value. The two ends: the last screen
(`05.png`) shows Gus and Ivan ringed in yellow, the inspector titled "2 nodes selected" (subtitle
"Selection") with Summary Nodes 2 and "Edges joining these nodes 1", and the left panel's
Selection row 2. No other node carries a ring. Alex selected the two one at a time (a click on
Gus, then a Shift-click on Ivan) and never looked for the tie's "Select endpoints" command. The
answer key lists that route as valid on this build, with the same end state as Select endpoints
(`rounds/round-4/pilot/T24A/06.png`, `07.png`), and grades other routes by the end state. It is
not the SD case ("selected one at a time after the ends command was not found"), because Alex did
not search for an ends command and fail; this was the first route chosen. No detour: the line was
hit on the first click and no wrong tie was opened.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked-names.txt` (ranked, colored and sized by
PageRank, every name drawn, Everything inspector open on the Style tab). Tool commit
`71ed347b39a5`, no uncommitted changes.

## The answer against the key

- **Number (right).** `03.png`: From Gus, To Ivan, weight 1. Alex read it from the screen, not
  from the line's look.
- **Ends (right).** `05.png`: exactly Gus and Ivan selected, as above. Earlier, the click on Gus
  replaced the tie's selection with Gus alone (`04.png`, Selection 1, Gus inspector: Degree 4,
  PageRank 0.0535, #5 of 20), so nothing was left over from the tie.
- **The Hana label trap.** The "Hana" label box covers the lower half of Ivan and the Gus-Ivan
  line stops at its left edge (`01.png`, `03.png`). Alex did not read the tie as Gus to Hana: the
  inspector title "Gus -> Ivan" settled it, and the Shift-click landed on Ivan (the tool reports
  node "Ivan" at 821,547).
- **Work kept.** `work.json`: the start and end lists are identical (one PageRank run, four style
  layers, no notes, no steps, one source friends.csv); nothing gone.

## Measures

- **Clicked the line itself:** yes, on the first try (`--click-at 757,584`, the tool printed
  `edge with id "13"`), 2 pixels from the success path's point.
- **Route to the two ends:** click Gus, Shift-click Ivan. "Select endpoints" was never opened; the
  "Edge actions" menu was not visited. The app's words "Edge", "Select endpoints" and "Edges
  joining these nodes" did not have to be found; Alex read the last one as confirmation that no
  one else was caught.
- **Steps:** 4 `real.mjs` steps after the start (`02.png` to `05.png`): hover, click the line,
  click Gus, Shift-click Ivan. The success path is 4 (click the line, read, Edge actions, Select
  endpoints; 3 actions). The hover changed nothing and is exploration, not a wrong turn.
- **Wrong turns:** 0.
- **False "done":** none. "Done" (step 4) and the end claims ("1 run", "the only two selected")
  are both true on `05.png`. truth-on-screen: holds.
- **Silent commit:** none. The tie click drew a blue band on the line and switched the inspector
  (`03.png`); each node click changed the rings, the inspector and the Selection row (`04.png`,
  `05.png`).
- **Numbers that disagree:** none. weight 1 matches the key; Nodes 2 and "Edges joining these
  nodes 1" match the two rings and the one line between them.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool reported what
  each pointer action hit, and `leaks.json` shows no leaks over 17 calls.
- **Scripted exit:** not applicable; Alex finished.

## Problems

| #   | Severity | Kind             | Problem                                                                                                                                                                                                                                                                  | Evidence                                                                                                                         |
| --- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2        | trust            | The tie is titled "Gus -> Ivan" and the drawing has arrowheads, although a shared run has no direction. Alex took this as a sign the app treats the list as one-way and doubted later results ("which matters for betweenness"). The screen gives no way to see or change that reading here. | `03.png` (title "Gus -> Ivan", arrowheads on every line); transcript end: "Makes me wonder if it's treating my list as one-way" |
| 2   | 1        | discoverability  | Hovering a tie gives no feedback beyond the pointer turning into a hand: the line does not change and no tooltip opens, so it is not clear a click will open it. Cost one extra step here.                                                                                | `02.png` (identical to `01.png` apart from the pointer); transcript step 1: "Nothing shows on hover"                             |
| 3   | 1        | wording          | The tie's value is shown under the file's column name "weight" with nothing saying what it counts. Alex knew it was runs because it was his own file, and said a colleague's file would leave him asking. Opinion, held one level down.                                       | `03.png` ("weight 1"); transcript end: "it doesn't say 'runs'"                                                                   |
| 4   | 1        | visual           | The "Hana" label covers the lower half of Ivan, and the Gus-Ivan line appears to end at "Hana". Alex was not misled (the inspector title named Ivan), so it did not change the outcome here.                                                                                | `01.png`, `03.png`, `05.png`                                                                                                     |

Problems 1 to 3 rest on one participant and are not confirmed by this session alone.
