# Round 4: what the study found

Round 4 tested the navigation rebuilt after the owner's review (`../../owner-feedback.md`): the
rail lists what a project owns (Graph, Data, Notes, Assistant), styles and results are read in
the right panel and the bottom table, there is no Results place on the rail and no avatar, and a
Data panel holds data coming in, its versions and what leaves the project.

Four methods, all with simulated participants built from the persona files in `../personas/`:

- **Tree test** (`tree-test.md`, answers in `tree-test/`): 16 personas, 14 tasks, text tree only.
- **First click** (`first-click/`): 16 personas, 9 prompts on three still screens
  (`../../shots/round-4-fc-nav-*.png`).
- **Think-aloud sessions** (`sessions/`): 58 sessions, 18 tasks, 17 of them repeated from round 3.
- **Focus groups** (`focus-groups/`): where results live, the Data panel as a place, and styles
  beside the selection.

Treat every finding as a hypothesis to confirm with real people. Sixteen simulated participants
share blind spots, so a failed task is a strong signal and a passed one a weak signal.

How to read this page:

- **Severity** is Nielsen's scale: 0 not a problem (used for things to keep), 1 cosmetic, 2 minor,
  3 major, 4 catastrophe (the task cannot be done, the user leaves, or the user would report a
  wrong answer without knowing).
- **Observed** means the participant did something: picked the wrong place, stopped, nearly copied
  a wrong number, failed. **Said** means an opinion. Behaviour outranks opinion: a finding
  supported only by opinion has its severity held down by one. **Confirmed** means observed in at
  least two participants.
- **Sessions** counts think-aloud sessions; **participants** counts distinct personas. Tree-test
  and first-click counts are given separately and never added to session counts.
- Problems caused by the mocks are in Part 1 and are not counted against the design.
- Four session files in `sessions/` (who-matters with Maren, worth-an-afternoon with Alex, and
  data-stays-here with Dr. Chen and with Sarah) come from an earlier, abandoned run of this round
  and are not counted here.

---

## Did the round meet its bar?

The bar was set before the round, in `tree-test.md` and the round plan.

| Test | Bar | Result | Met? |
|---|---|---|---|
| Tree test, every task | at least 70% correct and 55% direct | 9 of 14 tasks pass; task 3 (a run's settings), 4 (the whole ranking), 6 (a team's style file), 8 (next month's file) and 11 (a picture for a paper) miss | No |
| Tree test, the four result tasks | each at least 70% correct and 70% direct, or Results return to the rail | task 1 passes (100%, 75%); task 2 (75%, 63%), 3 (81%, 0%) and 4 (69%, 69%) miss | No |
| First click, every prompt | at least 70% | 8 of 9 pass; "send the co-author a picture" is 2 of 16 (13%) | No |
| First click, start a ranking | at least 70%, or draw a Measure... toolbar button | 15 of 16 (94%) | Yes: no toolbar button needed |
| Think-aloud, severity | no confirmed severity 3 or 4 finding | 22 confirmed severity 3 or 4 design findings (Part 2) | No |
| Think-aloud, ease on the 17 repeated tasks | mean at least 3.80 (round 3) | 4.17 | Yes |
| Think-aloud, ease on the 14 not spoiled in round 3 | mean at least 3.96 | at least 3.99 whichever three are left out (4.32 without flagged account, keyboard walk and top 200) | Yes |

**Results and the rail.** By the rule set before the round, Results go back to the rail. The
evidence does not say a rail place would fix what failed:

- In tasks 2 and 4 every miss landed in the bottom table itself: 4 picked the table's Search to
  find Valjean's row, 5 picked a column header's sort to get the ranking. Both are where the job
  is done; the answer key simply named a different node. Scored that way, task 2 is 100% correct
  and 88% direct and task 4 is 100% and 100%.
- Task 3 fails because 13 of 16 looked for a run's settings on the weight column in the Data
  panel. A Results button on the rail would not change where people think settings live.
- The owner asked (`owner-feedback.md`, item 4) whether the right panel and the bottom table
  should be responsible for exploring results. All 5 focus-group participants said they would read
  results in the table.

Recommendation: record in the decision log that the pre-set bar was missed and why, keep Results
off the rail as a studio decision, and settle it in round 5 with an A/B tree test (Results on the
rail against the right panel and table) using the corrected answer key and the "Used by" link in
finding 5. Do not quietly move the goalposts: if round 5 misses again, Results return.

**One pre-round mock fix was not made.** The at-rest first-click screen already shows the
betweenness column with Valjean's row highlighted (`../../shots/round-4-fc-nav-new.png`), which the
tree-test plan asked to remove. 7 of 16 answered "Valjean's score" by clicking that cell, and the
one miss on "start a ranking" was a click on that column's header. Read both prompts as
optimistic.

---

## Tree test

Correct and direct as defined in `tree-test.md`. "First place opened" is the top-level place each
participant opened first.

| # | Task | Correct | Direct | First place opened | Where the misses went |
|---:|---|---:|---:|---|---|
| 1 | Start a second ranking | 16 of 16 (100%) | 12 (75%) | Main menu > Algorithms 14, canvas toolbar 1, right panel 1 | none; 3 backed out of Algorithms because they did not know the names and used Results > Run a measure |
| 2 | Valjean's score and place | 12 (75%) | 10 (63%) | bottom table 11, right panel 5 | 4 to the table's Search (reads his row) |
| 3 | Which settings and edge column a run used | 13 (81%) | 0 (0%) | Data > Sources > Its columns 13, Main menu > Algorithms 3 | 3 stayed on the weight column in Data |
| 4 | Every score in one sorted list | 11 (69%) | 11 (69%) | bottom table 16 | 5 to a column header's sort |
| 5 | Change one of two clashing colors | 15 (94%) | 12 (75%) | canvas legend 11, right panel 2, main menu 3 | 1 to the Style stack's Look (High contrast) |
| 6 | Bring in a team's style file | 10 (63%) | 1 (6%) | Main menu > File 10 | 4 to Main menu > Recipes > Apply a recipe, 2 to Style stack > Add a layer; 9 of 16 opened Recipes and 6 opened Add a layer on the way |
| 7 | Take out only the wrong middle filter step | 16 (100%) | 15 (94%) | filter chip 13, Main menu > Edit 3 | none, but see the note below |
| 8 | Next month's file, keeping the setup | 13 (81%) | 6 (38%) | Main menu > File 10 | 3 chose File > Open..., which starts a new project and loses the setup |
| 9 | Attach a list of account owners | 16 (100%) | 14 (88%) | Data 14, bottom table 2 | none |
| 10 | The network before this month's file | 16 (100%) | 14 (88%) | Data 13, project name menu 3 | none |
| 11 | A picture for the paper | 16 (100%) | 2 (13%) | Main menu > File 14 | none; 14 of 16 looked in File first and found nothing |
| 12 | The ranked list as a spreadsheet | 16 (100%) | 16 (100%) | bottom table 14, project name menu 2 | none |
| 13 | Has anything left this computer? | 15 (94%) | 13 (81%) | the line under the project name 11, Data 3, main menu 2 | 1 to Project info... |
| 14 | Why these five accounts were kept | 16 (100%) | 14 (88%) | Notes 13, right panel 2, Main menu > Selection 1 | none |
| | **All tasks** | **201 of 224 (90%)** | **140 (63%)** | | |

- **Task 7's key is too generous.** Three participants (the alert reviewer, Elena, the recipe
  recipient) chose Edit > Undo history, which the key counts as correct. In the alert reviewer's
  think-aloud, "Undo back to here" on the middle step also removes the third step, the one to keep.
  Without that route task 7 is 13 of 16 (81%), still a pass.
