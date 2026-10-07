# Round 3 scores: the tier 1 study on the real graphty app

Scored against `criteria.md` from the graders' `grade.md` files in `sessions/` and their scripted
reproductions in `repro/`. Ease is each participant's own rating as asked (1 = very difficult,
7 = very easy), read from the transcript; it never decided a grade. Every row is in
`tmp/researcher/r3-score.py`, which prints the numbers below. Steps against the success path use
the answer key's path lengths (T15 18, T10 5, T9 8, T7 7, T8 9, T12 6, T14 6, T13 9, T11 4, T6 3,
T5 2, T3 3, T2 1).

All participants are simulated: one model playing composite personas. A failure is strong evidence;
a pass is weak until real people confirm it. Screen-reader speech (what a real screen reader
announces, in what order, how verbosely) is not tested by this study; the screen-reader persona is
graded from the focused element, live-region text and `--read` output the tool prints.

**All 56 planned sessions ran and are graded.** Every one ran on build stamp `b7590f8de22b
graphty@0.8.53` with no uncommitted changes (`session.json`), and every `session.log` is empty (no
script errors, no failed requests). 54 are tier 1 tasks; 2 are the first look (T16), measured, not
graded.

- **Void: 2, not re-run.** r3-s10 (whole first session, own file): booked as the keyboard-only
  persona, but every step was a pointer click and the participant described was a different
  person; the session measures nothing for the keyboard bar and is left out of every rate below
  (its grade, S, is shown where "as graded" numbers are given). r3-s55 (first look): the tool
  resolved an ambiguous name to the wrong control at step 6; its records are reported with that
  caveat. One more tool fault changed no outcome and did not void its session (r3-s49: a click on
  Export saved nothing; the same click saved the file in the scripted re-run).
- **Build-decided: 1**, the screen-reader persona's whole first session (r3-s01).

## Bars (all must hold in one round)

