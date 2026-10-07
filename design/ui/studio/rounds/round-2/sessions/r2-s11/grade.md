# Grade: session r2-s11 -- Sam (keyboard-only analyst), a whole first session, own file (friends.csv)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Keyboard only (`--key`, `--type`,
`--upload`); no pointer step anywhere in the session. Graded from the last screenshot (45.png),
the saved image `downloads/friends_current-view.png` (1806 x 1720), the transcript and one
scripted re-run of the session's own keys on the same build. Never from Sam's own rating
(5 of 7).

## Grade: SD (success with difficulty)

All five parts hold together at the end, none undone by a later step:

1. **Drawn.** Control+o, then friends.csv; 20 nodes, 41 edges (03.png).
2. **Ranked from Analyze, finished.** Shift+A, typed "pagerank", Enter, Enter; the outline has the
   "Influence 20" row and the drawing is colored by it (07.png).
3. **Sizes bound to the result, visibly different.** Size line "1 to 3" bound to Influence; Ava
   and Farah are clearly the largest dots (26.png, 45.png). Sam says what both channels mean:
   "bigger and darker brown means more influence", the Influence (PageRank) score. Correct.
4. **Names on every node.** Label line on the Influence row (it covers all 20 nodes), bound to
   `id`, which holds the names in this file; all 20 names drawn, "20 labels, 0 hidden to avoid
   overlap" (31.png, 32.png, 45.png). Not `ids-not-names`: the ids are the names.
5. **Image that passes the picture checklist.** `friends_current-view.png`: the same 20 nodes in
   the same arrangement as 45.png; sizes visibly different; every name drawn on screen is drawn in
   the image; the key names both channels in use ("Size: Influence" and "Color: Influence", each
   with its range).

- **Parts reached:** 5 of 5.
- **Why SD, not S:** one detour then a correction (the panel's "..." menu while looking for
  export, steps 32-36), and the size binding was learned from focus tooltips ("Add to Shape",
  "Size by attribute", steps 21 and 24). SD allows both.
- **Activation measure:** yes. Sam picked PageRank ("Start here") and ran it with no help, no
  tooltip and no detour (steps 4-7).
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## Counts

| | This session | Reference |
|---|---|---|
| Steps (real.mjs) | 44 after the start | about 18 (pointer path) |
| Key presses (excluding typed text) | about 71 | 107 on the keyboard path for Les Miserables |
| Wrong turns | 1 | -- |

Key presses by part: open 2, rank 4, sizes 24 (13 of them Tabs from the outline to "Add to
Shape"), names 7, image 34 (15 on the wrong menu, 16 walking back to the main menu and out
again, 3 for Control+e, Shift+Tab, Enter). The one wrong turn is the inspector's "..." menu
(Move up, Move down, Delete; no export). Walking backward to find a stop and then forward again
(steps 8-12) is orientation, not a wrong turn. More steps than the reference because a keyboard
user's every Tab is a step; fewer keys than the reference keyboard path.

## False "done"

None. Each "Part N DONE" claim matches the screen at that step (07.png, 26.png, 31.png, 45.png).
At step 31 the overlap note was half covered by a tooltip; the next screenshot (32.png) shows
"20 labels, 0 hidden to avoid overlap", and Sam himself noted that Chloe's name sits on Farah's
dot and that Eli and Dev overlap, so he did not leave with a wrong belief about the picture.

## Screen-reader check

Not applicable: Sam is sighted and the session was not in screen-reader mode. The re-run in
screen-reader mode (below) printed "PageRank added, running" and no "finished" announcement, as
recorded for this build.

## Problems

Severity 0-4 (Nielsen); an opinion is held one level down. Build defects were reproduced by
`rounds/round-2/repro/r2-s11/repro.sh`, which replays the session's own keys twice: with
screenshots (`run/`) and in screen-reader mode (`run-sr/`), which prints the focused element after
every step. Output in `run.log`.

| # | Sev | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | The drawing takes keyboard focus but draws no focus indicator. Shift+Tab from the Analyze button, or Tab past the left panel's resize handle, lands on the canvas and nothing on screen shows it; Sam lost his place twice and had to press on blind to find focus again (WCAG 2.4.7). | Steps 8 and 15, 08.png, 15.png. Repro: `run/08.png` and `run/12.png` show no ring while `run.log` (screen-reader pass) prints "focus: Canvas (no name)" at the same steps. The canvas also has no accessible name. |
| 2 | 2 | build-defect | In the "Size by attribute" picker, focus is in the "Find an attribute" box but the box shows only its plain grey border, unlike the Analyze filter, which shows a blue ring. Sam could not tell where focus was and pressed Enter on a guess. | Step 25, 25.png. Repro: `run/17.png` (no ring) with "focus: combobox "Find an attribute" expanded" in `run.log`. |
| 3 | 2 | behavior | Getting from the left outline to the inspector on the right takes 13 Tabs, through the eye button, the panel resize handle, the drawing and the toolbar, and down the inspector; there is no key that jumps between panels. Sam: "the expensive bit". | Steps 14-21, 14.png-21.png. Repro: the same 13 stops in `run.log`. |
| 4 | 2 | behavior | Export is not discoverable from the main screen by keyboard: no Control+e hint anywhere at rest, and the panel's "..." menu looks like the place for it. Control+e and the "Keyboard shortcuts (?)" list are printed only inside the main menu, which is 14 Shift+Tabs from the inspector. Cost about 31 key presses. | Steps 32-42, 35.png, 41.png. One participant; unconfirmed until a second. |
| 5 | 2 | accessibility | The Color and Size lines each have an extra Tab stop ("Detach Color", and the gear in the Size field) that is invisible until focused, shows a thin ring and no tooltip. Sam miscounted his Tabs twice because of it. | Steps 20, 27, 33, 20.png, 27.png, 33.png. Repro: "focus: button "Detach Color"" between "Influence, Color" and "Remove Color" in `run.log`. |
| 6 | 2 | build-defect | After sizing, names and dots collide while the label line says "20 labels, 0 hidden to avoid overlap": "Chloe" is drawn across Farah's large dot and Eli's and Dev's dots and names overlap, in the app and in the exported image. Same defect as session r2-s10, already reproduced there (`rounds/round-2/repro/r2-s10/`). | Steps 31-45, 32.png, 45.png, `downloads/friends_current-view.png`. |
| 7 | 1 | behavior | Size is not a row of its own in the Style tab; it is one item under "Shape +", found only after reading the tooltips of the other + buttons ("Add Opacity"). Second participant after r2-s10, so confirmed. | Steps 19-22, 19.png, 22.png. |
| 8 | 1 | opinion | The key shows raw scores with five decimals (0.04382 to 0.06608) and no words such as "more influential"; Sam knew "higher is more" only from the Analyze description. | 45.png, `downloads/friends_current-view.png`; end of transcript. |

What worked, for the record: the printed Control+o hint on the start page and the "Shift+A" hint
under the empty outline got Sam through two parts in six keys; the Analyze filter took focus at
once and Enter ran the only match; focus returned to a sensible control after every popup and
dialog (Analyze button, Size field, "...", main menu button); the Export dialog keeps Tab inside
and wraps to Export; focus tooltips ("Add to Shape", "Size by attribute", "Add label line",
"Undo Ctrl+Z", "Rename F2") told him what Enter would do. No step needed a pointer.