- **Compared with round 3.** Round 3's tree test was three think-aloud sessions on five jobs, so
  only direction can be compared. The jobs round 3 could not place now pass: attaching a table
  (100%), an older version (100%), "anything left?" (94%, round 3 finding 26), and a note on kept
  accounts (100%, against 1 of 2 on round 3's first click). The weekly update's home (round 3
  finding 18) is still weak: 81% correct but 38% direct, because people start in File.

## First click

| # | Prompt | Correct | Where people clicked | Mean confidence (1-7) |
|---:|---|---:|---|---:|
| 1 | Add a second way of ranking | 15 of 16 (94%) | "+" on the right panel's Results 15; betweenness column header 1 | 4.3 |
| 2 | How Valjean places on the earlier run | 16 (100%) | right panel Results row 9; the table's betweenness cell 7 (shown before it should be) | 5.9 |
| 3 | Change group 8's color | 16 (100%) | legend swatch 13; Style stack "Group color" 3 | 4.5 |
| 4 | Why Valjean is drawn this big | 16 (100%) | "Size: degree" under Appearance 16 | 5.3 |
| 5 | Bring in a corrected file, keep the colors | 15 (94%) | Data on the rail 14, project name 1; main menu (File > Import) 1 | 4.3 |
| 6 | Send the co-author a picture | 2 (13%) | main menu 13, a saved view 1; project name 2 | 3.3 |
| 7 | Has anything left the computer? | 16 (100%) | the line under the project name 16 | 6.0 |
| 8 | Note why Friends of Valjean was kept | 16 (100%) | Notes on the rail 10; the set's row 6 | 4.6 |
| 9 | Settings of the earlier bridge run | 16 (100%) | the Bridges row under Results 16 | 4.6 |
| | **All prompts** | **128 of 144 (89%)** | | |

The "+" on Results works (prompt 1, 94%), but its confidence is the second lowest: 10 of 16 said
they were guessing. Picture export is the one clear failure, and it agrees with tree-test task 11.

## Think-aloud: task success and ease

Outcome codes: **success** (done, unaided), **with difficulty** (done after a wrong turn, a guess
or a step-in), **failed**. SEQ is the Single Ease Question, 1 (very hard) to 7 (very easy).

| Task | Sessions | Success | With difficulty | Failed | Mean SEQ | Round 3 | Change |
|---|---:|---:|---:|---:|---:|---:|---:|
| Who matters most, and how sure are you? | 4 | 0 | 4 | 0 | 4.50 | 4.40 | +0.10 |
| What groups are there, and how does the biggest differ? | 3 | 0 | 3 | 0 | 4.33 | 4.75 | -0.42 |
| The edges carry a number: rank, and trust it? | 4 | 0 | 4 | 0 | 3.75 | 4.00 | -0.25 |
| Amount: cheapest route and most central, and what each used | 3 | 0 | 2 | 1 | 3.33 | 3.33 | 0.00 |
| Follow money forward from early August | 3 | 0 | 3 | 0 | 4.00 | 2.50 | +1.50 |
| A black-and-white fold-change figure; which genes went up | 3 | 0 | 3 | 0 | 4.33 | 3.00 | +1.33 |
| A figure a reviewer can read in gray | 3 | 1 | 2 | 0 | 5.00 | 3.00 | +2.00 |
| Use a colleague's recipe on your gene list | 3 | 0 | 3 | 0 | 4.33 | 4.67 | -0.33 |
| Top 200 by betweenness past the drawing limit | 3 | 0 | 3 | 0 | 3.33 | 2.00 | +1.33 |
| Clear or refer a flagged account | 3 | 0 | 2 | 1 | 3.00 | 2.00 | +1.00 |
| Is it OK to use with our data? | 4 | 0 | 4 | 0 | 4.50 | 5.20 | -0.70 |
| A colleague's file: worth an afternoon? | 4 | 0 | 4 | 0 | 3.75 | 4.00 | -0.25 |
| Update with this month's file; why did the group count change? | 3 | 0 | 3 | 0 | 4.00 | 3.50 | +0.50 |
| Leave yourself a note on why you kept these accounts | 3 | 0 | 3 | 0 | 4.67 | 4.33 | +0.33 |
| Keyboard only: find Javert, walk, select two | 3 | 0 | 2 | 1 | 4.00 | 4.33 | -0.33 |
| Get back after an unexpected change | 3 | 0 | 3 | 0 | 4.67 | 4.80 | -0.13 |
| Fix the wrong middle filter step, keep the third | 3 | 2 | 1 | 0 | 5.33 | 4.75 | +0.58 |
| **Repeated from round 3 (17 tasks, unweighted)** | **55** | **3** | **49** | **3** | **4.17** | **3.80** | **+0.37** |
| Two groups in colors you cannot tell apart (new) | 3 | 0 | 2 | 1 | 2.67 | -- | -- |
| **All of round 4** | **58** | **3** | **51** | **4** | **4.09** (per session) | | |

- **54 of 58 finished (93%); 3 of 58 (5%) without a wrong turn** (round 3: 93% and 12%). The drop
  in unaided success comes from harder, more specific tasks and from the mock problems in Part 1,
  not from a measured loss of ease: the same 17 tasks rose from 3.80 to 4.17.
- **What moved up:** the reviewer's gray figure (+2.0, and the round's one unaided figure), the
  forward money trace (+1.5), the signed gray figure (+1.3), past the drawing limit (+1.3), the
  flagged account (+1.0, still the lowest repeated task). Fixing the wrong middle step is again the
  easiest task (5.33).
