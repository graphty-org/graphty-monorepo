# Grade: session r1-s06b -- Grace, a whole first session on her own file (friends.csv)

**Grade: SD** (success with difficulty). All five parts of the task were reached and stayed in
place to the end. It is SD rather than S because Grace needed a tooltip ("Size by attribute") to
find how to size the dots by a value.

**Transcript is incomplete.** `transcript.md` stops at the heading "Step 11". Screenshots 12 to 18
and the download show what happened after that point, but none of Grace's words from those steps
were saved, including her closing statement. The session is graded from the screen and the
download. Her explanation of what the sizes and colors mean is taken from what she said earlier
(see part 3 below).

## The five parts (5 of 5 reached)

1. **friends.csv drawn.** `03.png`: Overview reads 20 nodes and 41 edges, which matches the
   reference values. Opened with "Open project or file...".
2. **A ranking run finished.** `06.png`: PageRank (shown on screen as "Influence") colored all 20
   nodes, with a key reading 0.04382 to 0.06608, the same as the reference range. `07.png`: the
   Top 10 starts Farah 0.06608, Ava 0.06423, Hana 0.05883, which matches the reference values.
3. **Sizes bound to the result and visibly different.** `13.png`: there is a "Size" line on the
   Influence row, and the key reads "Size: Influence". Ava, Farah, Hana and Ivan are clearly
   larger than the rest. What the sizes mean: at step 10 Grace said she wanted "bigger for more
   influence". What the colors mean: at step 5 she read the key as "Color: Influence" and said
   "Darker means more". Both are correct readings. Her final restatement is missing because the
   transcript was cut off.
4. **Names drawn.** `15.png`: a label line bound to `id` on the Influence row, which covers all 20
   nodes, reads "20 labels, 0 hidden to avoid overlap". This matches the reference statement.
   Real names are shown, not internal ids.
5. **Image downloaded and passes the picture checklist.** `downloads/friends_current-view.png`
   shows the same nodes in the same arrangement as `18.png`. The sizes are visibly different, all
   20 names are drawn, and the key names both channels in use ("Size: Influence" and "Color:
   Influence"). `18.png` also shows the toast "Exported friends_current-view.png".

## Measures

- **Steps:** 17 `real.mjs` steps (`02.png` to `18.png`, one hover included). The success path is
  about 18 steps, so the ratio is about 0.9x.
- **Wrong turns:** 0. Hovering the link icon at step 10 was a check, not a step off the path.
- **False "done":** none. Grace said "Part one: done" at `03.png` (the counts on screen matched)
  and "Part two: done -- Farah" at `07.png` (Farah is the top value). Both claims are true. No
  claims were recorded after step 11.
- **Activation:** yes. Grace picked a ranking measure and ran it with no help, no tooltip and no
  detour. She followed the "Start here" tag on PageRank (`04.png` to `06.png`).
- **Usage card:** declined with "No thanks" and no detour. She held no wrong belief about what is
  sent: she relied on "Files are read on this computer and never uploaded".
- **Build-decided:** no. **Void:** no. `real.mjs` did nothing a person could not do. The cut-off
  transcript is a failure of the session-running harness, not a tool fault under the criteria.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | Adding "Size" creates a fixed size ("1") rather than a size by value. Sizing by a value sits behind an unlabeled link icon whose purpose shows only on hover ("Size by attribute"). This was the main snag of the session. | step 9 `10.png`, step 10 `11.png` |
| 2 | 2 | wording | Once bound, the Size line reads "1 to 3" and does not name the value it uses, while the Color line beside it says "Influence". The panel does not say what the sizes stand for; only the key on the canvas does. | `13.png`, `18.png` |
| 3 | 2 | behavior | No "Size" line is visible on the Style tab. Grace had to guess that size lives under "+" next to Shape. | step 7 `08.png`, step 8 `09.png` |
| 4 | 1 | behavior | Labels collide with the drawing while the panel says "0 hidden to avoid overlap". Chloe's name is half covered by her own ball and by Farah's, and Dev and Eli overlap. All names can still be read or guessed, so the count is not wrong, but the drawing is less legible than the sentence suggests. | `15.png`, `18.png`, the download |
| 5 | 1 | wording | The run is chosen as "PageRank" and then shown as "Influence". Grace briefly wondered whether they were the same thing. | step 5 `06.png` |
| 6 | 1 | opinion | The method list uses algorithm names (Betweenness, Eigenvector, Katz, HITS). Grace would have liked a plain heading such as "Who is most connected". | step 3 `04.png` |
| 7 | 1 | opinion | The key shows raw decimals (0.04382 to 0.06608), which "mean nothing" to her and which she would not put on a slide. | step 5 `06.png` |
| 8 | 0 | opinion | The file was read as directed, so arrows are drawn on what Grace thinks of as two-way ties. | step 2 `03.png` |

No build defect was found, so there is no repro directory for this session.
