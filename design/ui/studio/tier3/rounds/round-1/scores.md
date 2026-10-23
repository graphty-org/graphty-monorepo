# Tier 3 round 1 scores: first use and styling on the real graphty app

Scored against `../../criteria.md` on the frozen build 758b8e8081 (graphty@0.8.91, every
`session.json` buildStamp "758b8e8081dc graphty@0.8.91"), from the graders' `grade.md` files in
`sessions/`, the participants' style trees (`styles-steps.jsonl`, `styles.json`, `key.json`), the
round's bars runs (`bars/bars.json` dark, `bars-light/bars.json` light), the repros in `repro/`,
and the four expert reports in `expert/` (accessibility, the screenshot audit, controls and
gestures, visual design). `score.mjs` was run (`score.json`); two of its numbers are wrong and are
corrected by hand below ("Scoring tools"). The scripts behind the hand counts are in
`tmp/researcher/score-r1/` of the studio worktree (`tally.py`, `cards.py`, `keycheck.py`,
`words.cjs`).

All participants are simulated: one model playing composite first-time personas. A failure is
strong evidence; a pass is weak until real people confirm it. Severities are the graders' and the
experts' walkthrough judgments; this file proposes, and the skeptic check decides, which problems
count against bar 5 (`insights.md` holds the result after that check).

## Headline

**Not passable in round 1: three tasks not run by plan** (T37, T42 and T44 are not judged, so
bar 1 cannot hold for the study). Over the 12 tasks that ran:

| Bar                          | Result                          | In one line                                                                                                        |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1 Task success               | **Fails** (11 of 12 tasks hold) | 55 of 56 sessions S or SD; T49 B is 1 of 2 (an F on the asked-color rule)                                          |
| 2 False "done"               | Holds                           | 0 of 56                                                                                                            |
| 3 Wrong turns                | Holds                           | Every task's median is 1 or less                                                                                   |
| 4 Time to first styled graph | Holds                           | Median 6 steps on T39's 5 pointer sessions (limit 10)                                                              |
| 5 Severity 3 and 4 open      | **Fails**                       | Two rows rated 3 before the round are open; up to ten new candidates go to the skeptic check                       |
| 6 Accessibility              | **Fails**                       | axe target size and scroll regions (both themes), Autosave chip contrast (light), shared names on the start screen |
| 7 Keyboard                   | Holds                           | Sam 4 of 4 SD; no place a keyboard user could not reach, operate or leave                                          |
| 8 Words at rest              | **Fails**                       | 4 of 7 counted screens over their limit                                                                            |