- **What moved down:** is it OK to use (-0.7: the page now shows its undecided questions as blanks,
  finding 2), groups differ (-0.4), the recipe (-0.3), the keyboard walk (-0.3, Javert still
  missing from the walk page). The new restyle task is the hardest of the round (2.67, one failure).
- **The four failures:** Expert Emma on amount end to end (would have run the path on a guessed
  weight reading, finding 1); Sarah on the flagged account (the named account never reaches a
  screen, Part 1); the screen-reader analyst on the keyboard walk (Javert is not on the walk page,
  Part 1) and on the restyle (colors have no names, finding 10).
- SEQ from simulated participants is not calibrated against real users. Compare tasks and rounds
  with each other, not with published norms.

---

## Part 1: problems caused by the mocks

These cost the round signal but are not evidence about the design. Two of them were Part 1 items
in round 3 and are still open.

### Mock 1. Counts and run records still disagree between mocks (unfixed from round 3)

- **What happens:** the open dialog says 300 proteins with GSK3B and NOTCH1 loaded unconnected; the
  project then says 298 nodes and 1 component, and "no numeric edge column" after confidence was
  read as numbers. The weekly replay says 1 component and 12 communities (was 11) on one page and
  27 components and 65 (was 35) on another for the same April file. The recipe dialog says 85 of
  96 after "Use MDM2"; the applied screen says 84. The sampled betweenness is Directed on the state
  line and undirected in its run record. Also: the same run as CPU and as WebGPU; a keyboard card
  naming MSH2 with TP53's numbers; one note with three dates; two dates for each data version.
- **Severity for the study:** 4. Participants stopped trusting every number on the screen, and
  four task results (worth an afternoon, weekly update, recipe, top 200) are partly about the
  fixtures, not the design.
- **Evidence (observed):** 18 sessions, 12 participants: worth-an-afternoon (all 4), weekly-update
  (all 3), use-colleagues-file (all 3), top-200-past-limit (all 3), who-matters (the Gephi
  holdout), quiet-weight-trap (Chris), keyboard walk (Emma), remember-why (Alex, Marcus).
- **Fix:** round 3 asked for one fixture object per state and a check that fails when two mocks of
  one state disagree. It was not built. Build it before round 5; nothing else in this list costs
  as much signal.

### Mock 2. The rebuilt navigation reached only some mocks

- **What happens:** the navigation, first-click and Data panel screens have the new rail; most task
  screens (results panel, run-and-read, colour-by-value, table dock, notes, past the limit, the
  alert pages) still show Results on the rail, an Export files button, styles in the left panel and
  a letter avatar that changes (M, A, C, N, S). The navigation page renders as a blank white page in
  the participant view, and its full view is a designers' before-and-after page.
- **Severity for the study:** 3. This was the round meant to test the new navigation; in the
  think-aloud it was mostly seen beside the old one. Participants asked "which one is real?" and
  some looked for Export where it no longer is.
- **Evidence (observed):** mixed chrome in about 24 sessions across 15 participants; the blank
  navigation page in 12 sessions, 9 participants (quiet-weight-trap Alex; weight-end-to-end Emma
  and Priya; gray-figure Maren; top-200 Emma; worth-an-afternoon Tom and Jordan; weekly-update Dana;
  remember-why Marcus; keyboard walk Emma; restyle Jordan; fix-wrong-middle-step Min-ji).
- **Fix:** move every task screen to the new shell before round 5, and take navigation.html off
  participants' screen lists (it is a review page).

### Mock 3. The task's dataset or target is not on the screens

- **What happens:** clicking the Les Miserables betweenness result opens a protein panel, and
  Compare rankings opens payments; the keyboard walk page still has no Javert; after Add data the
  flagged account ACC-705989 never appears, so no evidence for it can be exported; centrality on
  transfers is drawn only on proteins; the Data panel ignores the protein task and shows payments.
