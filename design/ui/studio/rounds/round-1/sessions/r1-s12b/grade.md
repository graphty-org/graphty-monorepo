# Grade: session r1-s12b -- Dev, names on every dot (Les Miserables)

**Grade: SD** (success with difficulty). Every part of the success definition holds on the last
screenshot and in the transcript:

- A label line bound to `name` sits on the Everything row, so it covers all 77 nodes (`11.png`:
  "Aa Above  Abc name").
- Character names are drawn on the canvas (Blacheville, Fameuil, Myriel, Napoleon and others in
  `07.png` and `11.png`).
- Dev read the count statement "77 labels, 7 hidden to avoid overlap" (step 7, `07.png`) and said
  why some names are missing: "'To avoid overlap' -- so if I zoom in they won't overlap" (step 10)
  and "7 of them are not drawn and I could not find a way to make them show" (debrief). That is
  the expected answer on this build, which has no control that shows every name.

It is SD rather than S because Dev first looked for labels on the graph's own Style tab (step 4),
where there are none, and only found them by guessing "Everything".

## Measures

- **Steps:** 10 `real.mjs` steps after the start (`02.png` to `11.png`, one hover included). The
  success path is 4 steps (open the sample, Everything, Add label line, `name`) plus reading the
  count. Dev reached the success state at step 7 (`07.png`); the last 4 steps were spent looking
  for a way to show the 7 hidden names.
- **Wrong turns:** 4. The graph's Style tab (step 4, `04.png`); the "Aa" position button (step 8,
  `08.png`); clicking the "7 hidden" text (step 9, `10.png`); the mouse wheel over the drawing
  (step 10, `11.png`). The last three came after success and were searches for a control that does
  not exist.
- **False "done":** none. Dev never said every name was drawn. His closing words were "Almost all
  the dots have names now ... I give up on the last 7", which agrees with the screen.
- **Usage card:** declined with "No thanks" at once (step 2).
- **Build-decided:** no. **Void:** no. The 17-minute wait for a browser slot happened before
  `01.png` and is not part of the session.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | build-defect | Turning the mouse wheel over the drawing does not zoom. The screenshots before and after are pixel-identical, at delta -500 and at -1500. graphty-element's 3D orbit camera handles pinch and keyboard zoom but has no mouse-wheel handler (`graphty-element/src/cameras/OrbitInputController.ts`; only the 2D controller listens for the wheel). Dev wanted to zoom in to read the crowded names and could not. | step 10, `10.png` vs `11.png`; repro below |
| 2 | 2 | behavior | Node label settings are not on the graph's Style tab, which shows only the canvas background and the layout. Nothing points to "Everything" as the place for node settings; Dev found it by guessing. | step 4 `04.png`, step 5 `05.png` |
| 3 | 2 | behavior | "77 labels, 7 hidden to avoid overlap" says names are missing but offers no way to see them: it is plain text, not a control, with no tooltip. Dev tried to click it. | step 9 `09.png`, `10.png` |
| 4 | 1 | behavior | The "Aa" button next to the label line looks like the label's settings (size, show all) but only picks the label position. | step 8 `08.png` |
| 5 | 1 | opinion | The names are drawn very small and pile up in the crowded center, so many cannot be read. | `07.png`, `11.png` |
| 6 | 1 | opinion | The count statement is tiny gray text, easy to miss. | `07.png` |
| 7 | 1 | opinion | The bottom toolbar is icons only; Dev never knew what they did and did not try them. | step 3 `03.png` |

## Repro of problem 1

`design/ui/studio/rounds/round-1/repro/r1-s12b/`, on the same build (commit 4522851420998602, graphty@0.8.53),
run from the studio worktree:

```
node design/ui/studio/tool/real.mjs --start <repro dir> empty
node design/ui/studio/tool/real.mjs --step <repro dir> --click "No thanks"
node design/ui/studio/tool/real.mjs --step <repro dir> --click "Les Miserables"   # 03.png
node design/ui/studio/tool/real.mjs --step <repro dir> --wheel 720,400,-500      # 04.png
node design/ui/studio/tool/real.mjs --step <repro dir> --wheel 750,450,-1500     # 05.png
node design/ui/studio/tool/real.mjs --end <repro dir>
```

`03.png`, `04.png` and `05.png` are pixel-identical: neither wheel turn changed the view.