Not scored: none. Bar 5 is scored because the round's walk reached every bar 6 screen with no MISS
line (`bars/bars.json` log; the audit's own runs at 1200 x 900 and 900 x 700 say the same).

## What ran

- **56 planned rows, 56 graded sessions**, every one on the frozen build. 11 first starts are VOID
  (r1-s01, s03, s05, s06, s07, s09, s11, s13, s19, s29, s40) and r1-s47 never started (its folder
  holds only a briefing); each row was re-run as `<id>b`. Every VOID has one mechanism: the
  participant ran `real.mjs --start` inside its own turn, the start queued for one of the four
  browser slots past the 120 s shell limit and moved to the background, the participant ended its
  turn to wait, and ending the turn killed the queued start (`session.log` reads "Terminated").
  The criteria ask for the start to be its own step before the participant's turn; the first wave
  did not do that. These are runner failures, not findings; the severity 4 that two VOID grades
  carry (r1-s05, r1-s06) is about the runner and is not counted.
- **Models:** 56 of 56 graded sessions ran on Opus (claude-opus-5-5). **0 sessions ran on
  Sonnet**; no session ended on a model API error, so the Sonnet fallback was never used.
- **Leaks:** none. Every grade records `real.mjs --leaks` with no file opened outside the
  session's own folder.
- **Starts:** every session `empty`; Sam's four `empty --keys`.

## Bar 1, per task

Success = S + SD. "Steps" is the graders' median count from the start screen; the key's path is the
count the grades cite from `../../answers.md`. Sam's keyboard sessions are counted in key presses
and left out of the step median.

| Task                         | All     | A   | B       | S / SD / F | Median wrong turns | Median steps (key) | Newcomers only | Without Sam | Bulk route                  |
| ---------------------------- | ------- | --- | ------- | ---------- | ------------------ | ------------------ | -------------- | ----------- | --------------------------- |
| T38 color a kind             | 4/4     | 2/2 | 2/2     | 3/1/0      | 0                  | 12.5 (12)          | 3/3            | 4/4         | --                          |
| T39 one color, first graph   | 6/6     | 3/3 | 3/3     | 3/3/0      | 0.5                | 5 (5)              | 6/6            | 5/5         | --                          |
| T40 pick by name             | 6/6     | 3/3 | 3/3     | 3/3/0      | 1                  | 20 (A 16, B 13)    | 5/5            | 5/5         | --                          |
| T41 yes/no and no value      | 4/4     | 2/2 | 2/2     | 3/1/0      | 0                  | 17.5 (18)          | 3/3            | 4/4         | --                          |
| T43 size by a number         | 4/4     | 2/2 | 2/2     | 3/1/0      | 1                  | 8.5 (6)            | 3/3            | 4/4         | --                          |
| T45 style some ties          | 4/4     | 2/2 | 2/2     | 4/0/0      | 0                  | 17.5 (16)          | 3/3            | 4/4         | --                          |
| T46 recolor one group        | 4/4     | 2/2 | 2/2     | 2/2/0      | 1                  | 15.5 (12)          | 3/3            | 4/4         | --                          |
| T47 all groups as cubes      | 6/6     | 3/3 | 3/3     | 4/2/0      | 0                  | 11 (11)            | 5/5            | 5/5         | 4 of 6 (folder 4, around 2) |
| T48 narrow every group       | 6/6     | 3/3 | 3/3     | 5/1/0      | 0                  | 11 (11)            | 6/6            | 5/5         | 6 of 6 (folder 6)           |
| T49 change and put back      | **3/4** | 2/2 | **1/2** | 3/0/1      | 0                  | 6.5 (5 + 1)        | 3/3            | 3/4         | --                          |
| T50 read a colleague's layer | 4/4     | 2/2 | 2/2     | 4/0/0      | 0                  | 5 (A 3, B 2)       | 4/4            | 4/4         | --                          |
| T51 a color per kind         | 4/4     | 2/2 | 2/2     | 3/1/0      | 1                  | 7 (5)              | 3/3            | 4/4         | --                          |

- **All sessions together: 55 of 56 (98%; target 85%).** Newcomers only (all but Alex and Maren):
  47 of 47. Without Sam: 51 of 52. No session was decided by a build defect.
- **Core half rule:** every core half holds with at least 2 S or SD from newcomers (T40 B: Dev and
  Grace beside Maren; T47 A: Grace and Elena beside Alex).
- **T49 B fails on one F.** r1-s46 (Alex) set every node to `FFD700`, which looks yellow on screen
  (hue 51 degrees) and which the follow-up put back exactly. The asked-color rule judges by
  `colorWord`, and `colorWord` returns the CSS keyword "gold" before it reaches the hue band, so
  "yellow" is not in the name and the session is F by the frozen rule. Without that rule's keyword
  order T49 would be 4 of 4. The same table names `F16363` (a salmon) "red" in r1-s47b, which
  passed. The rule stands for this round; whether a keyword inside an asked hue's band holds is a
  between-rounds question for the criteria (candidate insight 10).
- **T47's two "around" successes are both on A** (Elena r1-s15 after a wrong turn into one node's
  Style tab; Alex r1-s17): they set Box on the Everything base layer. On Les Miserables that route
  is 9 steps against the folder route's 11. All three B sessions used the folder.

## Bar 4, corrected

`score.mjs` prints a median of 3 steps. That number is the step at which the sample **opened**,
not the first styled graph: the tool takes the start page's turning demo (six community colors,
`01.png`) as the start, so the sample's own default indigo (`#6366f1`, every node one color) reads
as "one new color". Read from each session's `styles-steps.jsonl`, the first screenshot where every
node shows one color that is neither the demo's nor the sample's starting indigo:

