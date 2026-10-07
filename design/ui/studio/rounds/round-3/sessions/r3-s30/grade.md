# Grade: session r3-s30 -- Jordan (marketing network analyst), bigger dots for the families that matter, Florentine families

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted, mouse.
Graded from the last screenshot (11.png), 09.png-10.png for the end state before the node was
selected, and the transcript, plus one scripted re-run on the same build. No files were saved, and
the task asks for none. Not from the participant's rating (5 of 7).

## Grade: S (success)

1. **Ranking run.** Steps 3-5 (03.png-05.png): the flask (Analyze), Betweenness, Run. The run
   finished, and the row "Betweenness 15" appeared in the outline. Betweenness sits in the
   "Rank nodes and edges" list and is a ranking. For "which families the network depends on most"
   it is the stronger choice: it measures who brokers between the others, and the sample's own
   description says "Good for finding who brokers between groups". Holds.
2. **Sizes bound to the result.** Steps 6-9 (06.png-09.png): the Betweenness row (it opened on
   Style), Shape "+", Size (the from-data list opened at once), then "Betweenness" in the list. The
   Size line reads "1 to 3". The key gained "Size: Betweenness 0 to 47.5" above "Color:
   Betweenness 0 to 47.5". The dots differ visibly: Medici is the largest, Guadagni and Strozzi
   are mid-sized, and the leaf families are small (09.png, 11.png). Holds.
3. **Meaning stated from the screen.** Debrief: "The size of each dot is the family's betweenness
   ... Bigger means more of the network's connections pass through that family (0 to 47.5) ... The
   color is the same measure again: light orange is low betweenness, dark brown is high." Both
   match the key. Holds.

- **Route:** the round 3 success path with Betweenness in place of PageRank. No detour and no help.
- **Size list:** used, not closed. "Fixed size" was not chosen. She paused briefly between
  "Betweenness" and "Betweenness rank", then chose the raw score. She did not say the sizes failed
  to change after the binding; they changed at once. Before the binding (05.png) she noted that
  the run only colored the dots, which is the expected state on this build.
- **Run name:** no pause or question about the run's name. The run row, the key and the Values all
  read "Betweenness".
- **Build-decided:** no. **Void:** no.
- **Failure codes:** none.
- **Usage card:** declined ("No thanks") without a detour. No wrong belief about what is sent.

## Counts

| | This session | Success path (round 3) |
|---|---|---|
| Steps (real.mjs, after the start) | 10 (step 2 held 2 commands) | 8 steps, 10 commands |
| Wrong turns | 0 | -- |

- Steps 10 and 11 (hover the big dot, then click it) came after the task's end state. She was
  checking who the biggest dot is, not correcting a mistake, so they are not wrong turns. Without
  them the session is 8 steps, the path's length.
- Steps against the path: 10 / 8, about 1.25x, inside the 2x measure.

## False "done"

None. She said "That's the task done mechanically" at 09.png, and the screen agrees: Size reads
"1 to 3", the key reads "Size: Betweenness", and the dots differ. Her final claim ("the dots are
sized by how much the network depends on each family, and I can say what the key means") matches
11.png.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. The build defect was
reproduced by `rounds/round-3/repro/r3-s30/repro.sh`, which runs the session's route as a script.
Its output is in `run/` and `run.log`. The layout is seeded, so the dots land in the same places
every run.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | The key, drawn in the top-left corner of the drawing after a run, covers one of the 15 family dots completely. Only 14 dots are visible, and one edge runs in under the key and stops there. The camera does not refit when the key appears. A reader cannot see, hover or click that family, and a picture made from this screen is missing it. She noticed ("the top-left node is hidden behind it"). | Step 5 onward, 05.png, 09.png, 11.png (14 dots; edge ending at the key's right edge near 550,90). Repro: `run/03.png` shows the dot at about 531,83 before any run; `run/10.png` shows the key over that spot, every run. |
| 2 | 2 | behavior | Hovering a dot shows nothing: no name and no tooltip. The only way to learn which family the biggest dot is was to click it and read the inspector. The Tooltip section in Style is empty by default, so this is the build's design, not a broken control. | Step 10, 10.png (tool: node "Medici", tooltip null). Repro: step 11, `run/11.png`, tooltip null. |
| 3 | 1 | behavior | Size is not named on the Style tab until Shape "+" is opened. She guessed that size would be under Shape. She guessed right at once, so it cost no steps. | Steps 6-7, 06.png, 07.png. |
| 4 | 1 | opinion | Running the analysis colors the dots but does not size them. Once sizes are bound, color and size repeat the same measure, and she expected a viewer to ask what the dark brown adds. Held one level down. | Steps 5 and 9, 05.png, 09.png; debrief. |
| 5 | 1 | opinion | The "Start here" tag on PageRank almost pulled her away from the measure the question asks for ("who the network depends on"). The one-line descriptions corrected it. Held one level down. | Step 3, 03.png; debrief. |
| 6 | 1 | opinion | The orange-to-dark-brown ramp may not survive a grayscale printout or a washed-out projector. Held one level down. | Step 5, 05.png; debrief. |
| 7 | 0 | opinion | No names on the dots for a slide. This is outside the task; a label line is the next step. | Step 2 onward; debrief. |

**What worked:** "Local only" and "Files are read on this computer and never uploaded" on the
first screen. Every Analyze method has a one-line description and a time estimate ("Under a
second"). Size "+" opens its from-data list at once, and "id" and "name" are greyed out with the
reason "holds groups, not amounts". The key names both channels with their range. The inspector's
"47.5, #1 of 15" is a value she can quote directly.