- **Severity for the study:** 4 for the flagged account and the keyboard walk, where three of the
  four failures trace to it; 3 elsewhere.
- **Evidence (observed):** about 20 sessions: flagged-account (all 3), keyboard walk (all 3),
  who-matters (Alex, Elena), weight-end-to-end (Emma, Priya), groups-differ (Maren, Jordan),
  worth-an-afternoon (Elena, Tom, Jordan), dated-trace (Sarah, Marcus).

### Mock 4. Controls the task needs do nothing or show no choices

- "Change..." beside the weight and the Options icon are inert (quiet-weight-trap, all 4); the
  "a higher number means" list never opens (weight-end-to-end, all 3; the load popover, Emma); no
  weighted path or weighted Les Miserables run is drawn; "Change color..." and the color after it
  are not drawn for run groups (restyle, Jordan and Morgan); Details next to the engine does
  nothing (who-matters, the Gephi holdout).
- **Severity for the study:** 3. The weight tasks could not test the thing they were built for.

---

## Part 2: design findings, most severe first

### 1. What a bigger weight means is set once per column, cannot be seen, and defaults the wrong way for cost

- **What happens:** the amount's meaning is one setting for the whole project ("Applies to every
  result that reads amount"). Its default, "a closer or stronger link", makes the cheapest route
  prefer big transfers, the opposite of cheapest. The other readings are never shown. On Les
  Miserables nobody could see whether "value" would be read as a strength or a length. A task
  that needs amount as a cost for the path and as a strength for centrality cannot be done.
  No catalog entry ranks by weighted degree (strength), the obvious ranking for a count weight.
- **Severity:** 4. Observed: Emma failed rather than run on a guess; Priya caught the inversion
  only through the plain-language line; Sarah found the conflict herself and stopped trusting the
  centrality answer; all four weight-trap participants could not produce or check a weighted
  ranking. "If I'd just clicked through, this would have found me the most expensive-looking route
  and called it the shortest." (Priya)
- **Evidence:** 7 sessions, 7 participants: weight-end-to-end (Emma, Sarah, Priya),
  quiet-weight-trap (Alex, Min-ji, the Gephi holdout, Chris). Weighted degree missing: the Gephi
  holdout and Chris (both named it first).
