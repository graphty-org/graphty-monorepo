# Grade: session r1-s16b -- Sam (keyboard only), names on every dot (College football)

- **Grade:** F (failure). Failure code `never-found`: Sam never reached Everything's Style tab or
  the "Add label line" control.
- **Incomplete session -- re-run recommended.** The session was ended by the run after step 13,
  not by Sam. The transcript says so: the start waited about 25 minutes for a browser slot and
  the session was cut short. Sam had not given up and was still working toward the left list. The
  F stands because the last screenshot shows no names, but it says little about whether a
  keyboard-only user can finish T10 on this build. This session needs a full re-run before it
  counts toward bar 7 (Sam S or SD on T10).
- **Build-decided:** no. The two focus defects below cost Sam steps and his place on the page,
  but neither one blocked the path. The run ended the session first.
- **False "done":** no. Sam said "No. ... I never got the team names on the dots", which matches
  13.png.
- **Steps:** 13 tool steps, about 25 key presses. The success path is 4 steps (56 keys on
  College football). Sam reached step 1 of it (open the sample) at step 8, after 16 key presses.
- **Wrong turns:** 3.
  1. Steps 4-7: three Tabs into the sample list showed no focus. Sam undid them with three
     Shift+Tabs.
  2. Step 12: the Style tab of the whole graph has no labels setting. Sam abandoned it.
  3. Step 13: four Shift+Tabs toward the left list ended on a stop with no visible focus. Sam
     abandoned it, and the session ended there.
- **Ease (from the transcript):** Sam answered 5 on a scale the transcript wrote as "1 = easy,
  7 = very hard". That is the reverse of the Single Ease Question, so it is 3 of 7 on the
  standard scale. Future transcripts should ask the question with 7 = very easy.
- **Usage card:** skipped by opening a sample. The card went away unanswered and usage data stays
  off. No detour. Sam stated no belief about what is sent.
- **Silent commits:** none. Sam made no commit that should change the drawing.
- **Counts against the drawing:** no disagreement. The Values tab (10.png) shows 115 nodes, 613
  edges and 1 component, which match the sample.
- **Tool prints:** the session's `session.log` is empty, so no `ambiguous`, script error or
  failed request was recorded.

## Why F

The last screenshot (13.png) shows College football drawn with no names on any dot, the
Graph's Style tab open (Background, Method, Seed), Everything not selected, and no label line.
None of the success definition holds: there is no label line bound to `label`, no names on the
canvas and no hidden-for-overlap count. Sam's own account agrees.

## Problems

| # | Problem | Severity | Kind | Evidence |
|---|---------|----------|------|----------|
| 1 | The sample entries on the start page take keyboard focus but show no focus indicator. After "New from data..." (Tab 4, ring visible), Tabs 5, 6 and 7 land on Les Miserables, Zachary's karate club and College football with nothing visible. A keyboard user has to count presses to open a sample, and can easily open the wrong one. This fails WCAG 2.4.7 and bar 8's focus-visible check. | 3 | build-defect | Session steps 3-7: 03.png has a ring, while 04.png, 05.png and 06.png are byte-identical to 01.png (no focus). Reproduced by `rounds/round-1/repro/r1-s16b/run.sh`, part A: its 03.png, 04.png and 05.png are byte-identical to its 01.png (md5 db53b85c...), on every run (twice). |
| 2 | On the graph screen, one Tab stop shows no focus indicator. It is the stop just before the bottom toolbar, reached by Shift+Tab from the toolbar's Legend button, and is most likely the drawing itself. Going backward from the right panel toward the Selection / Everything list, focus disappears there. Sam lost his place at that point and never reached Everything. | 3 | build-defect | Session step 13, 13.png (no ring anywhere; Style tab no longer outlined). Reproduced by `repro/r1-s16b/run.sh`, part B: Shift+Tab from the Style tab goes to 08.png, then the "From College football" link (09.png), then the toolbar's Legend button (10.png, tooltip "Legend L"), then 11.png with no ring anywhere. |
| 3 | The Style tab that opens for the whole graph holds only Background, Method and Seed, and nothing says that labels and node styling live under Everything. The first place a newcomer looks for "names on the dots" is a dead end. This was also seen in r1-s10b (Elena), so it is confirmed. | 2 | behavior | Step 12, 12.png: "Graph-wide style is background and layout only ... I probably need 'Everything' in the left list first." |
| 4 | After the sample opens, the Tab order goes to the bottom toolbar and then the right panel. The left list (Selection, Everything), which is the row that holds the names setting, is reached only by going backward, past the invisible stop in problem 2. For a keyboard user the success path's second step is the hardest one to reach. | 2 | behavior | Steps 9-13, 09.png to 13.png. |
| 5 | The bottom toolbar is a single Tab stop with arrow keys inside (the standard toolbar pattern), and nothing on screen says so. Sam worked it out but called it unannounced. | 1 | opinion | Step 10, 10.png: "The toolbar is one tab stop; the other buttons must be on arrow keys. Fine, but nothing told me so." |

## Repro

`rounds/round-1/repro/r1-s16b/run.sh` drives the build under study (commit 452285142, graphty@0.8.53)
by key presses only and writes its PNGs and `session.log` beside itself. Part A is steps 02-05,
and part B is steps 06-11. Part A gave byte-identical results on two runs. Part B's end state
(11.png) matches the session's 13.png.
