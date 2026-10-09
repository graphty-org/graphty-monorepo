# Grade: session r2-s10 -- Jordan (marketing network analyst), a whole first session, own file (friends.csv)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (17.png),
the saved image `downloads/friends_current-view.png` (1806 x 1720), the transcript and one
scripted re-run of the session's own path on the same build. Never from Jordan's own rating
(6 of 7).

## Grade: SD (success with difficulty)

All five parts hold together at the end, none undone by a later step:

1. **Drawn.** friends.csv opened through "Open project or file..."; 20 nodes, 41 edges (03.png).
2. **Ranked from Analyze, finished.** PageRank ("Start here") run with defaults; the outline has
   the "Influence 20" row and the drawing is colored by it (06.png).
3. **Sizes bound to the result, visibly different.** Size line "1 to 3" bound to Influence; Ava
   and Farah are clearly the largest dots (12.png, 17.png). Jordan says what both channels mean:
   "bigger and darker brown = more influence", the Influence (PageRank) score. Correct.
4. **Names on every node.** Label line on the Influence row (it covers all 20 nodes), bound to
   `id`, which holds the names in this file; all 20 names drawn, "20 labels, 0 hidden to avoid
   overlap" (14.png, 17.png). Not `ids-not-names`: the ids are the names (Ava, Ben, ...).
5. **Image that passes the picture checklist.** `friends_current-view.png`: same 20 nodes in the
   same arrangement as 17.png; sizes visibly different; every name drawn on screen is drawn in the
   image; the key names both channels in use ("Size: Influence", "Color: Influence", each with its
   range).

- **Parts reached:** 5 of 5.
- **Why SD, not S:** step 10 needed a tooltip (hover on the unlabeled chain-link icon) to learn
  that it binds Size to an attribute, and steps 7-8 were a guess that Size lives under "Shape"
  after scanning the list twice. SD allows a tooltip; S does not.
- **Activation measure:** yes. Jordan picked a ranking measure (PageRank) and ran it with no help,
  no tooltip and no detour (steps 4-6).
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no (the "Export" click matched two controls and took the
  button, which is what a person would press).

## Counts

|                  | This session       | Reference |
| ---------------- | ------------------ | --------- |
| Steps (real.mjs) | 16 after the start | about 18  |
| Wrong turns      | 0                  | --        |

No wrong turns. The hover at step 10 was a check before clicking, not a wrong turn; the Main menu
route to Export (steps 15-16) is a valid route to the same dialog as Control+e.

## False "done"

None. Each "Part N DONE" claim matches the screen at that step. "Everyone's name is on" (step 14)
is true: 20 of 20 names are drawn and Jordan noted himself that "Chloe" sits on Farah's dot.
"A PNG with its key" (step 17) is true of the saved file.

## Screen-reader check

Not run: this session was pointer only, not in screen-reader mode.

## Problems

Severity 0-4 (Nielsen); an opinion is held one level down. The build defect was reproduced by
`rounds/round-2/repro/r2-s10/repro.sh` (the session's own clicks), output in `run/` and
`run.log`; `run/07.png` shows the same layout, the same collisions and the same count as 17.png.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                             | Evidence                                                                                                                          |
| --- | --- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2   | build-defect | After sizing, names and dots collide while the label line says "20 labels, 0 hidden to avoid overlap": "Chloe" is drawn across Farah's large dot, Chloe's own dot sits inside Farah's, Eli's and Dev's dots and names overlap, and edges cross "Sana", "Theo", "Ben" and "Kofi". The overlap count covers name-on-name only, so the reader is told nothing is hidden while two names cannot be read; the same collisions are in the exported image. | Steps 12-17, 14.png, 17.png, `downloads/friends_current-view.png`. Repro: `run/07.png`, `run/downloads/friends_current-view.png`. |
| 2   | 2   | behavior     | Size is not a row of its own in the Style tab; it is one item under "Shape", reached only by the + beside Shape. Jordan scanned the list twice for the word "size" before guessing.                                                                                                                                                                                                                                                                 | Steps 7-8, 07.png, 08.png. One participant; unconfirmed until a second.                                                           |
| 3   | 2   | behavior     | A new Size line starts as a plain number box ("1"); binding it to a value is only a small unlabeled chain-link icon, learned from its tooltip. Jordan: "a first-timer could easily type a number there and make everyone the same size".                                                                                                                                                                                                            | Steps 9-10, 09.png, 10.png.                                                                                                       |
| 4   | 1   | opinion      | The key shows raw scores (0.04382 to 0.06608), which mean nothing to a reader of a report; "low to high" or ranks would read better. The narrow range also makes the colors barely differ except the top four.                                                                                                                                                                                                                                      | Steps 6, 17, 06.png, `downloads/friends_current-view.png`.                                                                        |
| 5   | 1   | opinion      | The run is named "Influence" everywhere, key included; a reader asking "influence how?" cannot tell from the picture that it is PageRank.                                                                                                                                                                                                                                                                                                           | Step 6, 06.png; end of transcript.                                                                                                |
| 6   | 1   | opinion      | The size key is a grey wedge with no dots, so it is not obvious at a glance that it stands for dot size.                                                                                                                                                                                                                                                                                                                                            | Step 17, `downloads/friends_current-view.png`.                                                                                    |
| 7   | 0   | behavior     | The label attribute is called "id", not "name"; Jordan guessed right because the sheet held only names. Correct for this file, so no harm here.                                                                                                                                                                                                                                                                                                     | Steps 13-14, 13.png.                                                                                                              |

What worked, for the record: the file drew at once with correct counts; the empty outline's hint
pointed at Analyze; "Start here" on PageRank and the one-line descriptions made the ranking pick
quick; the attribute picker explained why `id` cannot size ("Holds groups, not amounts"); the
export preview showed the key before saving, and the key is in the saved image.