| Session | Half | Sample opened | First one new color       | Steps from `01.png` | Asked color first drawn |
| ------- | ---- | ------------- | ------------------------- | ------------------- | ----------------------- |
| r1-s01b | A    | `04.png`      | `08.png` `#dcf163` (lime) | 7                   | `10.png` `#063d0c`, 9   |
| r1-s02  | B    | `04.png`      | `07.png` `#ffa500`        | 6                   | 6                       |
| r1-s03b | A    | `05.png`      | `09.png` `#d0f163` (lime) | 8                   | `11.png` `#0b4a05`, 10  |
| r1-s04  | B    | `04.png`      | `07.png` `#ffa500`        | 6                   | 6                       |
| r1-s06b | B    | `04.png`      | `06.png` `#ffa500`        | 5                   | 5                       |

Median 6 by the bar's words, and 6 counting only the asked color: **holds** (limit 10). Both A
sessions spent 2 to 3 steps on the color picker's hue bar (lime, then mint, then dark green); every
B session typed into the box (r1-s02 the word "orange", r1-s04 and r1-s06b the hex `FFA500` from
memory). Sam (r1-s05b, keys): 35 key presses to `36.png` `#006400` (the tool
printed 20, the step the sample opened). Minutes are not reported: they are measured from the same
wrong start.

## Bar 5: severity 3 and 4, for the skeptic check

**Fails before any new finding:** two `../../backlog.md` items were rated 3 at the dry run's triage
(`../../criteria.md`, preflight 4) and count once from the start: the folder's chain icon, which
paints every cluster one color (no session reached it this round), and a node's own Fill "+",
which makes a one-node layer (met again in r1-s15 T47 A, r1-s35 T43 A and r1-s53 T51 A, graded 3
there). No severity 4 was found by any session or expert.

New severity 3 candidates. Each is a confirmed problem; what the skeptics must settle is its
severity where the raters differ, or its confirmation where an expert alone saw it.

| #   | Problem                                                                                                                                        | Confirmed by                                                                                                              | Rated                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | The inspector's F6 stop draws no focus indicator                                                                                               | r1-s18 (T47 B), r1-s19b (T48 A), repro `repro/r1-s18/`                                                                    | 3 by both graders; the accessibility expert rates the ring-less heading 2 (its finding 7) |
| 2   | Both "Samples" controls scroll to the library and leave focus behind, off screen; typing goes nowhere                                          | r1-s05b (T39 A), r1-s11b (T40 A), r1-s18 (T47 B), repro `repro/r1-s11b/`                                                  | 3 by three graders; 2 by the expert (finding 5)                                           |
| 3   | Nothing shows which rows a layer paints: the table marks none and cannot show only them                                                        | r1-s30, r1-s32 (T41 B), r1-s29b (T41 A), r1-s50 (T50 B)                                                                   | 3 by both T41 B graders; 2 on T41 A and T50 B                                             |
| 4   | Coloring a find-box selection makes a fixed list of ids named by its count ("4 nodes", key "Color: 4 nodes"), not a rule that follows the data | r1-s31 (T41 A), r1-s28 (T38 B)                                                                                            | 3 in r1-s31, 2 in r1-s28                                                                  |
| 5   | Reaching a sample card by keyboard takes 30 or more Tabs (nine category chips are each a stop; Enter in the search does nothing)               | r1-s18, r1-s05b, r1-s11b; expert findings 4 and 13                                                                        | 3 in r1-s18, 1 to 2 elsewhere                                                             |
| 6   | The key covers drawn nodes, so a count off the drawing comes out one short                                                                     | r1-s20, r1-s22, r1-s24 (T48 B), r1-s23 (T48 A), r1-s54, r1-s56 (T51 B), r1-s55 (T51 A); node positions in the visual walk | 3 by the visual designer; 2 by the graders and the audit                                  |
| 7   | At 900 x 700 the storage notice is wider than the canvas (about 540 px in 363 px), its first words, Save and close cut off                     | Measured by the audit (`white-space: nowrap`, no max width); the accessibility walk shows it                              | 3 by the audit, 2 by the expert; 900 x 700 is a walk size, not a session size             |
| 8   | A saved project reopened in a smaller window draws its graph off center, partly under the toolbar                                              | The scripted walk at 900 x 700 and 1200 x 900, both themes (`bars/sessions/colleague-*`)                                  | 3 by the audit; mechanism not traced; no session ran at that size                         |
| 9   | Shift-click in the layer tree anchors on the last clicked layer, not the selection, and pulls the base layer into a bulk edit                  | The controls expert's own walk only (`expert/figma/a-start/38.png`, `41.png`)                                             | 3; **needs a repro under `repro/`**                                                       |
| 10  | A picker whose conditions together leave no node looks healthy once closed                                                                     | The visual expert's own walk only (`expert/visual/b-volunteers/12.png`, `13.png`)                                         | 3; **needs a repro or a count read by script**                                            |

