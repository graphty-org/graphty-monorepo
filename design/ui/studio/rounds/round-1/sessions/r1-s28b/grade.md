# Grade: session r1-s28b -- Dev, Florentine families (bigger dots for the families the network depends on)

**Grade: SD** (success with difficulty). No failure codes.

The task succeeds when a ranking has been run, the dot sizes are bound to its result (a Size line
bound to the result, dots that visibly differ, the legend showing size), and the participant says
from the screen what a bigger dot means and what the colors stand for.

Dev ran Betweenness, which the app lists under "Rank nodes and edges" and names "Bridges" on
screen. Betweenness is the textbook measure for "which families the network depends on", so it is
a correct choice of ranking, not a substitute. The last screenshot (`15.png`) shows the Bridges
row selected, its Style tab with "Color: Bridges" and "Size: 1 to 3", dots of clearly different
sizes (one large dark dot in the middle, three medium ones, the rest small), and a legend reading
"Size: Bridges 0 to 47.5" and "Color: Bridges 0 to 47.5". Dev's closing account names both: sizes
and colors both stand for Bridges, how often a family sits on the shortest chain of marriages
between two others, so bigger and darker means more of the network runs through it. Every name
and number Dev gave was on screen first: Medici 47.5, Guadagni, Albizzi and Salviati are in the
Top 10 at `07.png`, and the 0 to 47.5 range is in the legend.

It is SD rather than S because Dev needed a tooltip to find the binding control (step 12), and
took two detours before it (below).

No files were downloaded, and none were expected. The usage card was declined ("No thanks").

## Measures

- **Steps:** 15 `real.mjs` steps (`01.png` to `15.png`); the success path is about 9. Step 15
  (a hover after the sizes were bound) is outside the path.
- **Wrong turns: 2.**
    1. Clicked Style with the whole graph selected, looking for size; that tab has background and
       layout only (`06.png`). Corrected by selecting the Bridges row (`07.png`).
    2. Opened the Size line's dropdown ("Open list"), which opened empty (`11.png`). Recovered by
       hovering the unlabeled chain icon to read its tooltip, "Size by attribute" (`12.png`).
- **Hesitations:** choosing Betweenness over PageRank, which carries a "Start here" tag
  (`03.png`); not sure at first that "Bridges" was the Betweenness result (`05.png`).
- **False "done":** none. "Did I finish? Yes" is true: the sizes are bound and the legend shows
  it (`15.png`). "Medici is by far the biggest dot" follows from Medici's 47.5 topping the Top 10
  (`07.png`) and the biggest dot being the highest value.
- **Silent commits:** none. The run recolored the dots and added a legend (`04.png` to `05.png`);
  the size binding resized the dots and added "Size: Bridges" to the legend (`13.png` to
  `14.png`).
- **Counts that disagree with the drawing:** none on the success path. The left list says
  "Bridges 15" while only 14 dots are visible, because the legend covers one (problem 3); the count
  is right, the drawing hides a dot.
- **Ease (from the transcript):** 3 on a scale where 7 is hardest, about 5 on the Single Ease
  Question (7 = easiest).
- **Tool note (not voided):** at step 15 the tool printed `node "Medici"` for the hovered dot,
  which a person would not see (the app shows no name). Dev's answer did not rely on it: Dev said
  the name came from the Top 10 list, which was on screen at `07.png`.
- **Build-decided:** no. The empty dropdown cost one wrong turn but did not decide the grade.

## Problems

| #   | Severity | Kind         | Problem                                                                                                                                                                                                                                                         | Evidence                                           |
| --- | -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | 3        | build-defect | Adding Size gives a plain number box "1" whose dropdown ("Open list") opens empty. The control that binds size to a result is an unlabeled chain-link icon beside it, found only by hovering for its tooltip. A first-time user reads the empty list as broken. | `10.png`, `11.png`, `12.png`; repro `10.png`       |
| 2   | 2        | behavior     | Style with the whole graph selected offers no node size; size lives only on a row's Style tab, and nothing points there.                                                                                                                                        | `06.png`, then `07.png`, `08.png`                  |
| 3   | 2        | build-defect | After the run, the legend box in the top-left corner covers a node: 15 dots before (`02.png`), 14 visible after.                                                                                                                                                | `05.png`, `15.png`; repro `05.png`, `12.png`       |
| 4   | 2        | wording      | The method picked is "Betweenness", but its result is called "Bridges" everywhere afterwards (left list, legend, inspector) with nothing tying the two names together.                                                                                          | `03.png`, `05.png`, `07.png`                       |
| 5   | 2        | behavior     | Hovering a dot shows no name and no labels are drawn, so the figure alone cannot say which dot is Medici. Also seen in session r1-s17b (Les Miserables), so confirmed across two participants.                                                                  | `15.png`; repro `13.png` (tooltip: null on Medici) |
| 6   | 1        | opinion      | PageRank carries a "Start here" tag in the ranking list, which made Dev doubt the right choice (Betweenness) for a "depends on" question.                                                                                                                       | `03.png`                                           |
| 7   | 1        | wording      | The bound size reads "1 to 3" with no unit or meaning; Dev could not tell what 1 and 3 measure.                                                                                                                                                                 | `14.png`, `15.png`                                 |

## Scripted repro

`rounds/round-1/repro/r1-s28b/run.sh` (log and PNGs beside it), run on build
`452285142099 graphty@0.8.53` (commit 4522851420998602a015e60ae2cbf339049a2c97). It opens
Florentine families, then:

- **A.** Analyze > Betweenness > Run. `05.png` shows the "Color: Bridges" legend over the dot that
  `02.png` shows at the top left (problem 3).
- **B.** Bridges row > Style > Add to Shape > Size > "Open list". `10.png` shows the empty
  dropdown under the "1" box (problem 1).
- **C.** Escape > "Size by attribute" > Bridges binds the sizes (`12.png`, "1 to 3", legend
  "Size: Bridges"); hovering the biggest dot prints `tooltip: null` (`13.png`, problem 5).

Each matched the participant's screenshots.