- **Mock part:** the dropdown and Change... are inert (Mock 4). The per-column scope is design.
- **Recommendation:** ask what a larger value means per run, prefilled from the column's default
  and saying what each answer does to this measure ("big amount = costly step: the route avoids
  large transfers"); show every choice; show the weighted result with its total. Add weighted
  degree. The reading must be a graphty-element run option, not an app translation.

### 2. The "Where your data goes" page leaves blank exactly what an approver asks first

- **What happens:** who hosts graphty and in which country, whether it collects usage statistics
  or crash reports, whether an organization can run its own copy or turn the Assistant off for
  everyone, and who to contact are all undecided; in the participant view they read as a label and
  a colon. Nothing says whether browser storage is encrypted. The Assistant is switched on per
  person with their own key, so one analyst can send a shared case's node names out.
- **Severity:** 4 for the task. Observed: all four participants could decide "not yet" but none
  could decide "yes". "A blank after a colon on a privacy page is worse than a yes. IT will assume
  yes." (Dana)
- **Evidence:** 4 sessions, 4 participants: data-stays-here (Marcus, Priya, Alex, Dana).
  Per-person Assistant: Marcus, Priya, Dana. Encryption at rest: all 4.
- **Recommendation:** write "Not decided yet" where a decision is missing, never an empty colon.
  Hosting, telemetry and an organization-wide Assistant switch are policy decisions for the owner;
  bring them to the next milestone as questions (none is answered in `owner-feedback.md`).

### 3. The legend is where people change a color, but clicking it selects the group

- **What happens:** asked to fix two clashing colors, people go to the legend; a click there
  selects the group. From the selection the only route found was "+" beside Appearance, which adds
  a hand-made layer on top instead of changing the group's color. For groups written by a run the
  layer is locked behind "Edit a copy", and nothing says what a re-run does to the copy. The color
  picker's quick swatches are the palette that caused the clash.
- **Severity:** 3. Observed across three methods: 12 of 16 chose the legend in the tree test,
  13 of 16 clicked a legend swatch on first click, and Elena and Jordan clicked it in the think-
  aloud and got a selection. The restyle task is the round's hardest (2.67).
- **Evidence:** 3 sessions, 3 participants (restyle: Elena, Jordan, Morgan); tree test task 5;
  first-click prompt 3; focus group on styles (theme 5).
- **Recommendation:** a legend entry's click (or its menu) offers Change color..., which edits
  that value on the layer that paints it, run layers included, with the change kept across a
  re-run. Offer unused colors first in the picker.

### 4. High contrast and Print are read as the fix for two close colors

- **What happens:** "High contrast" and the Print look's "for color-blind readers" read as the cure.
  Elena switched the whole project to High contrast; its promise is contrast against the canvas,
  not between groups, and Print only adds shapes to signed colors, not to categories.
- **Severity:** 3. Observed: Elena changed the project's look and was unsure switching back
  restored it; Jordan and Morgan could not tell whether either would separate the two blues.
- **Evidence:** 3 sessions, 3 participants (restyle, all three). The Gephi holdout asked the same
  of Print for categorical figures (figure-for-reviewer).
- **Recommendation:** say on each look what it changes and what it does not ("contrast of every
  color against the background; does not separate colors from each other"); flag two categories
  that are too close, in the legend, with a Fix... that picks a distinct color.

### 5. A run's settings are looked for on the data column, not on the result

- **What happens:** asked which settings and edge column an earlier calculation used, 13 of 16
  first opened the weight column in the Data panel; 3 stayed there. The column shows today's
  weight state but not which runs read it or how.
- **Severity:** 3. Observed: tree test task 3, 0 of 16 direct. In sessions the Gephi holdout
  found the run's settings only in a column-group header "by accident".
- **Evidence:** tree test task 3; 2 sessions (who-matters, the Gephi holdout; quiet-weight-trap,
  Min-ji).
- **Recommendation:** under each numeric column in Data, list "Used by" with each run and how it
  read the column, each opening that run's Details. People then find settings from where they look.

### 6. A copied ranking loses its weight and its scope

- **What happens:** the table's betweenness column, the inspector's "0.57, highest" and the Top
  nodes list do not say whether the weight was used or what the run covered. On Les Miserables the
  results panel shows a filtered run (60 of 77, Myriel gone) while the table shows the full graph.
  The CSV header drops "confidence used as similarity".
- **Severity:** 3. Observed: Alex nearly emailed the filtered top five ("If I'd copied the top five
  from the panel into my email I'd have sent the filtered ones"); the Gephi holdout could tell
  weighted from unweighted only by remembering NetworkX's numbers.
- **Evidence:** 7 sessions, 7 participants: quiet-weight-trap (Alex, Min-ji, the Gephi holdout,
  Chris), weight-end-to-end (Emma, Sarah), who-matters (Jordan). Focus group on results (theme 2,
  3 of 5 independently).
- **Recommendation:** every result column header and every Top nodes list carries one short line:
  weight reading and scope ("value not used; full graph, 77"). The line travels into CSV headers.

### 7. Export and "Update with new data" are looked for under File, and are not there

- **What happens:** File holds Open, Open sample and Connect. Asked for a picture, 14 of 16 opened
  File first; on the still screen 13 of 16 clicked the main menu. Asked to bring in next month's
  file, 10 of 16 opened File first and 3 chose File > Open..., which starts over and loses the
  setup, the round-3 failure the Data panel was drawn to fix. The same action is also named
  "Replace data..." on the weekly screens and "Update with new data..." in the Data panel.
- **Severity:** 3. Observed: first-click prompt 6 at 13%; tree test task 11 at 13% direct and task
  8 at 38% direct. In sessions Dana chose Add data first and was saved only by the same-columns
  warning; the Gephi holdout, Dana and Jordan said they would not open a project's name to export.
- **Evidence:** tree test tasks 8 and 11; first-click prompt 6; 6 sessions, 5 participants
  (figure-for-reviewer: the Gephi holdout; worth-an-afternoon: Dana, Jordan; weekly-update: Dana,
  Min-ji, Sarah). Focus group on the Data panel (theme 4).
- **Recommendation:** keep the Data panel as the home of data management. Add File > Export... and
  File > Update with new data... as routes into the same dialogs, and use one name, "Update with
  new data...", everywhere. File > Open... on an open project should ask "Update this project, or
  open as new?".

### 8. A team's style file has no way in that people find

- **What happens:** the only place is Data > Recipes and style files. People look under Main menu
  > Recipes and under the Style stack's Add a layer.
- **Severity:** 3. Observed: tree test task 6, 63% correct and 1 of 16 direct; 9 of 16 opened
  Recipes and 6 opened Add a layer on the way; 6 ended in one of them.
- **Evidence:** tree test task 6; focus group on the Data panel ("Recipes applied" and "Style
  files" not understood, 5 of 5 in round 1).
- **Recommendation:** Add a layer offers "From a style file..."; Main menu > Recipes becomes
  "Recipes and style files" with "Bring in a style file...". Say in one line what a style file is.

### 9. Close scores get distinct ranks with nothing saying they are close

- **What happens:** Marius 0.132 and Fantine 0.130 are #4 and #5; Myriel 0.177 and Gavroche 0.165
  #2 and #3. Degree ties show "=", continuous near-ties show nothing. The 1% tie line appears only
  on some result states, is not explained or adjustable, and reads as a verdict. The same value is
  shown as 0.13 and 0.132.
- **Severity:** 3. Observed: all four who-matters participants judged "how sure" by eye.
  "I'd call it a coin flip. But that's me eyeballing it, the tool isn't telling me." (Jordan)
- **Evidence:** 7 sessions, 6 participants: who-matters (Alex, Elena, the Gephi holdout, Jordan),
  quiet-weight-trap (Min-ji, the Gephi holdout, Chris).
- **Recommendation:** mark near-ties in the table's rank column itself ("#4, near #5"), state the
  tie line once with who set it and let it be changed, and show one precision everywhere. The
  near-tie test belongs in graphty-element with the result.

### 10. Colors have no names, so a screen-reader user cannot restyle at all

- **What happens:** the legend, value rows, picker swatches and inspector read a group's name and
  count but never its color; nothing flags two colors as too close; the picker's color field
  announces nothing usable; no confirmation says what changed.
- **Severity:** 4. Observed failure. "If it said 'Ribosome, sky blue, 56' and 'Spliceosome, dark
  blue, 32' I could have done steps one to three without you." (Morgan)
- **Evidence:** 1 session, 1 participant (restyle, Morgan), the only screen-reader persona. Not
  confirmed by the two-participant rule by design of the panel; confirm with real screen-reader
  users, but do not wait to name colors.
- **Recommendation:** every color has a spoken name everywhere it appears; the too-close flag from
  finding 4 is announced; a change announces "Ribosome is now orange".

### 11. Past the drawing limit, the easy route answers a different question

- **What happens:** the only suggested "top rows" step keeps the most cited patents, not the most
  in between. On a sampled run nothing says where rank 200 stops being firm; "Exact, on 5,318
  nodes" names no set; a Neighbors step added after Keep top 200 may search only inside the 200.
- **Severity:** 3. Observed: all three had to reason out the traps themselves; Min-ji and Chris
  said a hurried user would hand back the most-cited patents (said; held at 3).
- **Evidence:** 3 sessions, 3 participants (top-200: Min-ji, Emma, Chris).
- **Recommendation:** after a run, suggest Keep top rows by that run's column; show "row 200 is
  within the error bound of N more" on sampled results; name the 5,318; show Neighbors' scope as
  "full graph" or "the kept 200" before it runs.

### 12. Money cannot be followed forward in time

- **What happens:** nothing follows a transfer forward ("out, after Aug 5"); Neighbors at two hops
  gives 283 accounts; the Path tool needs a named end and finds fewest hops, not a time-ordered
  route; it flags only the hop earlier than the row above it.
- **Severity:** 3. Observed: all three built the forward trace by hand from the table.
- **Evidence:** 3 sessions, 3 participants (dated-trace: Sarah, Marcus, Nadia).
- **Recommendation:** a forward trace from a dated transfer (each next transfer later than the
  previous), and time-order flags against every earlier hop on the path.

### 13. Money has no totals

- **What happens:** a path shows no total amount; a tie ("1 of 2 as short") does not say which
  route moved less; an account shows counts in and out but not dollars; no selection total.
- **Severity:** 3. Observed: four participants added amounts by hand; Sarah found the route shown
  first was the more expensive of two ties.
- **Evidence:** 7 sessions, 4 participants: dated-trace (Sarah, Marcus, Nadia), flagged-account
  (Nadia, Sarah), weight-end-to-end (Sarah, Priya).
- **Recommendation:** totals on a path, on a selection of edges, and in and out per account; a
  ranking by money in and out.

### 14. Money edges have no arrowheads

- **What happens:** on transfer graphs the canvas draws no direction, so who paid whom is only in
  the table.
- **Severity:** 3. Observed: Nadia abandoned the canvas and read only the table.
- **Evidence:** 2 sessions, 2 participants (dated-trace: Nadia, Marcus).
- **Recommendation:** draw arrows on directed graphs by default.

### 15. An account found in another project cannot be used as evidence

- **What happens:** search covers 7 recent projects first; the case that decides the alert is
  behind "Search all 23". A hit gives a project name ("Mule ring, Aug 12") with no owner, year,
  time range or alert facts. "Bring in its links" copies another month's transfers into this one
  with no mark of where each row came from. There is no clear or refer control.
- **Severity:** 3. Observed: Nadia had to search twice; Sarah declined to bring links in; none of
  the three could cite the hit. Priya: "A tier-1 working the queue at 3 a.m. clears on the March
  hit and never clicks it." (said, held at 3)
- **Evidence:** 3 sessions, 3 participants (flagged-account: Nadia, Sarah, Priya).
- **Recommendation:** search all projects by default when the id is not in this one; show owner,
  dates and alert facts on a hit; mark brought-in rows with their source project; offer Open
  beside this project as the default.

### 16. The Print look's "no change" band is chosen for the user and cannot be changed

- **What happens:** values within 0.25 of 0 are printed as "no change" in the figure's legend and
  methods text; nothing shows where it was set or how to change it.
- **Severity:** 3. Observed: four participants looked for the control and did not find it.
  "Who picked 0.25? I didn't." (Maren)
- **Evidence:** 5 sessions, 4 participants: gray-figure-signed (Dr. Chen, Maren, Emma),
  figure-for-reviewer (Maren, the Gephi holdout).
- **Recommendation:** a visible, editable threshold in the export dialog, off by default, named as
  "drawn as no change below" rather than a statistical claim.

### 17. The same figure carries two sets of counts

- **What happens:** the Screen legend says 148 below 0 and 152 above; the Print legend and gray
  check say 120 down, 133 up, 47 no change. The methods text explains it once, not on the figure.
- **Severity:** 3. Observed: Maren and Emma stopped to reconcile; Jordan predicted the reviewer's
  email.
- **Evidence:** 4 sessions, 3 participants: gray-figure-signed (Maren, Emma), figure-for-reviewer
  (Jordan, Maren).
- **Recommendation:** one set of counts per figure; the Print legend states its band next to its
  counts.

### 18. "Which genes went up the most" has no direct answer

- **What happens:** labels and the table rank by absolute change, mixing up and down; the hidden
  label is MRE11, a top increase; specific genes (TP53) cannot be forced into the figure.
- **Severity:** 3. Observed: all three read the answer off node colors; Maren could not tell the
  sign of three labelled genes.
- **Evidence:** 4 sessions, 3 participants: gray-figure-signed (Dr. Chen, Maren, Emma),
  figure-for-reviewer (Maren).
- **Recommendation:** label and sort options "largest increases", "largest decreases", "largest
  either way", and a "Always label" list; never hide a label that ranks in the chosen top N.

### 19. A stray click loses the selection, and Ctrl+Z takes a filter step instead

- **What happens:** a click on empty canvas clears the selection with no visible message; the only
  trace is a grey line above the table. Ctrl+Z undoes the last filter step, because clearing a
  selection is not an undo step. Undo history lists only filter steps. From three filter steps,
  Undo and "Undo back to here" on the middle step both remove the third.
- **Severity:** 3. Observed: Alex, Dana and the Gephi holdout each pressed Ctrl+Z first and lost a
  filter step they wanted, recovering only through Redo; Nadia avoided it only because she read
  the menu first. Round 3's finding 20, unfixed.
- **Evidence:** 4 sessions, 4 participants: get-back (Alex, Dana, the Gephi holdout),
  fix-wrong-middle-step (Nadia).
- **Recommendation:** show a brief notice when a click clears a selection ("Selection cleared.
  Previous selection"), and consider making selection changes undo steps. Previous selection's key
  (Ctrl+Alt+Z) was unmemorable to all three.

### 20. A recipe asks for "a protein network" without naming it, while its dialog already holds one

- **What happens:** the recipe card says to add a protein network and a table; the Apply dialog
  already lists the sender's network (with the sample's exact counts). The "Protein interactions"
  sample sits right under the card.
- **Severity:** 3. Observed: Tom stopped until the sender's email told him which network; Elena
  worried an attachment was missing and briefly took the sample for it; Dr. Chen suspected the
  analysis was built on demo data.
- **Evidence:** 3 sessions, 3 participants (use-colleagues-file: Tom, Elena, Dr. Chen).
- **Recommendation:** name the network the recipe expects and whether it travels with the recipe;
  move the sample row away from a recipe waiting for data.

### 21. The weekly update says the group count changed, not why

- **What happens:** the headline count includes 26 accounts with no transfers; the real change sits
  on a grey second line; the comparison needs arithmetic across three panels; "matched by overlap"
  names no rule; there is no count per seeded re-run to judge noise.
- **Severity:** 3. Observed: Dana summed it on a sticky note; Sarah could not explain 4 of 30 new
  groups; Min-ji could not tell whether the net change was within Louvain's own variation.
- **Evidence:** 3 sessions, 3 participants (weekly-update: Sarah, Dana, Min-ji). The contradictory
  totals are Mock 1.
- **Recommendation:** one sentence: "39 groups with transfers (was 35): 6 new, 2 merged; plus 26
  accounts with no transfers, each its own group"; the count of each seeded re-run beside it.

### 22. Nothing says how the biggest group differs from the rest

- **What happens:** there is no visible "this group against the rest" command (Jordan found it by
  right-click habit), no test or spread on the difference, and "the file's modules 0.663" is not
  explained.
- **Severity:** 3. Observed: Jordan assembled the answer by reading down the table; Dr. Chen and
  Maren could describe the group but not claim a difference.
- **Evidence:** 3 sessions, 3 participants (groups-differ: Dr. Chen, Maren, Jordan). "0.663":
  Maren, Jordan.
- **Recommendation:** Compare with the rest... on a group's row and in its inspector, reporting
  every column with spread; explain the agreement number in words.

### 23. Keyboard: Find selects the hit but Go to does not

- **What happens:** Ctrl+F's Enter selects the found node, Ctrl+K's Go to selects nothing, and
  neither says so. Selecting two neighbours after Find ends with three selected.
- **Severity:** 3. Observed: Chris ended with three selected and needed the key sheet to recover;
  Emma predicted the same.
- **Evidence:** 2 sessions, 2 participants (keyboard walk: Chris, Emma).
- **Recommendation:** one behaviour for both (focus, not selection), and the walk announces what is
  selected when it starts.

### 24. Readers take the biggest dot for the most important one

- **What happens:** size shows degree while the table ranks betweenness; Myriel (#2) is small.
  Nothing near the picture says size is a different measure.
- **Severity:** 2. Observed: Alex named the big nodes first (twice); Elena read Myriel's rank as a
  wrong sort and later read the "biggest and reddest" gene as the most important.
- **Evidence:** 5 sessions, 2 participants: who-matters (Alex, Elena), quiet-weight-trap (Alex),
  worth-an-afternoon (Elena), use-colleagues-file (Elena). First-click prompt 4 is 16 of 16 when
  asked directly, so the key is readable; the problem is that nobody asks.
- **Recommendation:** when a ranking is open and size shows a different measure, say so in the
  legend ("Size: degree, not betweenness"), with Size by this measure.

### 25. The first screen after loading does not say what to look at

- **What happens:** after load the graph opens grey with no suggestion of what to do; the only
  routes to groups or rankings are unlabelled icons and a Results "+"; the search icon sits beside
  Graphs and reads as searching graphs; the load step asks newcomers about NA values and repeated
  pairs before they have seen their data.
- **Severity:** 2. Observed: Elena left without a sentence she understood; Tom never searched for
  GSK3B; Elena, Tom and Dana answered the load questions by elimination.
- **Evidence:** 4 sessions, 4 participants (worth-an-afternoon: Elena, Tom, Dana, Jordan).
- **Recommendation:** after load, offer two worded next steps ("Find groups", "Rank who matters");
  put a node search in the table and canvas, not beside Graphs; explain each load question with the
  rows it affects.

### 26. Algorithms are named, not explained

- **What happens:** the catalog lists method names only; no task words ("hub", "key people",
  "groups").
- **Severity:** 2. Observed: 3 of 16 backed out of Main menu > Algorithms in the tree test; Sarah
  typed "hub", found nothing and refused PageRank; Jordan picked Louvain only from Gephi memory.
- **Evidence:** tree test task 1; 4 sessions, 3 participants (weight-end-to-end Sarah;
  groups-differ Jordan; worth-an-afternoon Jordan; groups-differ Dr. Chen).
- **Recommendation:** one plain line per measure and task words in Quick actions' search.

### 27. "On no bridge", and Bridges as both a result and a style

- **What happens:** the inspector says "bridges: on no bridge" for Valjean; Bridges shows "done"
  under Results and "off" in the Style stack.
- **Severity:** 2. Observed: Jordan read it as the tool contradicting itself about the story's
  biggest connector; Alex read it three times.
- **Evidence:** 4 sessions, 3 participants (who-matters: Alex, the Gephi holdout, Jordan;
  worth-an-afternoon: Jordan). Focus group on results (theme 5).
- **Recommendation:** "not on a bridge edge"; label the style row as showing the result.

### 28. Notes: Enter posts, the entry is last in the menu, and citations lack the run's settings

- **What happens:** Enter posts the note (Shift+Enter is a new line); Add note... is the last item
  of the set's menu; a note arrives citing "PageRank, full graph" without damping, weight or
  direction.
- **Severity:** 2. Observed: Alex nearly posted half a note; Morgan heard the Enter hint only after
  the field. The first click and tree test found notes 16 of 16, so placement is not the problem.
- **Evidence:** 3 sessions, 3 participants (remember-why: Alex, Marcus, Morgan).
- **Recommendation:** Enter makes a new line and Ctrl+Enter posts; the citation opens the run's
  Details.

### 29. The Look control exists twice, and "Print" suggests a gray file

- **What happens:** the Style stack's Look is for the whole project, the export dialog has its own,
  and after a Print export the canvas stays on Screen. The Print look writes a color file that
  survives gray printing; no grayscale file can be written.
- **Severity:** 2. Observed: Dr. Chen and Jordan avoided the project Look for fear of changing
  their working view; all finished.
- **Evidence:** 6 sessions, 5 participants: gray-figure-signed (Dr. Chen, Maren, Emma),
  figure-for-reviewer (Maren, the Gephi holdout, Jordan).
- **Recommendation:** in the export dialog say "for this file only"; offer a Grayscale file option.

### 30. The default diverging palette puts red on decreases

- **Severity:** 2 (Reverse fixes it and the page says so). Said by Dr. Chen, Maren (twice) and
  Emma: 4 sessions, 3 participants. **Recommendation:** default red for increases on fold changes.

### Single voices, kept but not ranked

- The step edge table silently leaves out transfers to accounts outside the step (Nadia; could
  lead to a wrong "it all funnels here" conclusion; check in round 5).
- The time-order flag compares each hop only with the row above (Sarah).
- Renamed gene symbols (H2AFX, SEPT7) reported as missing with no alias lookup (Dr. Chen).
- The walk's Shift+Down goes two hops deep, shown only in small text (Emma).
- A blank "full graph" degree cell reads as missing data (Min-ji; round 3 finding 22).
- Replacing a middle filter step takes three actions and order changes the result silently
  (Marcus).
- A frozen set that changed under a note (Marcus).
- Nodes view and Louvain use the same palette with different meanings on one network (Maren).
- No price, vendor or licence anywhere (Alex, Jordan).

---

## Part 3: what to keep

- **Notes on the rail and in the inspector:** 16 of 16 on first click and in the tree test (round
  3: 1 of 2).
- **"Nothing has been sent from this project" under the name:** 16 of 16 on first click, 15 of 16
  in the tree test.
- **The Data panel for adding a table and for versions:** 100% correct, 88% direct each; the Data
  rail button for a corrected file, 14 of 16 on first click.
- **The table's More > Export table...:** 16 of 16, all direct.
- **Results in the right panel for reading a node's score and a run's settings:** first click 16 of
  16 on both.
- **The filter steps list:** fixing the wrong middle step is again the easiest task (5.33, 2 of 3
  unaided); the greyed "off, takes nothing out" row was read correctly.
- **The inspector's weight sentence** "Shortest paths counted hops; confidence was not used", which
  the Gephi holdout, Chris and Priya each asked to see everywhere.
- **Details (the run record):** Chris: "That's the best line on the screen."
- **The figure dialog:** the reviewer's gray figure rose from 3.0 to 5.0.
- **Dates on every transfer:** the forward-trace task rose from 2.5 to 4.0 even without a trace.

---

## Focus groups in one paragraph each

- **Where results live** (`focus-groups/fg-where-results-live.md`): all 5 would read results in the
  table, consistent with the owner's note; a run must say what it ran on (3 of 5 independently,
  severity 3), a repeat run must not overwrite the old column (1 of 5 independently, needs a task
  test), and 4 of 5 could not tell where to start a run (Algorithms missing from Quick actions).
  Discount: round 2 quoted itself, and two participants credited people not in the group.
- **The Data panel as a place** (`focus-groups/fg-data-as-a-place.md`): "Update with new data" must
  not overwrite, must carry the setup and must show what changed (5 of 5, severity 4); "Sent and
  saved" must be a record of each event, not a claim (3 of 5 independently); "Recipes applied" and
  "Style files" are not understood (5 of 5, the cleanest finding); disagreement over whether the
  tool or the user assigns column roles.
- **Styles beside the selection** (`focus-groups/fg-styles-beside-the-selection.md`): style controls
  appear in more than one place (3 of 5 independently); the right panel's heading changes from
  "Style stack" to "Appearance" on selection; a picked node should explain its color in words; the
  legend hides groups behind "6 more". All opinion about still frames; the restyle sessions and
  finding 3 supply the behaviour.

---

## What round 5 should test

1. Fix Part 1 first: one fixture per state with a disagreement check; the new shell on every task
   screen; the task's dataset and target on every screen; the at-rest table without betweenness.
2. An A/B tree test of Results on the rail against the right panel and table, with the corrected
   answer key (table Search and column sort count; Undo history does not for task 7).
3. The per-run weight question with all its choices and a weighted path with its total (finding 1).
4. File > Export... and File > Update with new data... (finding 7), a style file from Add a layer
   (finding 8), and the "Used by" list on data columns (finding 5), as a tree test and first click.
5. Legend Change color... and the too-close flag (findings 3, 4), including with a real
   screen-reader user (finding 10).
6. At least one round with real people on the severity-4 findings (1, 2, 10) before large changes.
