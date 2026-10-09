# Grade: session r2-s41 -- Jordan (marketing network analyst), T11 "Untangle the drawing"

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Les Miserables from the start screen.
Graded from the last screenshot (22.png), the transcript and one scripted re-run of the session's
own path on the same build. No files were saved (no `downloads/`), and none were needed. Never
graded from Jordan's own rating (4 of 7).

## Grade: SD (success with difficulty)

- **A different method applied, positions changed.** Jordan opened Layout, picked Spectral (the
  method form opened) and pressed Apply (steps 4-6). Force was the method in use (ticked in
  04.png); Spectral replaced it and every node moved (02.png against 06.png). That meets the
  success definition at step 6.
- **The end state also differs from the start.** The last screen (22.png) shows Force in 2D
  with community colors, a different arrangement from the 3D Force drawing in 02.png. Force in
  2D is the same method with a different option, so on its own it would not count. The success
  comes from Spectral.
- **Whether it helped (opinion, not graded).** Spectral "made things much worse": one crushed knot
  plus a few far outliers. The flat Force drawing with Louvain colors helped "mostly". Jordan
  says the coloring did as much as the arrangement.
- **Why SD, not S:** Jordan needed the tooltip to find Layout. The toolbar icon has no word, so he
  hovered it at step 3 to read "Layout". After Spectral he took a long detour (Analyze, Louvain,
  the disabled "Rings by group", then Force settings) and needed Undo to get back. SD allows a
  tooltip and a detour; S allows neither.
- **Failure codes:** none.
- **Build-decided:** no. The build defects below cost time and trust but did not decide the
  grade. **Void:** no. The tool matched "Spring length" to both the box and its label and took the
  box, which is what a person clicks.
- **Usage card:** declined ("No thanks", step 2).

## Counts

|                                   | This session                          | Reference            |
| --------------------------------- | ------------------------------------- | -------------------- |
| Steps (real.mjs, after the start) | 21 in total; 5 up to success (step 6) | 4 on round 2's build |
| Wrong turns                       | 3                                     | --                   |

Wrong turns (a step off the success path that was later undone or abandoned):

1. Step 8: searched Analyze for "community", got no match, and retyped "cluster" (abandoned).
2. Steps 11-13: ran Louvain so that "Rings by group" would work. The row stayed disabled, and
   clicking it did nothing, so the plan was abandoned. Louvain's colors stayed on.
3. Steps 17-21: raised Force's spring length from 30 to 60 and applied it. The drawing scrambled,
   and Jordan undid it at step 22.

The hover at step 3 was a check before clicking, not a wrong turn. Spectral at step 6 is on the
success path, even though Jordan rejected the result.

## False "done"

None. Jordan's final claim matches 22.png. It shows a flat Force drawing in community colors with
the light-blue, orange, pink and yellow groups apart and green and dark blue overlapping in the
middle. He calls it "smaller than before" and "partly tucked near the legend", which is true. At
step 16 he noticed that the toolbar still read "3D" and did not claim the drawing was 3D.

Silent commits: none. Every Apply visibly changed the canvas. The disabled "Rings by group"
row was a refusal, not a commit.

## Problems

