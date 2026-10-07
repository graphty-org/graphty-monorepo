# Grade: session r3-s32 -- Dev (student with a class project), task T11, Les Miserables

Build: commit f108a2350, graphty 0.8.53 (build stamp b7590f8de, session.json), sighted mouse
mode, 1440 x 900. Graded from the last screenshot (16.png), the layout screenshots (05.png to
16.png) and the transcript. The session saved no files (there is no `downloads/` folder). Not
graded from the participant's rating (4 of 7).

## Grade: S (success)

The success definition is "a different layout method applied (not a re-run of the same one) and
node positions visibly changed". It holds three times:

1. **Spectral** (steps 4-6): Layout, Spectral, Apply. The Force drawing (02.png) is replaced by a
   ball in the top-right corner with a few outliers (06.png). A different method, positions
   changed. The success state is first reached here, at step 6, with no detour.
2. **Rings by group** (steps 12-14), after a Louvain run: concentric rings, one color per ring
   (14.png).
3. **Columns by group** (steps 15-16): six vertical columns, one per Louvain group (16.png, the
   last screenshot). The end state holds.

"Did it help" is an opinion and not graded. His answer is consistent with the screen: Spectral
made it worse, Rings by group separated colors but tangled the lines, Columns by group made the
groups easiest to tell apart, and the coloring by Louvain did more than any arrangement.

Why S and not SD: the method changed on the first try, with no detour before it. The Spectral
undo and the Louvain run came after the success state, while he looked for a better answer; the
Louvain run is the route the answer key calls the right model for "clusters easier to tell apart".

- **Community run made:** yes, Louvain (steps 8-11), found by typing "modularity" in the Analyze
  filter.
- **Group layout tried:** yes, both Rings by group and Columns by group, each opened with "Group
  by: Communities" already chosen and applied.
- **Group layouts after the run:** greyed before the run with "Needs a node attribute to group by"
  (04.png, correct for Les Miserables), available after it (12.png). The round 3 change landed.
- **No crossings / Two columns refusals:** read correctly (04.png, 12.png); he understood the
  gist but not the words. Not wrong turns.
- **Usage card:** declined ("No thanks", step 2). No detour.
- **Failure codes:** none.
- **Build-decided:** no.
- **Void:** no. Every click reached a real, visible control.

## Counts

| | This session | Reference (answer key) |
|---|---|---|
| Actions to the success state (first different layout applied) | 6 (No thanks, Les Miserables, hover, Layout, Spectral, Apply), step 6 | 4 (open sample, Layout, method, Apply) |
| Actions to a group layout applied | 15, step 14 | about 8 |
| Step commands in the whole session | 15 step commands (17 actions) | -- |
| Wrong turns | 1 | -- |

- **The wrong turn:** step 6, Spectral applied and then undone at step 7 (06.png, 07.png).
- **Not counted as wrong turns:** the hover that found the Layout tooltip (step 3); Rings by
  group (step 14), applied and kept on screen until Columns by group replaced it, as a comparison
  he set out to make.

## False "done"

None. "Did I finish? Yes, mostly." The screen agrees: three layouts applied, and 16.png shows the
columns. Each description he gives of a layout matches its screenshot (06.png, 14.png, 16.png).
His note that the columns run pink first while the key lists Group 1 first is a correct reading
of 16.png.

## Bars touched

- **Bar 4 (silent commit):** none. Each Apply changed the canvas (05.png to 06.png, 13.png to
  14.png, 15.png to 16.png); Run colored the dots and added the key (10.png to 11.png).
- **Bar 5 (counts and key against the drawing):** "Louvain 6" and group sizes 20, 17, 11, 11, 10,
  8 (sum 77) match the 77 nodes; the columns in 16.png hold 20, 17, 11, 11, 10 and 8 dots. No
  mismatch.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down. Two are build defects
reproduced by a scripted path; the rest are seen in this one participant.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | Spectral piles almost all 77 nodes into one small ball in a corner, with a chain of 3 outliers and 2 far-off nodes, so no group can be told apart; nothing on screen says anything went wrong. Its own form promises "densely connected groups land near each other". Same on every run (the corner varies between runs, the shape does not). | Session: step 6, 05.png to 06.png; transcript "they landed on top of each other". Repro: `rounds/round-3/repro/r3-s32/repro.sh` -- run/05.png and run/08.png, two Applies in one run, the same collapsed shape. |
| 2 | 2 | build-defect | Undo after a layout brings the old positions back but the view does not refit: the drawing sits cut off at one edge of the canvas, half the canvas empty, and stays so until another layout is applied. | Session: step 7, 07.png (cut off at the top), still cut off in 11.png. Repro: run/06.png (cut off at the bottom, under the toolbar). |
| 3 | 2 | wording | The greyed group layouts say "Needs a node attribute to group by" without saying how to get one (run a community analysis). He knew only because his tutorial did communities next. | Step 4, 04.png; debrief. |
| 4 | 2 | wording | Refusals shown in graphty-element's own English with internal names: 'the layout "planar" cannot draw this graph without crossings: G is not planar.' and 'the layout "bipartite" needs exactly two groups, and "results.louvain.group" names 6'. He got the gist but asked what "planar" and "G" are. | Steps 4 and 12, 04.png, 12.png; debrief. |
| 5 | 1 | wording | "Rings by group" form says "around a shared centre" (British spelling). | Step 13, 13.png. |
| 6 | 1 | behavior | Columns by group draws its columns in an order (Group 6, 1, 5, 3, 4, 2) that does not follow the key's Group 1 to 6, though the form says "in the order the groups are given". He read it correctly by color. | Step 16, 15.png, 16.png. |
| 7 | 1 | wording | The layout he was taught, ForceAtlas 2, is not named; he had to guess "Force" was the same family. | Step 4, 04.png; debrief. |
| 8 | 1 | behavior | No names on the dots in any layout, so he can say which group a dot is in but not who it is without hovering one by one. | 16.png; transcript step 16. |
| 9 | 0 | opinion | Rings by group separates colors but crosses every edge through the middle and hides the small pink group; held one level down. | Step 14, 14.png. |

**What worked:** the Layout tooltip on hover; one-line descriptions on every method; the Analyze
filter found Louvain and Leiden from "modularity", a word neither entry contains; Run colored the
dots and added the key and the outline counts; the group layouts lit up after the community run
and opened with "Communities" already chosen; undo was there when Spectral went wrong.

## Repro

`rounds/round-3/repro/r3-s32/repro.sh` (output in `run/` and `run.log` beside it): opens Les
Miserables, applies Spectral (run/05.png, collapsed), undoes (run/06.png, drawing cut off at the
canvas edge), applies Spectral again (run/08.png, the same collapse).
