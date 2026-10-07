# Grade: session r1-s07b -- Ruth, a whole first session on her own file (friends.csv)

**Grade: SD** (success with difficulty). All five parts of the task were reached and stayed in
place to the end. It is SD rather than S because Ruth needed a tooltip ("Size by attribute", step
10) to find how to size the dots by a value.

## The five parts (5 of 5 reached)

1. **friends.csv drawn.** `02.png`: 20 nodes, 41 edges, directed, 1 component, which matches the
   file. Opened with "Open project or file...".
2. **A ranking run finished.** `05.png`: PageRank (shown on screen as "Influence") colored all 20
   nodes, with a key reading 0.04382 to 0.06608, the reference range. `06.png`: the Top 10 starts
   Farah 0.06608, then Ava, Hana, matching the reference values.
3. **Sizes bound to the result and visibly different.** `12.png`: a Size line reading "1 to 3" on
   the Influence row, and the key reads "Size: Influence" above "Color: Influence". Ava and Farah
   are clearly larger than the rest. Ruth's reading: "Bigger and darker both mean more influence",
   and in her summary, "Influence, which the program worked out with the method it called
   PageRank". Both channels are named correctly.
4. **Names drawn.** `14.png`: a label line bound to `id` on the Influence row, which covers all 20
   nodes, reads "20 labels, 0 hidden to avoid overlap", the reference statement. Real names are
   shown, not internal ids.
5. **Image downloaded and passes the picture checklist.** `downloads/friends_current-view.png`
   (1806 x 1720) shows the same nodes in the same arrangement as `17.png`; sizes are visibly
   different; all 20 names drawn on screen are drawn in the image; the key names both channels in
   use ("Size: Influence", "Color: Influence"). `17.png` shows the toast "Exported
   friends_current-view.png".

## Measures

- **Steps:** 16 `real.mjs` steps (`02.png` to `17.png`, one hover included) against a success
  path of about 18.
- **Wrong turns:** 0. The hover at step 10 was a check, not a step off the path.
- **False "done":** none. Each "done" claim (part one at `02.png`, part two at `05.png`, part
  three at `12.png`, part four at `14.png`, the image at `17.png`) matches the screen. Ruth noticed
  the label collisions herself, so "everyone's named" left her with no wrong belief.
- **Activation:** yes. She picked PageRank by its "Start here" badge and ran it with no tooltip
  and no detour (`03.png` to `05.png`).
- **Usage card:** declined with "No thanks", no detour.
- **Build-decided:** no. **Void:** no. `real.mjs` did nothing a person could not do.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | Adding "Size" creates a fixed size ("1") that changes nothing on the drawing. Sizing by a value sits behind an unlabeled chain-link icon whose purpose shows only on hover ("Size by attribute"). Also seen in r1-s06b. | step 9 `09.png`, step 10 (hover), step 11 `11.png` |
| 2 | 2 | behavior | No Size line on the Style tab; Ruth had to guess it lives under the "+" beside Shape. Also seen in r1-s06b. | step 7 `07.png`, step 8 `08.png` |
| 3 | 1 | behavior | Labels collide while the panel says "0 hidden to avoid overlap": Chloe's name sits over Farah's ball, and Eli and Dev crowd each other, on screen and in the exported image. All names remain readable, so the count is not wrong. Also seen in r1-s06b. | `14.png`, `17.png`, the download |
| 4 | 1 | wording | Once bound, the Size line reads "1 to 3" and does not name the value it uses, while the Color line beside it says "Influence"; only the key on the canvas says what the sizes stand for. | `12.png`, `17.png` |
| 5 | 1 | wording | The run is chosen as "PageRank" and then shown everywhere as "Influence"; Ruth assumed they were the same but would have to explain it to her editor. | step 5 `05.png` |
| 6 | 1 | wording | The label picker offers "id", not "name"; it worked only because this file's ids are names. | step 13 `13.png` |
| 7 | 1 | opinion | The method list is algorithm jargon (Betweenness, Eigenvector, Katz, HITS); only the "Start here" badge told her which to pick. | step 3 `03.png` |
| 8 | 0 | opinion | The key and Top 10 show raw decimals (0.04382 to 0.06608) and nothing says what one unit means; she could not explain them to an editor. "Damping factor" on the run form also meant nothing to her. | `04.png`, `05.png`, `06.png` |

No build defect was found, so there is no repro directory for this session.