## Bar 6, accessibility

Measured by the round's bars runs on the frozen build, 37 screens at two sizes in each theme:

- **Dark:** axe serious or critical on 10 of 74 screen-and-size entries: target size 6 (the "Open
  layer" links in "Why this look", 14 px tall with 22 px between them; the number card's 10 x 10 px
  range thumbs), scroll region not focusable 4 (the open shape list, the find list; the expert
  judges these not a defect but the tier 3 walk lacks the in-view check that grants the exception).
  Shared names on the start screen: link and button "Samples", three links "Docs", two "GitHub".
- **Light:** all of the above plus color contrast on 70 of 74 entries: the "Autosave: saved" chip,
  `#40c057` on `#ecf9ee`, 2.17:1 at 11 px, on every workspace screen.
- **Pass:** focus never fell to the page after any of the walk's actions; all 8 typing checks wrote
  their text (a new text card, after "Starts with", a new Color line, a new Shape line, at both
  sizes). The purple "Layer" token measures 7.15:1 dark and 5.66:1 light.

## Bar 7, keyboard

Sam's four sessions all succeeded as SD: r1-s05b (T39 A), r1-s11b (T40 A), r1-s18 (T47 B), r1-s19b
(T48 A). No grade and no expert walk found a place a keyboard user cannot reach, operate or leave,
so **bar 7 holds**. The cost is large: 100, 105, 72 and 37 key presses against pointer medians of
5, 20, 11 and 11, driven by bar 5 candidates 1, 2 and 5 and by F6 skipping the top bar, the rail,
the find box and the layer tree (expert finding 8).

## Bar 8, words at rest

Counted by the dark bars run against `../../../tool/bars-limits.json` (`tier3`), which kept the
lower of the 31e8c2387 and 758b8e8081 counts:

| Screen                                                       | Words | Limit |                                                                                                                                         |
| ------------------------------------------------------------ | ----- | ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| a sample just opened                                         | 72    | 50    | **over** (19 of the 72 are the storage notice, which the audit attributes to the automation's storage quota; 53 without it, still over) |
| Everything, Node tab                                         | 53    | 47    | **over**                                                                                                                                |
| a layer with a condition, at rest                            | 45    | 39    | **over**                                                                                                                                |
| a layer with four conditions, at rest                        | 51    | 42    | **over**                                                                                                                                |
| a folder of groups                                           | 56    | 56    | at the limit                                                                                                                            |
| two layers picked together                                   | 69    | 69    | at the limit                                                                                                                            |
| a run's folder, its picker open, a card added to every layer | 96    | 99    | under                                                                                                                                   |

Above the 50-word (at rest) or 40-word (inspector) budget, each a severity 2 finding until it
falls: all seven screens.

## Confirmed problems of any severity

Confirmed means two sessions on two different task halves, or one session plus a scripted repro or
a measurement. The bar 5 table above is not repeated here. **Count for the round's baseline: 8
build defects and 30 design problems, plus the 10 bar 5 candidates (of which 2 still need a repro).**

### Build defects (a repro under `repro/`)

1. A click on Style layers' "+" while the find list is open is lost: the list closes, the button
   jumps to the top, no menu opens (2). r1-s07b, r1-s08, r1-s10; repros r1-s07b, r1-s08, r1-s10.
2. One click on the color picker's hue bar sets the color and closes the picker (2). r1-s09b, r1-s10;
   repro r1-s10.
3. The mouse wheel barely zooms (580 to 585 px for a 3000 wheel) (2). r1-s08, r1-s10, r1-s12;
   repro r1-s08.
4. The first color with a find-box selection held moves the drawing about 130 px right, a painted
   node under the inspector (2). r1-s28; repro r1-s28.
5. The analysis filter lists seven community methods for "communit" and none for "community" (2).
   r1-s43; repro r1-s43. Quick actions also finds no analysis for "communit" or "cluster"
   (r1-s18, r1-s19b).
6. Control+A on the color swatch button selects the whole graph and swaps the layer's inspector
   for the selection; Escape then shows the Graph inspector, not the layer (2). r1-s05b; repro
   r1-s05b; expert finding 12.
7. Bar 5 candidate 1 (F6 stop, no focus indicator); repro r1-s18.
8. Bar 5 candidate 2 (Samples leaves focus behind); repro r1-s11b.

### Design problems (two task halves or more)

Severity is the highest a grader gave on a half that confirms it.

1. **The color box is hex first.** Nothing says it takes a color word; the picker's swatches hold
   no common hues (2). About 20 sessions on 12 halves: T39 A and B, T40 A and B, T38 A, T41 A, T45
   B, T46 B, T49 A and B, T50 A and B.
2. A new Fill Color line starts at `6366F1`, the color every node already has, so adding it
   changes nothing (2). T38 A (r1-s25, s27), T38 B (s26), T40 A (s09b), T40 B (s08).
3. A new Width line starts at 8, the width every tie already has, with no unit; Enter changes
   nothing visible (2). T45 A (r1-s37, s39), T45 B (s38, s40b).
4. With nothing picked, the Graph inspector's Style tab holds only canvas settings and points
   nowhere for node color or size (2). T39 A (r1-s01b, s03b, s05b), T43 A (s33), T43 B (s34, s36),
   T51 A (s55), T51 B (s54, s56).
5. Color and size by a column sit behind a bare chain-link icon named only by its tooltip (2). T43
   A (r1-s33, s35), T43 B (s34, s36), T51 A (s53, s55), T51 B (s54, s56).
6. The "Color: Louvain" key looks clickable, does nothing and shows no group sizes (2, already
   rated 2 in the backlog). T46 A (r1-s41, s43), T46 B (s42, s44); T47 B (s16) no counts.
7. Group layers are hidden in the collapsed folder: a click on the folder's name selects without
   expanding, and "Louvain Group N" under a node's Memberships opens the layer but is drawn as
   plain text (2). T46 A (r1-s41, s43), T46 B (s42, s44).
8. The purple "Layer" token is unexplained: readers call `<<Layer>>` jargon (2). T46 A (r1-s41), T46
   B (s42), T47 B (s16), T48 A (s21), T48 B (s22, s24); the audit's guillemets finding.
9. Nothing after a run points to the folder's Which nodes as the place to narrow who gets the
   color (2). T48 A (r1-s21), T48 B (s22, s24).
10. The new red sits beside a look-alike group color (2). T46 A: `#d55e00` (r1-s41, s43); T46 B:
    `#be0032` (s42, s44). Measured with `colorWord`: T46 A has two "orange" and two "blue" groups;
    T46 B names `#be0032` "pink", and `#f99379` and the new `#ff0000` both "red"; the spoken names
    say the same (expert finding 10).
11. No shape is called Cube; Box is guessed from its icon, and typing "cube" in the list finds
    nothing (2). T47 A (r1-s13b, s15, s17), T47 B (s14, s16, s18).
12. The analysis filter's "cluster" highlights Clustering coefficient (a ranking) first (2). T47 B
    (r1-s14), T48 B (s20).
13. Nothing helps choose among the grouping methods; Resolution and Weight are unexplained (2).
    T46 A (r1-s43), T47 A (s13b), T47 B (s14, s16), T48 A (s23), T48 B (s20, s24).
14. The find box lists matches but offers no way to act on all of them; Enter selects only the
    first and empties the box (2). T40 A (r1-s09b, s11b), T40 B (s10).
15. Nothing on the drawing names a node, and pointing at one shows nothing (2). T38 B (r1-s26),
    T41 A (s31), T41 B (s30), T43 B (s34, s36), T50 A (s49, s51), T50 B (s50); repro r1-s07b
    (`--hover-at` reports tooltip null). A loaded file starts without the sample's "name the
    pointed-at node" layer (`styles.json` `changes.gone`).
16. A layer's Values tab lists members by id (s05, v03), not by name (2). T41 A (r1-s29b), T41 B
    (s32).
17. Collapsed condition chips each show their own count and nothing says "and"; "Nodes that pass
    every condition" reads as AND only once a category card says "Is any of" (2). T38 A (r1-s25,
    s27), T38 B (s26), T50 B (s50, s52); visual finding 3.
