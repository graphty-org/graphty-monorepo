# Grade: session r2-s42 -- Mara (Gephi holdout), T11 "Untangle the drawing"

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Les Miserables sample, started empty.
Graded from the last screenshot (25.png), the transcript and one scripted re-run on the same
build. No files were downloaded (the task asks for none).

## Grade: SD (success with difficulty)

- **Success definition met.** A different layout method was applied and the node positions
  changed between screenshots: Layout > Spectral > Apply at step 21 (20.png form, 21.png result,
  a knot with two long pendant chains, clearly unlike the Force drawing in 18.png). Mara then
  undid it (step 22) and ended on the 2D Force drawing in a 2D camera (25.png). The undo does not
  cancel the success: the task asks that another method be applied and seen, and whether it
  helped is opinion ("Spectral made it much worse" is the expected kind of answer).
- **Why SD, not S:** the different method came only after a long detour. Steps 4-13 changed only
  the Force layout's own settings (Shape 2D, then spring length and gravity), which on their own
  are a re-run of the same method and would have been F. Steps 14-19 went to Louvain and a
  disabled group layout before she tried Spectral.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## Counts

|                                                    | This session                 | Reference            |
| -------------------------------------------------- | ---------------------------- | -------------------- |
| Steps (real.mjs) to the success (Spectral applied) | 20 after the start (step 21) | 4 on round 2's build |
| Steps in all                                       | 24 after the start           | --                   |
| Wrong turns                                        | 3                            | --                   |

Wrong turns:

1. Step 5 (05.png): hovered "Force" hoping for the algorithm's name; there is no tooltip.
2. Steps 11-13 (11.png-13.png): raised repulsion (gravity -1.2 to -4) and shortened springs;
   the drawing became an even mesh and she undid it.
3. Steps 18-19 (18.png, 19.png): clicked "Rings by group", disabled ("Needs a node attribute to
   group by") although Louvain had just given every node a community; nothing happened.

Not counted as wrong turns: Force with Shape 2D (steps 6-8) was a sensible try that did change the
picture, but it is the same method; the Louvain run (steps 14-17) is her own check that the
clusters were real; the camera fix after Spectral's undo (steps 22-25) is recovery from problem 2.

## False "done"

None. Her closing claims match the screens: the 2D Force drawing separates three or four
communities (25.png), more repulsion made an even mesh (12.png), Spectral made a knot with two
chains flung out (21.png).

## Problems

Severity 0-4 (Nielsen). Build defects were checked with
`rounds/round-2/repro/r2-s42/repro.sh` (her pointer path, condensed; output in `run/` and
`run.log`), which behaved as the session did.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                               | Evidence                                                                                                                  |
| --- | --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect | "Rings by group", "Two columns" and "Columns by group" stay disabled with "Needs a node attribute to group by" after Louvain has made 6 communities, shown in the outline and the legend; clicking the row does nothing. Mara: "My partition was right there and the layouts couldn't use it." Which attributes a layout can group by is graphty-element's to report. | Steps 18-19, 18.png, 19.png. Repro: `run/05.png`, `run/06.png` (the row highlights, nothing else).                        |
| 2   | 2   | build-defect | Ctrl+Z after Spectral puts the Force positions back but keeps Spectral's view, so the drawing sits off-center: half off the canvas and under the legend in the session, pushed down under the toolbar in the re-run. Most of the canvas is empty and nothing refits.                                                                                                  | Step 22, 22.png. Repro: `run/08.png`.                                                                                     |
| 3   | 2   | build-defect | After Force is applied in 2D, the toolbar still reads "3D" and the camera stays an orbit camera: dragging empty canvas rotates the flat drawing into a tilted perspective instead of panning it. A control shows the wrong state and a flat layout is viewed as a 3D object.                                                                                          | Steps 8 and 23, 08.png, 23.png. Repro: `run/03.png` (toolbar "3D" after 2D Force), `run/09.png` (drag tilts the drawing). |
| 4   | 2   | build-defect | Spectral's result is not fitted to the view: the knot of about 70 nodes sits in a corner, half under the legend, with two chains out to the edges. The form's line "densely connected groups land near each other" does not match what is drawn.                                                                                                                      | Step 21, 21.png. Repro: `run/07.png`.                                                                                     |
| 5   | 2   | behavior     | Fit ("center the graph") is only in the menu under the button labeled "3D"; Mara found it after a drag rotated her drawing, and said she would never have looked there.                                                                                                                                                                                               | Steps 22-24, 22.png, 24.png. One participant.                                                                             |
| 6   | 2   | wording      | The Force description shows a configuration key to users: "in three dimensions or, with 'dim: 2', flat."                                                                                                                                                                                                                                                              | Step 6, 06.png.                                                                                                           |
| 7   | 1   | wording      | "No crossings" is disabled with graphty-element's raw error: 'the layout "planar" cannot draw this graph without crossings: G is not planar.' ("G", "planar").                                                                                                                                                                                                        | Step 4, 04.png; 18.png.                                                                                                   |
| 8   | 1   | opinion      | "Force" names no algorithm (no tooltip, no name in the form), so it cannot be cited in a methods section; "Gravity" is negative with no units or hint which way separates groups, and her guess made it worse.                                                                                                                                                        | Steps 5, 6, 10-12; 05.png, 06.png, 10.png, 12.png.                                                                        |
| 9   | 1   | behavior     | The Layout toolbar icon has no visible word; she found it only by hovering.                                                                                                                                                                                                                                                                                           | Steps 2-3, 02.png, 03.png.                                                                                                |

What worked, for the record: undo covers a layout run (step 13, 13.png); the seed is shown and
editable under Advanced (10.png); the Analyze search found Louvain and Leiden for "modularity"
(15.png); communities are listed by size with a legend on the canvas (17.png); the 2D camera plus
Fit gave a readable flat map (25.png).
