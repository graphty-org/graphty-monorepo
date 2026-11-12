# Pilot: T15, a whole first session

Build under study: commit e82708488, graphty@0.8.53, no uncommitted changes, `/?next`, 1440 x 900.
Both versions of the prompt were walked from an empty start with `real.mjs`, following the success
path in `answers.md` (T2's step, T7's run, T9's size steps, T10's label steps, T13's image steps).
This build names runs by their result ("Influence"), so the run row, the Size option and the
legend use that word.

- Version A (Les Miserables sample): session `les-miserables/`, screenshots `01.png` to `19.png`,
  image `les-miserables/downloads/les-miserables_current-view.png` (1806 x 1720).
- Version B (`friends.csv`): session `friends/`, screenshots `01.png` to `19.png`, image
  `friends/downloads/friends_current-view.png` (1806 x 1720).

Every command exited 0. No step missed, nothing was ambiguous, and no script error, console error
or failed request was printed. Once, in B, the tool printed "the drawing is still moving" after
picking PageRank (`friends/06.png`); the dots are in the same places in `03.png`, `06.png` and
`07.png`, so nothing a participant would see moved.

## Result

**The end state is reached on both versions: all five parts hold at once in the final screenshot,
and none was undone by a later step.** The path is 18 steps after the start on both versions.

| Part                         | A (Les Miserables)                                                                                                                                        | B (friends.csv)                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1. Data drawn                | `03.png`: 77 nodes, 254 edges, one component                                                                                                              | `03.png`: 20 nodes, 41 edges, one component, Directed                                        |
| 2. Ranking run, finished     | `07.png`: row "Influence 77", legend "Color: Influence"; `08.png` Top 10 Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577 (matches the reference values) | `07.png`: "Influence 20"; `08.png` Top 10 Farah 0.06608, Ava 0.06423, Hana 0.05883 (matches) |
| 3. Sizes bound to the result | `13.png`: Size line "1 to 3"; dots visibly differ; legend gains "Size: Influence" above "Color: Influence"                                                | `13.png`: the same                                                                           |
| 4. Names on every node       | `16.png`: label line on Everything bound to `name`; "77 labels, 6 hidden to avoid overlap"                                                                | `16.png`: bound to `id` (the names); "20 labels, 0 hidden to avoid overlap"                  |
| 5. Image with its key        | `19.png`: notice "Exported les-miserables_current-view.png"                                                                                               | `19.png`: notice "Exported friends_current-view.png"                                         |

Meaning: in both versions the on-screen legend reads "Size: Influence" and "Color: Influence", so
"bigger and darker means more Influence" can be read from the screen.

### The picture checklist

Both images pass.

- Same nodes and arrangement as the final screen: yes; the image is the canvas (903 x 860) at 2x.
- Sizes visibly different: yes (Valjean and Myriel in A; Ava, Farah, Ivan and Hana in B).
- Names drawn on screen are drawn in the image: yes.
- A key naming every channel in use: yes, "Size: Influence" (a gray wedge, 0.003299 to 0.07543 in
  A, 0.04382 to 0.06608 in B) and "Color: Influence" (the orange ramp, same range).

## Blockers

None. Nothing below stops a participant from reaching the end state. These are findings the
graders and the next fix pass should know about; every one was also seen on the earlier walk of
this task (commit 452285142) and is unchanged on this build.

### Element defects (not blocking)

1. **On-screen dot size mixes the value with distance from the camera.** B is drawn in
   perspective. Farah has the highest Influence (0.06608) but is drawn smaller than Ava (0.06423):
   in the exported image Farah's dot is about 120 px across and Ava's about 140 px
   (`friends/downloads/friends_current-view.png`). A participant who reads "the biggest dot
   matters most" names Ava, which is wrong (`read-wrong` or `meaning-wrong` risk on T9 and T15).
2. **A dot grown by the size binding covers its neighbor and its own name.** In B, Chloe's dot is
   drawn over Farah's and the "Chloe" label sits across Farah (`friends/16.png` and the image); Eli
   and Dev overlap. In A, "Valjean" sits inside the top of the biggest dot and cannot be read
   (`les-miserables/16.png`, and the image). Labels are not moved out for the new size.
3. **Labels in the 2x image are blurry.** Names in both images are soft and pixelated, as if drawn
   at screen resolution and scaled up; the small ones in A's dense middle cannot be read.

### App defects (not blocking)

4. **The Les Miserables Overview shows raw file syntax and loses its row name.** `les-miserables/03.png`:
   the direction row reads "Undirected, from the file: directed 0", clipped at the panel's right
   edge, with no "Direction" label; `friends/03.png` shows the intended "Direction Directed".
5. **The Size line does not name what it is bound to.** After binding, the Color line reads
   "Influence" but the Size line reads only "1 to 3" (`13.png` in both). Only the canvas legend
   names the size's attribute, so a participant checking the panel cannot confirm the size step
   there -- where `false-done` on the size step is expected.
6. **The Everything row's Style tab shows values the drawing does not.** Selecting Everything after
   the size step shows Color "#63..." with a blue swatch and Size "1" (`14.png` in both) while every
   dot is orange and sized. These are the base values the Influence row paints over, but nothing
   on the tab says so.
7. **The run never names its method after it finishes.** The Influence row's Values say "Analysis
   Influence" and "Measure from Influence" (`08.png` in both); "PageRank" appears nowhere once the
   form closes. The answer key accepts "Influence", so no grade changes.
8. **The Values histogram for a 20-node result is uninformative.** `friends/08.png`: twenty bars of
   equal height, one per value.
9. **The canvas legend covers part of the drawing.** In A the legend box hides the left of the top
   cluster near "Blacheville" (`les-miserables/16.png`); the exported image places its key in the
   corner without covering any node.

### Answer-key notes

10. T13's path still lists `--click "role=tab:Image"`; the Image tab is already selected when the
    dialog opens (`17.png` and `18.png` are byte-identical in both sessions), so the step is a
    no-op. The note about `role=gridcell:Image` until a fix lands is out of date: `role=tab:Image`
    resolves.
11. T15's path ("about 18") is written for A only. B's first step is `--click "Open project or
file" --upload friends.csv` (one step), and its label step picks `id`, not `name`. With those,
    both versions take 18 steps after the start.
12. The reference values in `answers.md` (both datasets' Influence top 3 and range, "77 labels, 6
    hidden" once sized, "20 labels, 0 hidden") all match this build.

### Tool and task wording

No tool defect: every named control resolved on the first try, the upload and both downloads were
reported, and both sessions ended cleanly. The one "still moving" print (B, after picking
PageRank) did not match any visible movement; worth watching, not a defect yet. No task-wording
problem was found; this walk follows the success path, so it cannot show where a first-time
participant would go wrong.