| # | Bar | Target | Round 3 (valid sessions / without build-decided) | Status |
|---|---|---|---|---|
| 1 | Each task's success rate; each dataset half >= 75% | per task below | 52 of 53 / 52 of 52 (as graded, with the void: 53 of 54) | **Holds.** Every task meets its bar, every half its floor |
| 2 | First-time personas' sessions | >= 80% | 35 of 35 (100%); others 17 of 18 (94%) | **Holds** |
| 3 | Confirmed severity-4 problems open | 0 | 1: in the default 3D view, perspective draws a lower-ranked dot larger than a higher-ranked one once size is bound to a result, on screen and in the exported picture. On the running club, Ava (PageRank 0.06423, second) is drawn larger than Farah (0.06608, first); r3-s08 reported Ava as the person who matters most, not knowing it was wrong. The drawing is identical on every run (scripted, r3-s09). Also r3-s06 (Les Miserables: ranked Fantine third from dot sizes, the values put her fifth) and r3-s10 (void; same wrong answer as r3-s08) | **Fails** (see the check below) |
| 4 | Confirmed silent commit on a success path | 0 | 0. Every run, size binding, label pick and layout Apply changed the drawing or the key | Holds |
| 5 | Counts and key sentences that disagree with the drawing | 0 | 1 confirmed, unchanged from round 2: the label count treats a name drawn under a dot as shown. "20 labels, 0 hidden" while Chloe's name sits on Farah's dot and Eli and Dev overlap (r3-s07, s08, s09, reproduced in s09); on Les Miserables "77 labels" with every name on while Valjean's name is under his own enlarged dot (r3-s01-s06, reproduced in s06) | **Fails** |
| 6 | Confirmed false "done" | 0 | 1: r3-s01 said the picture was done; the "Whole graph" export draws the 3D drawing from another side (left and right swapped, the bottom quarter empty), and nothing a screen-reader user can perceive says so. Not `truth-on-screen`. The cause is a reproduced build defect | **Fails** (1, build-decided; holds without it) |
| 7 | Keyboard: the screen-reader persona S/SD on every task taken; the keyboard-only persona on T10, T12, T15 | all | Screen reader 6 of 7 (F on T15, build-decided). Keyboard only 2 of 2 measured (T10 S, T12 S); T15 not measured (r3-s10 void) | **Fails** (screen reader T15; keyboard-only T15 unmeasured) |
| 8 | Automated accessibility check | all four parts | Axe part fails on one cause measured at preflight: dimmed text `#8c8c8c` on `#2c2c2c` at 4.15:1 on 9 of 13 screens. The other three parts were not run by script this round; sessions reproduced failures of each (list below) | **Fails** |
| 9 | App words at rest | <= 50 | 41 (preflight, `tool/bars.mjs`; 41 on round 2's build too) | Holds |

**Check on bar 3 before it is final.** The rule confirms a reproduced build defect at one
participant, and the misleading drawing is reproduced; the wrong answer it produces was given by one
valid participant on the running club (r3-s08), one void session (r3-s10) and, on Les Miserables,
one more (r3-s06) whose misordering may be ordinary eyeballing of close sizes (470.6, 376.3, 369.5)
rather than perspective. The wrong claim was outside the graded parts of the task ("who matters
most" is not asked; "what the sizes mean" is, and was stated correctly). Read strictly (two valid
participants with the same perspective misreading on one dataset), it is one participant and bar 3
holds. Scored as failing because the picture a user hands to someone else names the wrong person,
which is the severity-4 outcome whoever reads it. Round 2 held the 3D perspective problem at
severity 1 because it was read before any size was bound; bound to a result, it changes the answer.

**Bar 8, what sessions reproduced** (for the specialist's script, not scored here): focus drops to
the page after opening a sample by keyboard (r3-s14, s18, s20, s22, s26, s39, all reproduced) and
after "No thanks" on the usage card (r3-s01, s26, reproduced); after Escape from the keyboard
shortcuts dialog opened from the drawing (r3-s39, reproduced); after a refused file (r3-s52,
reproduced); after Enter on a recent project (r3-s47, reproduced). A refusal announced twice as two
assertive alerts (r3-s52, reproduced twice). Live regions that already hold their text, so the
change is likely never spoken: the usage confirmation and the label count (r3-s01, s14, s26, s47;
reproduced in s14, s26). Not announced: a size binding (r3-s26, reproduced), choosing an outline
row (r3-s01, s14, reproduced), choosing a node from Find (r3-s20, reproduced), "Save local copy..."
(r3-s47, reproduced). A disabled Redo in the Tab order with no focus ring (r3-s18, s22, both
reproduced). No headings once a graph is open (r3-s20, s26, s39). The Values chart read as twenty
unnamed rows (r3-s01, s26, reproduced). The find box named "Find" while it shows "Find nodes,
edges, values" (r3-s19, s21, s56).

## Per task (bar 1)

T15 first, then the core four, then the rest. Halves on valid sessions.

| Task | Target | Result (valid) | Halves | Ease mean (median) | Steps / path (mouse) | Keyboard steps | Status |
|---|---|---|---|---|---|---|---|
| T15 Whole first session | 8 of 10; halves 5 of 6, 3 of 4 | **8 of 9** (8 S, 1 F); as graded 9 of 10 | Les Miserables 5 of 6; own file 3 of 3 (4 of 4 as graded) | 5.56 (6) | 0.8x | screen reader 49 commands, 145 keys (F) | **Passes** |
| T10 Names on every dot | 7 of 8; halves 3 of 4 | 8 of 8 (7 S, 1 SD) | Les Miserables 4 of 4; College football 4 of 4 | 5.12 (5) | 1.5x (1.9x on round 2's path of 4) | screen reader 31; keyboard 22 | **Passes** |
| T12 One character and his ties | 2 of 2 per half | 4 of 4 (all S) | Les Miserables 2 of 2; Florentine 2 of 2 | 6.00 (6) | 1.0x | screen reader 13; keyboard 17 | **Passes** |
| T9 Bigger dots | 7 of 8; halves 3 of 4 | 8 of 8 (5 S, 3 SD) | Les Miserables 4 of 4; Florentine 4 of 4 | 5.12 (5) | 1.2x | screen reader 31 | **Passes** |
| T11 Untangle the drawing | 4 of 5 | 5 of 5 (3 S, 2 SD) | - | **4.00 (4)**, at the floor | **3.5x** | - | **Passes** |
| T6 What did I get? | 4 of 5 | 5 of 5 (1 S, 4 SD) | - | 5.60 (6) | **2.7x** | screen reader 52 | **Passes** (failed in round 2) |
| T7 Who matters most (running club) | 4 of 4 | 4 of 4 (3 S, 1 SD) | - | 5.00 (5) | 0.8x | - | **Passes** |
| T14 Stop and come back | 3 of 3 | 3 of 3 (all S) | - | 5.67 (6) | 1.2x | screen reader 48 | **Passes** |
| T13 Picture and numbers | 2 of 2 | 2 of 2 (S, S) | - | 5.00 (5) | 1.1x | - | **Passes** |
| T8 Circles of characters | 2 of 2 | 2 of 2 (S, S) | - | 5.50 (5.5) | 0.8x | - | **Passes** |
| T5 A file that will not read | 1 of 1 | 1 of 1 (S) | - | 6.00 | - | screen reader 7 | **Passes** |
| T3 Your own list of ties | 1 of 1 | 1 of 1 (S) | - | 6.00 | 1.3x | - | **Passes** |
| T2 Something to try it on | 1 of 1 | 1 of 1 (S) | - | 6.00 | 3.0x to the drawing (read "What is collected" first; 9 in all with the Settings check) | - | **Passes** |
| T16 First look (measured) | - | 2 complete (1 void) | - | 5.00 | - | - | Measured |

**The one failure.** r3-s01, the screen-reader persona's whole first session, the session that
gave up at the export dialog in round 2. This time the dialog kept focus and every part was done:
Betweenness run and announced, sizes bound, every name drawn, a picture with its key saved. She
changed View from "Current view" to "Whole graph"; that export draws the 3D drawing from another
side. With "Current view" the same state exports a picture that matches the screen (re-run). Without
the defect the grade would be SD (she asked a sighted person whether the key was in the picture).

## Round 3 against round 2

| | Round 2 | Round 3 |
|---|---|---|
| Core four (T15, T10, T12, T9) success | 33 of 34 (97%) | 28 of 29 (97%) |
| Core four mean ease | 4.88 | **5.38** |
| Core four without the screen-reader persona | 30 of 30, ease 5.13 | 25 of 25, ease 5.44 |
| Tier 1 success | 52 of 54 | 52 of 53 |
| Tier 1 mean ease (median) | 4.98 (5) | **5.28 (5)** |
| SD share of successes | 35 of 52 | **11 of 52** |
| Wrong turns per session, median (mean) | 1 (2.0) | **0 (0.66)** |
| Screen-reader persona | 5 of 7 | 6 of 7 |

Each change credited only on the route it changed:

- **Names switch (T10):** every name reached 8 of 8; wrong turns 1, 1, 1, 3, 1, 1, 1, 1 (round 2:
  5, 5, 6, 5, 3, 5, 2, 4); 7 S of 8 (round 2: 0 S of 8); ease 4.25 to 5.12; steps 3.5x to 1.5x.
  The remaining wrong turn in 7 of 8 sessions is the graph's own Style tab, which the switch did
  not touch. **Credited.**
- **Size "+" opens its list (T9, T15):** the list was used directly in 15 of 17 sizing sessions,
  closed by a slip and reopened in 2 (r3-s27, s29, both SD), "Fixed size" chosen in 0, the
  chain-link needed in 0. But finding Size behind "+" beside Shape was still named as a difficulty
  in 16 of 17 (round 2: 18 of 18). T9 S share 5 of 8 (round 2: 1 of 8). **Credited for the chain;
  the discovery cost is unchanged.**
- **Group layouts after a community run (T11):** both participants who ran a community analysis got
  Rings by group and Columns by group with the groups preselected (r3-s32, s33); no regression.
  Only 2 of 5 found that route; 3 of 5 met the greyed items with no pointer to it. Ease 3.33 to
  4.00, steps 5.2x to 3.5x. **Credited on the route; the route is not found.**
- **A run named by its method:** no grader recorded a pause over a run's name in any session
  (round 2: 17). Side effects, one participant each: the same word on the outline row, color chip,
  list heading and option made a click land on the wrong one (r3-s29); the group layouts call the
  same groups "Communities" (r3-s33). **Credited.**
- **Menu dialog keeps focus:** r3-s01 operated the Export dialog by keyboard and saved the picture;
  r3-s47 saved and reopened. **Credited.** Round 2's severity 4 is closed.
- **Load and run announced:** "Betweenness added, running", "Betweenness finished", load size
  heard (r3-s01, s14, s20). **Credited.** "PageRank finished" is spoken again on reopening a
  project (r3-s47, severity 1).
- **The drawing no longer takes focus on load:** the canvas has its name and ring (r3-s39), but
  focus now falls to the page after a sample opens, reproduced in 6 keyboard sessions. **A
  regression traded for the fix** (confirmed problems, severity 3).
- **Reading mode for the screen-reader persona (T6):** 5 of 5 (round 2: 1 of 2); the screen-reader
  session succeeded with `--read` in 52 steps. **Credited** (tool change, not app).
- **Fit in 2D, the key leaving out a painted-over layer, the chevron in the Degree row:** no
  failure of any of them was reported; T12's pointer users clicked the row's word (drawn by the
  ">"), not the chevron, so the chevron fix was not exercised. **Not tested by any route.**

## Measures (targets, not gates)

| Measure | Target | Round 3 |
|---|---|---|
| All tier 1 sessions | >= 85% | 52 of 53 (98%) / 52 of 52 without build-decided |
| Ease, tier 1 mean | >= 5.0; no task below 4.0 | **5.28** (median 5), 53 ratings; 5.29 without build-decided. Lowest: T11 4.00 (at the floor, not below) |
| First-time vs others | gap reported | all tasks: first-time 35 of 35, ease 5.40; others 17 of 18, ease 5.06. On the 10 tasks both took: 33 of 33, 5.36 against 16 of 17, 5.00. Core four: 20 of 20, 5.45 against 8 of 9, 5.22 (others are mostly the keyboard and screen-reader personas) |
| Steps against the success path | median <= 2x per task | 1.2x overall (pointer). Over: **T11 3.5x** (round 2 5.2x), **T6 2.7x** (round 2 2.3x, one session), T2 3.0x (the usage card read first) |
| Wrong turns per session | median <= 2 | median 0, mean 0.66. Highest: the screen-reader persona (3 on T10 and T6), T6 sighted 2, 1, 2 |
| Recovery: a wrong turn, still a success | >= 70% | 25 of 26 (96%) / 25 of 25 |
| Whole first session: picks and runs a ranking measure unaided | every successful session | 9 of 9 valid (PageRank on its "Start here" tag in 5; Betweenness by its description in 4) |
| Sizing named as a difficulty (T9, T15) | compare with round 2's 18 of 18 | 16 of 17 valid sizing sessions; the cost is now one guess (Size under Shape "+"), not the chain |
| T10 every name reached | record | 8 of 8 |
| T11 community run made / group layout tried | record | 2 of 5 / 2 of 5 (the same two; both worked) |
| Run-name pauses | round 2: 17 | 0 |
| T12 route | record | 4 of 4 through the Degree row (2 by pointer on its word, drawn by the ">"; 2 by keyboard); 0 by G or the context menu |
| Time to first drawing | sample 1 action after the start screen; own file 2 | Met: a sample in one click after the card; friends.csv drawn on a drop (1) or "Open project or file..." and a pick (2); "New from data..." takes 3 (r3-s56) |
| First look (T16) | baseline | Tom (r3-s55, void at step 6, records kept): drawing in 2 commands (the drop alone would do); ran Degree unasked; read it right (Ava 6, Ivan 5); would keep using it to open files. Ruth (r3-s56): drawing in 4 via "New from data..."; ran Betweenness unasked, passing over "Start here" because its description fit; read it right (Ava 51.27, Ivan 40.02); would keep using it for a first pass |
| Usage card | no wrong belief | Declined at every empty start where answered; skipped by opening a sample in 2 (r3-s14, s20, the screen-reader persona); no wrong belief. T2: "change it later" answered and checked in Settings > Privacy (r3-s54); "a replay of each session" put her off sharing (opinion) |
| App words in a node's inspector | <= 40 | Not run |
| Bar 8 at 320 px and 200% text | 0 serious or critical | Not run |
| Tool prints on success paths | 0 | 0 script errors, 0 failed requests (56 empty logs) |
| Overlays covering what the participant needed | recorded | The key covers the Pazzi dot on Florentine families from the first run (r3-s27, s29, s30, reproduced in all three; one event for the dataset) and half of Blacheville's name on Les Miserables (r3-s03); after Spectral the drawing sits under the floating toolbar (r3-s31, s34) |
| Void sessions | 0 | **2** (r3-s10 persona mismatch, r3-s55 tool), not re-run; 1 non-voiding tool fault (r3-s49) |

## What worked

- **Every task passed its bar**, including T6, which failed in round 2; first-time personas 35 of 35;
  tier 1 ease 5.28 (round 1 4.50, round 2 4.98), above the 5.0 target for the first time.
- **Names on every dot is now an S task:** "Show all labels" beside the hidden count was found and
  used in 8 of 8, and every participant said the names were complete only once the count read
  "77 labels" (or "115 labels").
- **The whole first session:** 8 of 8 sighted sessions S with no wrong turn; every one picked and
  ran a ranking unaided; every exported picture carried a key naming size and color.
- **The screen-reader persona finished six of seven tasks**, including the export dialog that ended
  round 2, T6 by reading the Overview, and T12 in 13 steps (round 2: 41).
- **Ranking, groups and the numbers file stay quick:** T7 4 of 4, T8 2 of 2, T13 2 of 2, T14 3 of
  3 all S; the refusal of a broken file in 7 steps by keyboard.
- **No silent commit and no run-name pause** in 56 sessions.

## Confirmed problems

Confirmed = seen in 2 or more participants, or a build defect reproduced as a scripted path
(`repro/<session>/`). Severity 0-4 as the graders set it; opinion-only findings held one level
down; where graders differed the higher rating is kept unless noted. Deterministic drawings are one
event per dataset.

| Sev | Problem | Seen in | Where the fix belongs |
|---|---|---|---|
| 4 | Size bound to a result is misread in the default 3D view: perspective draws a lower-ranked dot larger, on screen and in the exported picture; a participant named the wrong person as most important without knowing (bar 3; see the check above) | r3-s08 (sev 4), s09 (reproduced), s06, s07; s10 void | to trace: graphty-element (camera or size rendering) or app (the view a figure is made in) |
| 3 | Export with View "Whole graph" draws the 3D drawing from another side (left and right swapped, a quarter empty) instead of fitting the current angle; decided r3-s01 (bar 6) | r3-s01 (reproduced) | graphty-element (export camera) |
| 3 | Focus falls to the page body after a sample opens by keyboard, and after "No thanks" on the usage card; the next Tab restarts at Main menu. New since the drawing stopped taking focus on load | r3-s01, s14, s18, s20, s22, s26, s39 (reproduced in s14, s18, s20, s22, s26, s39) | app (where focus goes after a load and after the card closes) |
| 3 | Escape from the keyboard shortcuts dialog opened from the drawing leaves focus on the page body | r3-s39 (reproduced) | app or compact-mantine |
| 3 | A name is drawn over its own enlarged dot (the label offset ignores dot size) and names collide where dots sit close; the label count calls them shown (bar 5) | r3-s01-s06 (Valjean; reproduced in s06), r3-s07-s09 (Chloe on Farah; reproduced in s09) | graphty-element (label placement and the overlap test) |
| 3 | Names in the exported picture are soft and blurred while the key is sharp; the 4x print preset does not sharpen them | r3-s01-s06, s09 (reproduced in s02, s06, s09) | graphty-element (label rendering at export scale) |
| 3 | The key box covers a node from the first run on (Pazzi, one of 15 families, completely; Blacheville's name half) and the camera does not refit | r3-s27, s29, s30 (all reproduced), s03, s33 | graphty-element (legend placement or fit inset; held for the owner in round 2 as new element API) |
| 3 | A node selected before export keeps its selection ring in the picture, tinting it off its own key; the dialog has no choice to leave it out | r3-s02 (reproduced), s24, s27 | graphty-element (export without selection styling) |
| 3 | Spectral collapses Les Miserables into one clump at a canvas edge with a few outliers, no refit, no notice, against its own description; it comes out mirrored or rotated on each apply | r3-s31, s32, s33, s34, s35 (reproduced in s31-s35) | graphty-element / layout (spectral on this graph; orientation); to trace |
| 3 | Rings by group and Columns by group are greyed with "Needs a node attribute to group by" and nothing says a community run provides one; 3 of 5 left without the route that fits the task | r3-s31, s32, s33, s34 (sev 3), s35 | app (words) |
| 2 | Size has no line of its own; it sits behind "+" beside Shape and is found by guessing | 16 of 17 sizing sessions (r3-s02-s09, s23-s30) | app |
| 2 | The graph's own Style tab (background, layout) is the first one a newcomer opens; nothing points to "Everything", where Label lives | r3-s11-s18 (7 of 8 wrong turns), s14 | app |
| 2 | A run or group row opens on Style; the ranked list and members are on Values, found by guessing; after Run the panel stays on the graph | r3-s25, s41, s42, s43, s44, s50, s51, s55, s56 | app |
| 2 | The label attribute list (id; id, label, value) shows no sample value, so the one holding names is a guess | r3-s07, s08, s09, s15, s16, s17, s18, s55, s56 | app |
| 2 | The hidden-name count and "Show all labels" are small gray text; three participants said they would have stopped without it | r3-s11, s12, s13, s15, s17, s18; which names are hidden is not said (r3-s01, s14) | app |
| 2 | Hovering a dot shows nothing and no names are drawn by default; the biggest dot is identified only by clicking | r3-s19, s21, s25, s27, s28, s29, s30, s41, s42, s43, s50, s51, s54 | app (default labels and hover are design choices) |
| 2 | The automatic orange-to-brown ramp after a run barely separates nodes; color repeats the size measure | r3-s02-s07, s28, s30, s42, s55, s56 | app (the run's suggested style) |
| 2 | Overview: the direction row shows only "Undirected, from the file: directed 0", without its label and past the panel edge; "Edges per ..." truncated (no tooltip in two re-runs, a tooltip in one) | r3-s21, s36, s37, s38, s39, s40, s46, s54 (reproduced in s37, s38, s54) | app |
| 2 | "Components 1" is the only answer to reachability and is unexplained | r3-s36, s37, s38, s40, s50, s51 | app (words) |
| 2 | "Degree N" does not say it counts connections; only the ">" says it opens the list | r3-s02, s19, s20, s21, s22 | app (words) |
| 2 | Layout words: element English refusals ("G is not planar", `results.louvain.group`), "with 'dim: 2'" in Force's description, "Louvain" called "Communities" in Group by | r3-s31-s35, s33 | app (words from the element's codes) |
| 2 | Toolbar View button reads "3D" after a layout applied with Shape 2D; two controls share the words | r3-s05, s31, s34, s35 (reproduced in s35) | app |
| 2 | Undo after a layout restores positions but does not refit the view | r3-s32, s33, s35 (reproduced in s32, s33) | graphty-element (fit) |
| 2 | Export Data opens on Graphty JSON; CSV opens on Edges; a nine-bullet warning in program terms; three CSVs among 18 formats; dotted column names | r3-s48, s49, s56 | app (words, defaults) |
| 2 | The Export dialog never says the key is in the picture; the preview is too small to check | r3-s01, s03, s04, s07, s08, s10, s48, s49 | app |
| 2 | "Saved in this browser" with the warning that the browser can clear it shown only on the start page later | r3-s45, s46, s47 | app (words) |
| 2 | "Save local copy..." downloads with no message and no place named | r3-s45, s47 (both reproduced) | app |
| 2 | Screen reader: no headings once a graph is open | r3-s20, s26, s39 | app |
| 2 | Screen reader: the Values distribution chart reads as twenty "row (no name)" items | r3-s01, s26 (reproduced) | app |
| 2 | Screen reader: choosing an outline row, binding a size and picking a Find result are silent | r3-s01, s14, s20, s26 (each reproduced) | app |
| 2 | Keyboard: disabled Redo, Label and "Add label line" stay in the Tab order, Redo with no focus ring | r3-s01, s14, s18, s22, s47 (reproduced in s18, s22) | app or compact-mantine |
| 2 | Live regions that already hold their text (usage confirmation, label count) | r3-s01, s14, s26, s47 (reproduced in s14, s26) | app |
| 2 | A refusal is announced twice as two assertive alerts; focus falls to the page after the file chooser closes | r3-s52 (reproduced twice) | app |
| 2 | Quick actions: no "No results" for a search with no match; "Add label line" disabled with no reason | r3-s14 (reproduced) | app |
| 2 | Typed value in a layout form is not taken until Enter; the button stays "Applied" | r3-s35 (reproduced) | app |
| 2 | The Data > Sources file row takes focus but a click or Enter opens nothing | r3-s53 (reproduced) | app |
| 2 | Betweenness "Sample size" unexplained; nothing says whether values are normalized | r3-s01, s05, s26, s56 | app (words) |
| 2 | Small low-contrast gray helper text (bar 8 measures it at 4.15:1) | r3-s34, s37, s51, s55 | compact-mantine (dark ramp) |
| 2 | Clicking a group row opens its color, not its members; the drawing does not mark the group; Members stop at "First 10" | r3-s50, s51 | app |
| 2 | Analyze opens on rankings with PageRank "Start here"; grouping methods found only by typing | r3-s50, s51 | app |
| 1 | The key shows raw scores with no words or unit | r3-s02, s04, s06-s10, s23-s25, s27, s43 | app |
| 1 | The Analyze list is method names; "Start here" pulls "depends on most" toward PageRank; Damping factor and Weight unexplained | r3-s02-s04, s07-s09, s23-s25, s27-s30, s41-s44 | app |
| 1 | "PageRank", "PageRank rank", "PageRank percentile" in the Size list with no difference given | r3-s02, s23, s24, s25, s28, s29 | app (words) |
| 1 | With every name shown, middle names are tiny and stacked; zoom barely helps (not a defect against T10 per the key) | r3-s11-s13, s15-s18 | graphty-element (label size) and app (a size control) |
| 1 | "Selection 18" beside "17 connections" with nothing saying the 18 includes him (both true) | r3-s19, s21 | app (words) |
| 1 | Find box accessible name "Find" does not contain its visible text (WCAG 2.5.3) | r3-s19, s21, s56 | app |
| 1 | Three save items with nothing saying which keeps a file | r3-s07, s45, s46 | app |
| 1 | A reopened project's run row loses its count | r3-s45, s46 (reproduced) | graphty-element (restored run has no summary) |
| 1 | A who-knows-whom list loads as directed with arrows and no word on it | r3-s53, s55, s56 (s10 void) | app (words); the reading is graph-io's |
| 1 | Hairline edges cannot be clicked; a near miss drops the selection | r3-s36, s37 | graphty-element (edge picking) |
| 1 | Gravity shown as -1.2000000476837158 | r3-s14 (reproduced; round 2 too) | app |

**Not yet confirmed (one participant, not reproduced):** "?" does nothing while focus is on a
checkbox (r3-s01, reproduced, severity 2: confirmed as a build defect, listed here because it
decided nothing); Shift+T opens the table without moving focus (r3-s39, severity 2); the canvas
in the Tab order answers no key (r3-s39); Columns by group draws columns in an order the key does
not follow (r3-s32); the Everything Style tab shows a purple fill while every node is drawn orange
(r3-s46, grader's observation); "PageRank finished" spoken again on reopen (r3-s47); the Data page
lists file columns but not computed results (r3-s44); the refusal toast covers the usage card's
text (r3-s52, reproduced, severity 1); Enter in the Analyze filter opens the form rather than
running (r3-s06).

## Study validity notes

- **Two voids were not re-run.** The keyboard-only persona's whole first session therefore has no
  valid result, and bar 7 cannot pass on this round's data even without the screen-reader failure.
- **The tool's screen-reader mode does not print `aria-current` or the toolbar container**
  (`real.mjs` `SR_STATES`), so the screen-reader persona heard the Graph/Data rail as two stateless
  buttons and took a wrong turn on it (r3-s39). The app's markup is right; fix the tool before any
  further screen-reader session.
- **N alike is not independent.** 16 of 17 naming Size under Shape is one shared first guess
  repeated; the ease rise is one model's ratings and is uncalibrated.
- **Round 3 is the last round** (`criteria.md`, "When the studio stops"). Bars 3, 5, 6, 7 and 8
  fail; bars 1, 2, 4 and 9 hold.
