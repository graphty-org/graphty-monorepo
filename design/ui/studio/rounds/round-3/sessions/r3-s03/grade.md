# Grade: session r3-s03 -- Dev, T15 A (a whole first session on Les Miserables)

Build b7590f8de (graphty 0.8.53), viewport 1440 x 900, sighted mouse participant.

## Result

- **Grade: S** (success). All five parts reached in one sitting, none undone later.
- **Parts reached:** 5 of 5.
- **Steps:** 15 real.mjs actions (14 step commands; step 2 held two clicks) against the round 3
  success path of 15 commands on A with "Show all labels". Ratio 1.0.
- **Wrong turns:** 0.
- **False "done":** none. Every "part done" claim matches the screenshot taken at that step.
- **Ease (from the transcript):** 6 of 7.
- **Failure codes:** none.
- **Build-decided:** no. **Void:** no.

## The five parts, checked on screen

1. **Sample drawn.** 02.png: Les Miserables, Nodes 77, Edges 254.
2. **A ranking run finished.** The participant chose Betweenness, not PageRank (the "Start here"
   tag), from the "Rank nodes and edges" list. 05.png: the outline row "Betweenness 77" and the
   key "Color: Betweenness, 0 to 1624". Betweenness is a ranking measure, so it meets "a ranking
   run from Analyze"; the meaning check below is graded against the run actually made.
3. **Sizes bound to that result, visibly different.** 09.png: a "Size 1 to 3" line on the
   Betweenness row's Style tab, the key reads "Size: Betweenness 0 to 1624", and the dots differ
   visibly (Valjean largest, Myriel next). Meaning stated: bigger and darker dots mean higher
   betweenness, both channels stand for betweenness -- correct, and read from the key on screen
   (09.png) before it was said.
4. **Names drawn.** 11.png: a label line "Above, name" on the Betweenness row, which covers every
   node (77); names drawn. "Show all labels" was used (12.png: "77 labels", box ticked).
5. **Image downloaded, picture checklist passed.** `downloads/les-miserables_current-view.png`
   (1806 x 1720):
   - same nodes and arrangement as 15.png: yes;
   - sizes visibly different: yes;
   - names drawn on screen drawn in the image: yes, every name (Show all labels on), though
     several overlap in the dense middle (see problems);
   - key names every channel in use: "Size: Betweenness" and "Color: Betweenness", both 0 to 1624.

## Other measures

- **Usage card:** declined ("No thanks" at step 2), no detour, no stated belief about what is sent.
- **Activation (picked and ran a ranking measure with no help, no tooltip, no detour):** yes. A
  one-second hesitation over PageRank's "Start here" tag, no detour.
- **Pause over the run's name:** none; the run was Betweenness, named the same in the list, row
  and key.
- **Silent commits:** none. Run (04 to 05), size binding (08 to 09), label attribute (10 to 11)
  and Show all labels (11 to 12) each changed the canvas or the key.
- **Counts that disagree with the drawing:** none seen.
- **Tool prints:** step 15, `ambiguous: "Export" matches 2 controls (button "Export", dialog
  "Export ...")`; the button was taken, which is what the participant meant. Not a wrong turn and
  not a tool fault.

## Problems

| # | Sev | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 2 | behavior | "Size" is reachable only through "+" beside Shape; there is no Size row until one is added. The participant found it by guessing size belongs to shape and called it the one real hesitation. | Step 6-7, 06.png, 07.png |
| 2 | 2 | behavior | After the run, the automatic color ramp makes nearly every dot the same orange; only Valjean reads as dark. The participant could not tell who mattered until sizes were added. | Step 5, 05.png |
| 3 | 2 | behavior | With every name shown, labels are tiny and pile up in the middle; Valjean's name, the most important character, collides with a neighbor's label at the top of his dot and is unreadable on screen and in the exported picture. Labels in the 2x export are also soft, as if drawn below the export's resolution. | Steps 12 and 15, 12.png, 15.png, the downloaded PNG around (940, 780) |
| 4 | 2 | behavior | The on-screen key box sits over the top-left of the drawing and hides part of it (Blacheville's name is half under it). | Step 11, 11.png |
| 5 | 1 | opinion | The key repeats itself: size and color both say Betweenness, and the color was applied without being asked for. | Step 9, 09.png |
| 6 | 1 | opinion | PageRank's "Start here" tag made the participant second-guess the measure their course uses (Betweenness). | Step 3, 03.png |
| 7 | 1 | wording | The Export dialog does not say the key is included; the participant inferred it from the small preview. | Step 14, 14.png |
| 8 | 1 | wording | "Size 1 to 3" gives no unit or meaning; the participant left it alone not knowing what 1 and 3 are. | Step 9, 09.png |

No build defect in the criteria's sense (a crash, a control that does nothing, a wrong count, a
step that cannot be done by keyboard) was met, so no scripted repro was written for this session.
Every problem above rests on this one participant and is confirmed only if a second session shows
it.
