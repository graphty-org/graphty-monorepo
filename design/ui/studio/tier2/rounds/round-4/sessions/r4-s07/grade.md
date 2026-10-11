# Grade: session r4-s07 -- Tom (tier 1 graduate), running club (T24 A), one tie on the drawing

**Grade: S** (success). Both halves of the task are met. The number: after a click on the
Gus-Ivan line, the inspector reads "Gus -> Ivan", subtitle "Edge", Summary From Gus, To Ivan,
weight 1 (`02.png`), and Tom answered "once", the key's value. The two ends: the last screen
(`04.png`) shows Gus and Ivan with yellow halos, the inspector titled "2 nodes selected" (subtitle
"Selection") with Summary Nodes 2 and "Edges joining these nodes 1", and the left panel's
Selection row 2. No other node has a halo. Tom selected the two one at a time (a click on Gus,
then a Shift-click on Ivan) and never opened the tie's "Edge actions" menu. The answer key lists
that route as valid on this build, with the same end state as Select endpoints
(`rounds/round-4/pilot/T24A/06.png`, `07.png`), and grades other routes by the end state. It is
not the SD case ("selected one at a time after the ends command was not found"): Tom did not
look for an ends command and fail; this was the first route he chose. No detour: the line was hit
on the first click and no wrong tie was opened.

Build seen: `5277e2cbe1bd graphty@0.8.64` (session.json), the frozen build named at the top of the
criteria, at 1440 x 900. Start: setup `friends-ranked-names.txt` (ranked, colored and sized by
PageRank, every name drawn). Tool commit `71ed347b39a5`, no uncommitted changes.

## The answer against the key

- **Number (right).** `02.png`: From Gus, To Ivan, weight 1. Read from the inspector, not from
  the line's look.
- **Ends (right).** `04.png`: exactly Gus and Ivan selected, as above. Before that, the click on
  Gus replaced the tie's selection with Gus alone (`03.png`: Selection 1, the Gus inspector with
  Degree 4 and PageRank 0.0535, #5 of 20, the blue band gone), so nothing was left over from the
  tie.
- **The Hana label trap.** The "Hana" label box covers the lower half of Ivan and the Gus-Ivan
  line stops at its left edge (`01.png`, `02.png`). Tom did not read the tie as Gus to Hana: the
  inspector title "Gus -> Ivan" named Ivan, and the Shift-click landed on Ivan (the tool reports
  node "Ivan" at 821,547). He checked afterwards that Hana had no halo.
- **Work kept.** `work.json`: the start and end lists are identical (one PageRank run, four style
  layers, no notes, no steps, one source friends.csv); nothing gone.

## Measures

- **Clicked the line itself:** yes, on the first try (`--click-at 758,583`, the tool printed
  `edge with id "13"`), 3 pixels from the success path's point.
- **Route to the two ends:** click Gus, Shift-click Ivan, chosen from habit with other programs.
  "Select endpoints" was never seen; the "Edge actions" menu was not visited.
- **Steps:** 3 `real.mjs` steps after the start (`02.png` to `04.png`): click the line, click Gus,
  Shift-click Ivan. The success path is 3 actions (click the line, Edge actions, Select
  endpoints).
- **Wrong turns:** 0.
- **False "done":** none. "I'm done" (step 3) and the end claims ("ran together once", "only
  those two glowing") are both true on `04.png`. truth-on-screen: holds.
- **Silent commit:** none. Each click changed the band or the halos, the inspector and the
  Selection row (`02.png` to `04.png`).
- **Numbers that disagree:** none. weight 1 matches the key; Nodes 2 and "Edges joining these
  nodes 1" match the two halos and the one line between them.
- **Ease (from the transcript):** 6 of 7. Not used for the grade.
- **Build-decided:** no. **Void:** no. Every step produced its screenshot, the tool reported what
  each pointer action hit, and `leaks.json` shows no leaks over 18 calls. `session.log` is empty,
  as it is for a run without errors.
- **Scripted exit:** not applicable; Tom finished.

## Problems

| #   | Severity | Kind            | Problem                                                                                                                                                                                                                 | Evidence                                                                                                  |
| --- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | 1        | wording         | The tie's value is shown under the file's column name "weight" with nothing saying what it counts. Tom knew it meant runs only because he remembered the column; someone else's file would leave him guessing.          | `02.png` ("weight 1"); transcript end: "If someone else had made the file, I'd be guessing"               |
| 2   | 1        | discoverability | Nothing on screen says that Shift-click adds a node to the selection. Tom tried it from habit and it worked; a user without that habit has no hint, and the tie's own "Select endpoints" is hidden behind a three-dot menu. | `03.png` (no hint near the node inspector or canvas); transcript end: "nothing on the screen told me"     |
| 3   | 1        | visual          | The "Hana" label covers the lower half of Ivan, and the Gus-Ivan line appears to end at "Hana". Tom clicked Ivan's name to be safe and was unsure of the hit until he saw Hana had no halo. Not misled.                 | `01.png`, `02.png`, `04.png`; transcript step 3 and end: "I wasn't sure until I saw that Hana wasn't lit" |
| 4   | 1        | wording         | The left panel's "Selection 1" stayed at 1 when the selection changed from the tie to Gus, so the row does not show that what is selected changed kind. Tom understood it only once it read 2.                          | `02.png` and `03.png` (both "Selection 1"); transcript end                                                 |

Problem 3 matches the answer key's known label overlap on this build. Problems 1, 2 and 4 rest on
one participant and are not confirmed by this session alone (problem 1 was also raised in r4-s01).
