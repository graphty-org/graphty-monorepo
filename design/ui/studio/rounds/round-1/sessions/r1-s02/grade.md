# Grade: session r1-s02 -- Tom, a whole first session on Les Miserables

**Grade: SD** (success with difficulty). All five parts of the task were reached in one sitting
and none was undone by a later step. It is SD rather than S because the size step took two dead
ends (a Style tab with nothing about dots, then the Size field's empty "Open list" dropdown) before
Tom found the unlabeled chain-link icon by elimination. He said that two dead ends is normally
where he stops.

The session ran on build `9d6598eea3e9 graphty@0.8.53`; it is graded against what that build
showed.

## The five parts (5 of 5 reached)

1. **Les Miserables drawn.** `02.png`: Nodes 77, Edges 254, the reference counts. Opened from
   Samples on the start screen.
2. **A ranking run finished.** `05.png`: PageRank (shown as "Influence") colored all 77 nodes, key
   0.003299 to 0.07543, the reference range. `07.png`: the Top 10 starts Valjean 0.07543, Myriel,
   Gavroche, matching the reference top three.
3. **Sizes bound to the result and visibly different.** `13.png` and `18.png`: a Size line
   ("1 to 3") on the Influence row, "Size: Influence" in the key; Valjean and Myriel are clearly
   the largest dots. Meaning, at the end: "Both mean the same thing: Influence. Bigger and darker
   means that character matters more." Correct. He could not say what the numbers measure and was
   unsure that "Influence" is the PageRank he ran; neither makes the meaning wrong.
4. **Names drawn.** `15.png` and `18.png`: a label line bound to `name` on the Influence row, which
   covers all 77 nodes, with "77 labels, 6 hidden to avoid overlap" -- the reference statement for
   a sized Les Miserables. Real names are drawn, not ids.
5. **Image downloaded and passes the picture checklist.**
   `downloads/les-miserables_current-view.png` (1806 x 1720) shows the same nodes in the same
   arrangement as `18.png`; sizes are visibly different; the names drawn on screen are drawn in the
   image (small and soft, Valjean's on top of his own dot, but present); the key names both
   channels in use ("Size: Influence" and "Color: Influence", each 0.003299 to 0.07543). `18.png`
   shows the toast "Exported les-miserables_current-view.png".

## Measures

- **Steps:** 17 `real.mjs` steps after the start (`02.png` to `18.png`). The success path is about
  18, so about 0.9x.
- **Wrong turns:** 2. The Style tab before selecting the Influence row (`06.png`, abandoned), and
  the Size field's "Open list" arrow (`11.png`, an empty dropdown, abandoned with Escape). Both
  recovered; the session counts toward recovery.
- **False "done":** none. Each "done" he stated matches the screen at that step: drawing and counts
  (`02.png`), run finished (`05.png`, `07.png`), sizes (`13.png`), names (`15.png`; he said "more
  or less" and noted they were hard to read, and did not claim every name), and the picture with
  its key (download present, passes the checklist). He did not read the "6 hidden" line, but made
  no claim that it contradicts. truth_on_screen: not applicable.
- **Activation:** yes. He opened Analyze, picked PageRank from the "Start here" tag and ran it with
  no help, no tooltip and no detour (`03.png` to `05.png`). The hesitation before finding Analyze
  was not a step off the path.
- **Usage card:** declined with "No thanks" at step 2, no detour, no stated belief about what is
  sent.
- **Ease:** Tom rated difficulty 4 on a scale where 7 is very hard; on the Single Ease Question
  scale (7 = very easy) that is 4.
- **Build-decided:** no. The empty dropdown cost a wrong turn and pushed him to his stopping point,
  but he recovered. **Void:** no.

## Problems

| # | Severity | Kind | Problem | Evidence |
|---|---|---|---|---|
| 1 | 3 | build-defect | The Size field's "Open list" arrow opens a thin, empty dropdown with no choices. It looks like the place to pick Influence and leads nowhere; Tom read it as broken and was one step from quitting. Already reproduced as a scripted path on this build. | step 11 `11.png`; repro `rounds/round-1/repro/r1-s27b/` |
| 2 | 3 | behavior | Sizing by a value is behind an unlabeled chain-link icon. Tom clicked it only "because it was the last thing left"; a chain link does not mean "follow the numbers" to him. This is what made the session SD. | steps 12-13 `12.png`, `13.png` |
| 3 | 2 | behavior | No "Size" line on the Style tab; size is reached through "+" beside Shape. He had to guess the section. | step 8 `08.png`, step 9 `09.png` |
| 4 | 2 | behavior | The Style tab, opened before a result row is selected, shows only canvas background, layout Method and Seed, with nothing about dots. He had to work out that the Influence row must be selected first. | step 6 `06.png` |
| 5 | 2 | behavior | Labels are tiny on screen and soft in the 2x export; Valjean's name, the picture's main point, sits on his own dark dot and can hardly be read. Tom could not point to "the big one" on a printout. | `15.png`, `18.png`, the download (around Valjean) |
| 6 | 1 | wording | The run is picked as "PageRank" and everything after names it "Influence"; he was left assuming they are the same. | step 5 `05.png` |
| 7 | 1 | opinion | The key gives raw decimals (0.003299 to 0.07543) with no words for what Influence means. | `05.png`, the download |
| 8 | 1 | opinion | Before sizing, the Influence colors look almost the same orange apart from two or three dark dots, so color alone told him little. | step 5 `05.png` |
| 9 | 1 | behavior | Nothing on screen says "important" or "matter"; the hint at the bottom left ("Analyze (Shift+A) to add results here") is small grey text he skipped. He found Analyze by guessing at the flask icon. | step 3 `03.png` |

Problem 1 repeats the build defect graded in r1-s27b and r1-s28b; problem 5 repeats the label
legibility finding from r1-s03b; problems 2 and 3 repeat r1-s03b's sizing findings.
