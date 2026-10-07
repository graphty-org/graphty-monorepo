# Pilot: T15, a whole first session

Build under study: commit 452285142, graphty@0.8.53, no uncommitted changes, `/?next`, 1440 x 900.
Both versions of the prompt were walked from an empty start with `real.mjs`, following the success
path in `answers.md` (T2's step, T7's run, T9's size steps, T10's label steps, T13's image steps).
The script that ran both walks is `tmp/t15-pilot.sh` in the worktree; its output is
`tmp/t15-pilot.out`.

- Version A (Les Miserables sample): session `les-miserables/`, screenshots `01.png` to `19.png`,
  image `les-miserables/downloads/les-miserables_current-view.png` (1806 x 1720).
- Version B (`friends.csv`): session `friends/`, screenshots `01.png` to `19.png`, image
  `friends/downloads/friends_current-view.png` (1806 x 1720).

The folders `A/` and `B/` hold the earlier walk of the same path on commit 9d6598eea; they are kept
for comparison and are not described here.

Every command exited 0. No step missed, nothing was ambiguous, no script error, console error or
failed request was printed, and the drawing was never reported as still moving.

## Result

**The end state is reached on both versions: all five parts hold at once in the final screenshot,
and none was undone by a later step.** The path is 18 steps after the start on both versions.

| Part | A (Les Miserables) | B (friends.csv) |
|---|---|---|
| 1. Data drawn | `03.png`: 77 nodes, 254 edges, one component, no arrowheads | `03.png`: 20 nodes, 41 edges, one component, Directed |
| 2. Ranking run, finished | `07.png`: row "Influence 77", legend "Color: Influence"; `08.png` Top 10 Valjean 0.07543, Myriel 0.04278, Gavroche 0.03577 (matches the reference values) | `07.png`: "Influence 20"; `08.png` Top 10 Farah 0.06608, Ava 0.06423, Hana 0.05883 (matches) |
| 3. Sizes bound to the result | `13.png`: Size line "1 to 3"; dots visibly differ; legend gains "Size: Influence" above "Color: Influence" | `13.png`: the same |
| 4. Names on every node | `16.png`: label line on Everything bound to `name`; "77 labels, 6 hidden to avoid overlap" | `16.png`: bound to `id` (the names); "20 labels, 0 hidden to avoid overlap" |
| 5. Image with its key | `19.png`: notice "Exported les-miserables_current-view.png" | `19.png`: notice "Exported friends_current-view.png" |

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
graders and the next fix pass should know about. Every defect found by the earlier walk on
9d6598eea is still present on this build; the two commits since then did not touch them.

### Element defects (not blocking)

1. **On-screen dot size mixes the value with distance from the camera.** B is drawn in perspective:
   labels and dots further from the camera are smaller (the "Pia" label against "Farah" in
   `friends/16.png`). Farah has the highest Influence (0.06608) but is drawn smaller than Ava
   (0.06423): in the exported image Farah is about 120 px across and Ava about 140 px. Before the
   size step Farah's dot is already the smallest dark one, half hidden behind Chloe
   (`friends/07.png`). A participant who reads "the biggest dot matters most" names Ava, which is
   wrong (`read-wrong` or `meaning-wrong` risk on T9 and T15, and on T7 if read from the picture).
2. **A dot grown by the size binding covers its neighbor and its own name.** In B, Farah's dot grows
   over Chloe's and the "Chloe" label is drawn across it (`friends/16.png` and the image); Eli and
   Dev overlap too. In A, Valjean's dot grows over his own label: "Valjean" sits inside the top of
   the biggest dot and cannot be read on screen (`les-miserables/16.png`) or in the image. The
   label is not moved out for the new size, and the layout does not make room.
3. **Labels in the 2x image are blurry.** In both images the names are soft and pixelated, as if
   drawn at screen resolution and scaled up. Large names stay readable; the small ones in the
   dense middle of A are not, as on screen.

### App defects (not blocking)

4. **The Les Miserables Overview shows raw file syntax and pushes its label out.** `les-miserables/03.png`:
   the direction row has no "Direction" label and reads "Undirected, from the file: directed 0",
   the GML file's own `directed 0` line, clipped at the panel's right edge. `friends/03.png` shows
   the intended form, "Direction  Directed". The words come from `directionWords` in
   `graphty/src/workspace/inspector/words.ts`; the long value crowds out the row name in
   `GraphValues.tsx`.
5. **The Size line does not name what it is bound to.** After binding, the Color line reads
   "Influence" but the Size line reads only "1 to 3" (`13.png` in both). The attribute is named only
   by the canvas legend, so a participant checking the panel cannot confirm the size step there,
   which is where `false-done` on the size step is expected.
6. **The Everything row's Style tab shows values the drawing does not.** After the size step,
   selecting Everything shows Color "#63..." with a blue swatch and Size "1" (`14.png` in both)
   while every dot on the canvas is orange and sized. These are the base values the Influence row
   paints over, but nothing on the tab says so; a participant who opens Everything to add names may
   think the colors and sizes were lost.
7. **The run never names its method after it finishes.** The Influence row's Values say "Analysis
   Influence" and "Measure from Influence" (`08.png` in both); "PageRank" appears nowhere once the
   form closes. The answer key accepts "Influence", so this does not change a grade, but a
   participant asked what the sizes stand for cannot name the method from the screen.
8. **The Values histogram for a 20-node result is uninformative.** `friends/08.png`: twenty bars of
   equal height, one per value, so it shows no distribution.

### Answer-key notes

9. T13's path still lists `--click "role=tab:Image"`; the Image tab is already selected when the
   dialog opens (`17.png` and `18.png` are identical in both sessions), so the step is a no-op.
   The note about using `role=gridcell:Image` until a fix lands is out of date: `role=tab:Image`
   resolves.
10. T15's path ("about 18") is written for A only. B's first step is `--click "Open project or
    file" --upload friends.csv` (one step), and its label step picks `id`, not `name`. With those,
    both versions take 18 steps after the start.
11. The reference values in `answers.md` (Les Miserables and friends.csv Influence top 3 and range,
    "77 labels, 6 hidden" once sized, "20 labels, 0 hidden") all match this build; nothing needs
    re-recording.

### Tool and task wording

No tool defect: every named control resolved on the first try, the upload and both downloads were
reported, and both sessions ended cleanly. No task-wording problem was found; this walk follows the
success path, so it cannot show where a first-time participant would go wrong.