18. A number card offers only "Between ... to ...", so "at least 5" and "30 to 52" (the column's
    top) must be reasoned out (1). T45 B (r1-s38, s40b), T50 B (s50).
19. A new yes/no card applies "Yes" and repaints before the reader picks (1). T41 B (r1-s32), T48 A
    (s23), T48 B (s20).
20. A new text card opens on Contains; "Has no value" is only in its match menu (1). T41 A
    (r1-s29b), T41 B (s32).
21. The key for a styled group names the color and the method or count, never the rule or the
    other properties set ("Edge color: Layer 1, 51 of 254 edges"; "Color: Louvain"; "Color: 10
    nodes") (2). T45 A (r1-s37), T45 B (s38), T38 B (s28), T41 A (s31), T48 B (s22).
22. The Analyze button is an unlabeled flask icon (1). T46 A (r1-s43), T48 A (s21, s23), T48 B
    (s20, s22, s24).
23. "Style layers", "Layer" and "Folder" read as developer words; the "+" menu item "Layer" was
    guessed (1). T38 A (r1-s25, s27), T40 A (s09b), T40 B (s12), T41 B (s30, s32), T45 A (s39), T45
    B (s40b), T49 B (s46).
24. "Everything" does not say it is every node's base look until opened (1). T39 B (r1-s02, s06b),
    T49 A (s47b), T49 B (s48), T51 A (s55), T51 B (s56).
25. The storage notice ("This browser may clear what it keeps for this site") worries readers
    beside "Autosave: saved" (1). T39 B (r1-s02), T41 A (s31), T48 A (s21), T49 A (s45).
26. Two start-page controls are named "Samples" (1; also bar 6). Nearly every pointer session's
    first click by name was refused.
27. Sample cards are titled by a question, the dataset's name in the smaller gray line (1). T39 B
    (r1-s02, s04); expert finding 6 (the card's name leaves out its visible title).
28. Long keyboard walks: F6 is never shown, nine chips are nine Tab stops, the bottom toolbar sits
    between the panels (2). r1-s05b (T39 A), r1-s11b (T40 A), r1-s18 (T47 B); expert findings 4
    and 8.
29. Search samples: Enter does nothing and the filtered results stay below the fold (2). r1-s05b,
    r1-s11b, r1-s18; expert finding 13.
30. Words the app speaks for a color differ from what the reader sees: the box shows a hex while
    its name says "indigo" (1). T49 B (r1-s48), T50 A (s49), T50 B (s52); expert finding 19.

Recorded, not counted (decided in `../../decided.md`): the camera glides to center every pick
(r1-s15, s26, s34, s35, s36, s51, s53); Escape keeps edits.

### Seen on one half only (not confirmed; watch next round)

- The key scrolls once a Shape entry is added and hides Groups 8 to 10 (2). T47 B only (r1-s14,
  s16, s18): ten groups occur only on College football. A repro, or a ten-value key on another
  half, would confirm it.
- The shape list opens scrolled to Icosphere with Box out of view (2). T47 A only (r1-s15, s17);
  the audit calls it intended.
- A new layer reads "Node and edge layer" and opens on Node with "Style nodes" ticked, worrying a
  reader who wants ties only (1). T45 A only (r1-s37, s39).
- The color key gives no count per group (1). T47 B (r1-s16); the same as design problem 6.
- Clicking "Shape" or "Fill" does nothing; the line is only behind a small "+" (1). T43 A (r1-s35),
  T40 B (s12).

### The key-and-drawing check

Run by script over all 56 last states (`keycheck.py`: each key row's color against `key.json`'s
drawn colors, each "N of M nodes" against the nodes drawn in the key's colors, and drawn colors
missing from the key): **0 disagreements.** The look-alikes the criteria record are measured in
design problem 10 (T46 A and B) and hold on T47 B's ten-group key too (two "pink", two "yellow").
T48's and T51's keys draw three values in three distinctly named colors.

## Measures

- **Card types reached (question 2)**, from each session's final `styles.json`:
    - text (contains, starts with): T40, 6 of 6, on two domains (Les Miserables names, yeast genes);
    - category on nodes: T38, 3 of 4 (r1-s28 colored a find-box selection), two domains;
    - yes/no with has-no-value: T41, 3 of 4 (r1-s31 hand-picked four ids), two domains;
    - category on ties: T45 A, 2 of 2, **one domain** (neighbors.csv);
    - number on ties: T45 B, 2 of 2, **one domain** (Les Miserables);
    - yes/no on every layer of a folder: T48, 6 of 6, two domains;
    - read, not built (T50): text on lesmis-poster only, number on volunteers-thanks only.
      Looked for and not found: an "at least" number match (T45 B, T50 B), a way to style every find
      match at once (T40, T41 A).
- **Edges looked for on the Node tab first (T45):** 0 of 4 recorded.
- **The purple token (question 3):** T46: 1 of 4 touched it (r1-s41, a click on the folder's Fill
  Color strip; nothing changed); T47: 0 of 6 touched it, three B readers saw it on the folder and
  left it. No session painted every cluster one color. The picker on a folder: T48 6 of 6.
- **Routes:** T47 folder 4, around 2 (both A); T48 folder 6. T38 B r1-s28 went by a selection.
- **Analysis filter words (T46 to T48):** B halves, where the prompt says "clusters": `cluster` in
  8 of 8 (prompted). A halves, unprompted: `group` 3, `commun` or `communit` 3 (one first typed
  `community`, which finds nothing), `louvain` 1 (Alex), `modularity` 1 (Dev).
- **How a change was reversed (question 4, T49):** the Undo arrow 3 (r1-s45, s47b, s48), the old
  hex typed back 1 (r1-s46, Alex, who had memorized it). Control+Z 0, a removed line or layer 0.
- **Reading a colleague's layer (question 5, T50):** `Read from: rule` 4 of 4. On A, the people the
  rule picks were named by clicking dots, one by one (the Values tab lists ids and went unnoticed).
- **A color per kind (question 6, T51):** 4 of 4 named the board's or the companies' color from the
  key; three said the key covered a node.
- **First place looked for the nodes' color, after the graph opened:** the Graph inspector's Style
  tab in 9 sessions on 5 halves (design problem 4); the second place, in each, was the layer list's
  "Everything", matched by its count to the node count.
- **Steps against the key:** at the key's length on T39, T41, T47, T48; over it on T40 (20 against
  13 to 16), T43 (8.5 against 6), T46 (15.5 against 12), T50 (5 against 2 to 3), T51 (7 against 5).
- **Script and console errors on success paths:** not measured. Every copied `session.log` is
  empty; whether `real.mjs` writes page errors there was not checked.
- **What worked:** a layer built in the picker reached the right nodes in every session that
  built one (22 of the 24 picking sessions on T38, T40, T41, T45 and T48; the other 2 started from
  the find box); typing a color word worked every time it was tried (r1-s02 "orange", r1-s12
  "purple"); the Undo arrow's name ("Undo changing node color on
  Everything") let readers trust it; T50's rule chips were read correctly by all four; no reader
  painted every cluster one color through the token.

## Candidate insights (for the skeptic check)

1. **The layer list is not where a newcomer looks first for the nodes' look.** 9 sessions on 5
   halves opened the Graph inspector's Style tab first and found only canvas settings; each
   recovered by matching "Everything 77" to the node count. Success hides a door that only a
   number match opens. (Design problem 4; r1-s01b, s03b, s05b, s33, s34, s36, s54, s55, s56.)
2. **Color entry is the slowest part of the first styled graph.** Both T39 A pointer sessions
   spent 2 to 3 steps on the hue bar (lime, mint, then dark green), where every T39 B session typed
   into the box (one word, two hex codes from memory) and finished in 5 to 6 steps. About 20
   sessions on 12 halves said nothing told them a word works; a dark green has no hex a newcomer
   remembers. The capability exists and is invisible. (Bar 4 table; design problem 1.)
3. **Leaving the purple token alone is not the same as reading it.** Question 3's trap never fired
   (0 of 10 painted every cluster one color), yet 6 sessions on 5 halves called `<<Layer>>`
   unreadable and went around it. The bars count avoidance as understanding. (Design problem 8;
   `Token:` lines.)
4. **A shorter route competes with the bulk route.** On T47 A, the Everything layer sets Box in 9
   steps against the folder's 11, and 2 of 3 took it; all 3 B sessions used the folder. Bar 1's
   bulk-route share partly measures path length. Separately, the B prompts' "clusters" was typed
   by 8 of 8; the A readers' own words were "group" and "commun", and "community" whole finds
   nothing (build defect 5).
5. **Starting from the find box leads away from a rule.** Readers who began with the find box
   ended with a fixed id list named by its count (r1-s28 T38 B, r1-s31 T41 A), or could not act on
   all matches (T40 A and B). The find box is the natural first move for "who" questions.
6. **Checking a layer's result is done by eye.** No names on the drawing, members listed by id, and
   a table that marks no rows sent readers to cross-check 24 rows by hand (T41 A and B, T50 A and
   B). Every session still succeeded; the cost is in steps and doubt.
7. **A new line that starts at the current value looks broken.** Fill Color at `6366F1` and Width at
   8 both "add" a line that draws nothing new (9 sessions on 5 halves). Readers could not tell
   whether the line took effect.
8. **Keyboard success comes at 3 to 20 times the pointer cost**, nearly all of it on the start page
   and in finding focus (bar 7 section).
9. **The round is near its ceiling.** 55 of 56 succeeded with median wrong turns of 1 or less. The
   signal is in cost (steps over the key on five tasks), in the problems above and in the routes
   taken, not in success; next round's tasks and keys should be read for leading before more
   sessions are spent on the same ceiling.
10. **One color table decides both a grade and what the app says.** `colorWord` calls `FFD700`
    "gold" (an F on T49 B), `#be0032` "pink" and `#f99379` "red", while `F16363`, a salmon, is
    "red" (an S on T49 A). The app speaks the same names to screen-reader users (expert finding 10).

## Scoring tools: what was wrong and is owed

- `score.mjs` bar 4 takes the start page's demo as the start, so it reports the sample opening as
  the first styled graph (median 3; correct 6), Sam's 20 (correct 35) and "other tasks' median 1".
  It should take the start from the first `styles-steps.jsonl` line after the graph opens, as
  `../../answers.md` already does for T49.
- `sessions/r1-s06b/grade.md` does not start with the three grade lines, so `score.mjs` dropped it
  (T39 printed 5 of 5); it is S with 0 wrong turns and no false done, counted by hand here. The
  eleven VOID grade files also lack the lines; their `b` re-runs replace them.
- `../../backlog.md` rows carry no severity, although the criteria's 2026-10-20 entry says they do;
  bar 5's known 3s rest on the three items preflight 4 names.
- `colorWord` was read from `compact-mantine/dist`; `compact-mantine/src/utils/color-utils.ts` is
  unchanged since 758b8e8081.
- Owed before the skeptic check counts bar 5: repros for candidates 9 and 10; the skeptics' ruling
  on the severities of candidates 1 to 8.