Severity runs from 0 to 4 (Nielsen's scale), and an opinion is held one level down. The build
defects were reproduced by `rounds/round-2/repro/r2-s41/repro.sh`, which replays the session's
own path. Its output is in `run/` and `run.log`:

- `run/03.png`: Spectral, the same crushed knot as 06.png but mirrored, with a node at the edge
  under the toolbar.
- `run/05.png` and `run/06.png`: "Rings by group" still disabled after Louvain.
- `run/07.png` to `run/11.png`: the toolbar reads "3D" after a 2D Apply. Apply reads "Applied"
  with 60 typed and turns blue only after Enter. Spring length 60 settles into the same scrambled
  picture as 20.png and 21.png, node for node.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Evidence                                                                             |
| --- | --- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| 1   | 3   | build-defect | Applying Force in 2D with spring length 60 instead of 30 gives a scrambled, random-looking picture. No groups are left, edges cross the whole canvas, and it stays that way after 5 seconds. A slightly longer spring should loosen the last drawing, not destroy it. Jordan: "I'd be scared to touch that setting on real data." Force is graphty-element's layout, so the fix belongs in graphty-element.                                                              | Steps 20-21, 20.png, 21.png. Repro: `run/10.png`, `run/11.png` (the same positions). |
| 2   | 3   | build-defect | "Rings by group", "Two columns" and "Columns by group" stay disabled with "Needs a node attribute to group by" after Louvain has made 6 communities, which are listed in the outline and the legend. The app's own groups cannot be used by its own group layouts, and nothing says what attribute is wanted or how to get one. Clicking the row does nothing (a dead end Jordan recovered from). Which attributes a layout can group by is graphty-element's to report. | Steps 12-13, 12.png, 13.png. Repro: `run/05.png`, `run/06.png`.                      |
| 3   | 2   | build-defect | Spectral packs about 70 of the 77 nodes into one small knot and flings a few out on long edges. The view is not fitted to the result, so the knot is tiny and an outlier sits at the window edge under the toolbar. The form's promise ("densely connected groups land near each other") is not visible in the result.                                                                                                                                                   | Step 6, 06.png. Repro: `run/03.png`.                                                 |
| 4   | 2   | build-defect | After Force is applied in 2D, the toolbar's dimension button still reads "3D" while the drawing is flat and the Force form shows 2D selected. A control shows the wrong state. Jordan: "made me second-guess whether it took."                                                                                                                                                                                                                                           | Steps 16-22, 16.png, 18.png, 22.png. Repro: `run/07.png`, `run/08.png`.              |
| 5   | 2   | build-defect | With 60 typed into Spring length, the button still reads "Applied" (gray). It turns into a blue "Apply" only after Enter or leaving the box. Someone who presses the gray button, or closes the form, believes the change is in place when it is not.                                                                                                                                                                                                                    | Steps 18-19, 18.png, 19.png. Repro: `run/08.png`, `run/09.png`.                      |
| 6   | 2   | behavior     | Searching Analyze for "community", the standard word in network analysis, finds nothing ("No analysis matches"). The community methods appear only under "cluster", in a section called "Find groups".                                                                                                                                                                                                                                                                   | Steps 8-9, 08.png, 09.png. One participant; unconfirmed until a second.              |
| 7   | 1   | wording      | The disabled "No crossings" row shows graphty-element's raw English: "the layout "planar" cannot draw this graph without crossings: G is not planar." Jordan: "reads like a programmer's error message." The line should come from the app as a code with parameters that the app words.                                                                                                                                                                                 | Step 4, 04.png, 12.png.                                                              |
| 8   | 1   | wording      | Force's description says "with 'dim: 2', flat", which is a config key, beside a 3D/2D switch that says the same thing in words.                                                                                                                                                                                                                                                                                                                                          | Step 14, 14.png, 18.png.                                                             |
| 9   | 1   | behavior     | The view is not refitted after Undo. The restored 2D drawing is drawn smaller and partly under the legend (22.png against 16.png). With spring length 60, some nodes also sit under the legend box (20.png).                                                                                                                                                                                                                                                             | Steps 20, 22, 20.png, 22.png.                                                        |
| 10  | 0   | opinion      | Force's Gravity defaults to a negative number (-1.2), which reads as backwards to someone who knows Gephi, where gravity pulls toward the center. Jordan left it alone.                                                                                                                                                                                                                                                                                                  | Step 14, 14.png.                                                                     |

What worked, for the record: once found, Layout opened a readable list of methods. Disabled rows
said why they were disabled. Picking a method opened a short description with "Under a second"
and did not commit anything until Apply. Louvain colored the drawing and added a legend with no
extra steps. Undo restored the previous arrangement in one click. The Force form remembered its
last settings and showed "Applied" when nothing had changed.
