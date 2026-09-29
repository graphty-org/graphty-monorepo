# Round 5: what the study found

Round 5 tested the design as recorded after round 4 (`../decision-log.md`, "Round 4"): one File
list in the main menu and the project-name menu, Open... that no longer replaces a project, style
files folded into recipes, the meaning of a weight chosen for each run, weighted degree in the
algorithm list, a table that totals the selection and marks near ties, a legend that recolors, a
cleared selection reported on the undo line, and Results kept in the right panel until a two-arm
tree test decides where they live.

Four methods, all with simulated participants built from the persona files in `../personas/`:

- **Tree test** (`tree-test.md`, answers in `tree-test/`): 16 personas, 16 tasks, text tree only,
  in two arms (arm A: Results in the right panel; arm B: Results as a place on the rail).
- **First click** (`first-click/`): 16 personas, 14 prompts on four still screens
  (`../../shots/round-5-fc-*.png`).
- **Think-aloud sessions** (`sessions/`): 135 sessions across 26 tasks: 18 repeated from round 4,
  3 regressions last run in round 3, and 5 never tested before.
- **Focus groups** (`focus-groups/`): where results live, data as one area, a color you can name,
  and what a number used.

Treat every finding as a hypothesis to confirm with real people. Sixteen simulated participants
share blind spots, so a failed task is a strong signal and a passed one a weak signal. Compare
rounds with each other, not with published norms.

How to read this page:

- **Severity** is Nielsen's scale: 0 not a problem (used for things to keep), 1 cosmetic, 2 minor,
  3 major, 4 catastrophe (the task cannot be done, the user leaves, or the user would report a
  wrong answer without knowing).
- **Observed** means the participant did something: picked the wrong place, stopped, nearly sent a
  wrong number, failed. **Said** means an opinion. Behaviour outranks opinion: a finding supported
  only by opinion has its severity held down by one. **Confirmed** means observed in at least two
  participants.
- **Sessions** counts think-aloud sessions; **participants** counts distinct personas. Tree-test
  and first-click counts are given separately and never added to session counts.
- **Decided, not drawn** marks a problem that a round-4 decision already answers but that was not
  on the screens participants saw. These confirm the decision; they do not call for a new one.
- Problems caused by the mocks are in Part 1 and are not counted against the design.

---

## The round measured the mocks again

The round plan required the screens to show the round-4 decisions before any session or first
click ran. Most of them were not drawn. Checked against the screens on 2026-09-28 (and against
what participants report seeing):

| Round-4 decision | On the screens participants saw? |
|---|---|
| One File list; "Recipes" the one word; no style files | No. `screens/navigation.html` still has "Recipes and style files"; the Data panel, version history and styles list still have "Style files". |
| One right panel on every task screen | No. Several task screens still show Results and Assistant on the rail and a different right panel. |
| "Not on a bridge edge" | No. `screens/navigation.html` still reads "on no bridge". |
| Weighted degree in the catalog and Quick actions | No. It appears only on the weight-trap page. |
| Table footer total over the selection; "Near tie" marks; the tie rule line | No. |
| Legend: Change color..., unused colors first, spoken names, a too-close flag | Partly: "Change color..." exists in some menus; no too-close flag, no spoken names. |
| The meaning of a weight chosen per run ("A bigger amount means") | No. The load step and the path popover still show one reading per column, with an option already filled in. |
| Cleared selection reported on the undo line | No. |
| "Undo back to here" deleted | No. It is still in Edit > Undo history. |
| The Print look's 0.25 "no change" band removed | No. |
| Enter makes a new line in a note, Ctrl+Enter posts | No. |
| Find and Go to both focus without selecting | No. Find's Enter still selects. |
| "Not decided yet" on the data page | No. The page marks open items with a note that the participant view hides, so participants saw a label, a colon and nothing. |
| Counts taken from one fixture file, with a check that fails on a mismatch | No. The same April file still gives 65 communities (was 35) on one page and 12 (was 11) on another. |

So round 5 mostly tested the round-4 design a second time. Its repeated tasks say whether the
round-4 findings reproduce (they do, nearly all of them), and its tree test, which is text only,
is the one method that tested the decided design as intended. The bars below are scored as
written; where a task was spoiled by a missing decision, it is marked void.

**About the files.** The tree-test, first-click, session and focus-group runs of this round wrote
their files into the round-4 folders, over round 4's own per-participant files. The round-5
copies are now in this folder. Round 4's findings stand in `../round-4/insights.md`, but its raw
answers are lost except the knowledge engineer's tree test, one session
(`../round-4/sessions/figure-for-reviewer--marketing-analyst.md`) and two focus groups
(`fg-data-as-a-place.md`, `fg-styles-beside-the-selection.md`). The files now under
`../round-4/tree-test/`, `../round-4/first-click/`, `../round-4/sessions/` and four files in
`../round-4/focus-groups/` are round 5's, and should be removed from there.

---

## Did the round meet its bars?

The bars were set before the round (`tree-test.md` and the round plan). They are not rescored.

| Bar | Result | Met? |
|---|---|---|
| 1. Tree test, arm A: every task at least 70% correct and 55% direct | 11 of 16 tasks pass. Task 3 (how a run was set up, 25% direct), 7 (a team's colors file, 19% correct), 10 (money in against money out, 50% direct), 12 (how the biggest group differs, 0% direct) and 13 (a cleared selection, 69% correct and direct) miss | No |
| 2. Where Results live: arm A at least 70% correct and 70% direct on each of tasks 1 to 4, and arm B no more than 4 of 64 direct successes ahead | Task 3 is 25% direct in arm A, so the first condition fails on its own. Arm B is also ahead: 45 against 38 of 48 direct on the 12 personas who ran both arms, which is 7 of 48, about 9 of 64 | No: **Results become a place on the rail, and round 6 tests that** |
| 3. First click: every prompt at least 70% | 7 of 14 pass; 161 of 224 (72%) overall. Picture export, the prompt to watch, is 14 of 16 (88%, round 4: 13%) | No |
| 4. Think-aloud: no confirmed severity 3 or 4 design finding | 21 confirmed severity 3 or 4 design findings (Part 2); 9 of them are decided but were not drawn, and 2 reopen a round-4 decision | No |
| 5. Ease: the 18 tasks repeated from round 4 at or above 4.08; each round-3 regression at or above its round-3 mean | The 18 repeated tasks: 4.25. The regressions: top 50 into Excel 4.00 (round 3: 5.3), share without data 5.25 (5.5), did anything leave 4.75 (5.0) | No: the first half is met, all three regressions miss |

**Where Results live.** The rule was frozen before the round and it is applied as written: Results
move to a place on the rail, and round 6 tests that design. Three things to know about how firm
that is:

- The outcome does not depend on arm B. Task 3 misses in arm A alone: 14 of 16 found where a run
  was set up, but only 4 without going back, because in arm A the run's record sits in a different
  state of the right panel ("with a result selected") from the list of runs ("with nothing
  selected"). 10 of 16 got there only after going back: 6 from a run opened in the list, 4 from the data
  sources.
  In arm B the record is inside the opened run, and 12 of 12 went straight there.
- Arm B was not run as planned. Only 12 of 16 personas ran it (Elena, the knowledge engineer, the
  recipe recipient and the supply-chain analyst ran one arm only), five of the twelve answered both
  arms in one sitting instead of two separate sessions, and for two of them some arm-B answers are
  inferred from their arm-A answers on branches that are identical in both trees. The arm-B lead is
  therefore indicative; the arm-A miss is not.
- Nobody said the rail place was wrong. The focus group on where results live found the opposite
  worry: Elena read an empty Results section as "nothing has run" while a node card showed a
  betweenness value.

**A run's settings on the data column.** The pre-set trigger for a "Used by" list on data columns
was 6 or more final picks on a column for task 3. There were none; 2 ended on the source file,
and 6 opened Data > Sources first or on the way. The "Used by" list is not drawn.

---

## Tree test

Arm A, all 16 personas. "Paired" gives both arms for the 12 personas who ran arm B (correct/direct).

| # | Task | Correct (A) | Direct (A) | Paired A | Paired B | Where the misses and detours went |
|---:|---|---:|---:|---:|---:|---|
| 1 | Start a second ranking | 16 (100%) | 12 (75%) | 12/10 | 12/12 | 4 backed out of Algorithms ("names I don't know") to Quick actions or Run a measure |
| 2 | Where Valjean scored and places | 16 (100%) | 15 (94%) | 12/12 | 12/9 | arm B: 3 opened the Results rail first, found only runs, and went to the node or the table |
| 3 | How an earlier calculation was set up | 14 (88%) | 4 (25%) | 11/4 | 12/12 | 10 correct only after going back (6 from a run opened in the list, 4 from Data > Sources); 2 ended on the source file |
| 4 | Every score in one list, highest first | 16 (100%) | 16 (100%) | 12/12 | 12/12 | none |
| 5 | Make a bigger transfer count as more expensive for the cheapest route | 16 (100%) | 10 (62%) | 12/8 | 12/7 | 4 opened Selection > Path between... and then used the Path tool; 1 chose the column's default (counted separately) |
| 6 | A picture for the paper | 16 (100%) | 16 (100%) | 12/12 | 12/12 | none; nobody chose Open... |
| 7 | Bring in a team's colors-and-sizes file | 3 (19%) | 0 (0%) | 2/0 | 2/0 | 12 to Style stack > Add a layer, 1 to Data > Sources > Add a source; 11 opened File > Open... first and rejected it; 7 saw "Recipes" and passed it over ("a saved workflow", "a macro", "I don't cook") |
| 8 | Next month's file, keeping the setup | 16 (100%) | 16 (100%) | 12/12 | 12/12 | none; nobody chose Open... |
| 9 | Change one of two colors you cannot tell apart | 16 (100%) | 15 (94%) | 12/12 | 12/12 | none; nobody picked a Look |
| 10 | The accounts that take in far more money than they send | 13 (81%) | 8 (50%) | 11/7 | 11/9 | 3 to the table's column menu > New column; 4 more tried the table first; 3 backed out of Algorithms ("jargon") to Quick actions |
| 11 | How much money moved along a selected route | 16 (100%) | 11 (69%) | 12/8 | 12/9 | 5 opened the path's Members first ("a count, not a sum") |
| 12 | How the biggest group differs from the rest | 15 (94%) | 0 (0%) | 12/0 | 12/5 | 14 of 16 opened the group's own panel first, found nothing to compare there, and backed out |
| 13 | Get back 18 characters a stray click cleared | 11 (69%) | 11 (69%) | 9/9 | 9/9 | 5 to Edit > Undo; nobody picked the one-line notice |
| 14 | Take out only the wrong second filter step | 16 (100%) | 13 (81%) | 12/11 | 12/12 | 3 opened Edit > Undo history first and backed out; nobody chose it |
| 15 | Has anything left this computer? | 16 (100%) | 16 (100%) | 12/12 | 12/12 | none |
| 16 | Where money went next after it left one account | 14 (88%) | 9 (56%) | 11/7 | 11/7 | 2 to the filter chip or a column filter; 5 opened Algorithms > Path or the table first |
| | **All tasks** | **230 of 256 (90%)** | **172 (67%)** | | | |

- **What the tree test settles.** One File list works: a picture for the paper (round 4: 13%
  direct) and next month's file (round 4: 38% direct) are now 100% direct, and nobody picked
  Open... for either. "Anything left?" and the filter-step fix stay at or near 100%.
- **What it overturns.** Folding style files into recipes did not make "Recipes" the place people
  look for a colors file: 3 of 16, against 10 of 16 when the style file had its own row in round 4.
  Most people take a team's look to be a new layer on the style stack.
- **Compare with the rest belongs to the group.** 14 of 16 opened the selected group's own panel
  first. Arm B's 5 direct answers came from the opened run's Compare with...; nobody was direct in
  arm A.
- **Undo is still the reflex for a lost selection** (task 13). The tree already offered the
  one-line notice as a correct place, and nobody chose it.
- **Counted separately, as planned:** task 5's column default, 2 (the knowledge engineer in arm A,
  Jordan in arm B); task 6 and 8's Open..., 0; task 7's Open... visits, 11 of 16, and Add a layer,
  12 of 16; task 9's Looks, 0; task 13's Undo, 5 of 16 in arm A; task 14's Undo history, 0 final
  picks (3 visits).

## First click

| # | Prompt | Screen | Correct | Where the clicks went |
|---:|---|---|---:|---|
| 1 | A picture for the paper | Les Miserables, at rest | 14 of 16 (88%) | main menu 14; a saved view's camera icon 2 |
| 2 | How the bridges calculation was set up | Les Miserables, at rest | 16 (100%) | the Bridges row under Results 16 |
| 3 | Rank the characters a second way | Les Miserables, at rest | 10 (62%) | "+" on Results 10; the table's "..." menu 5; a column header 1 |
| 4 | Recolor group 2 or 3 | Les Miserables, at rest | 16 (100%) | the legend swatch 13; the Style stack row 3 |
| 5 | Get back a cleared selection | Les Miserables, at rest | 8 (50%) | the main menu 8 (all looking for Edit > Undo); Ctrl+Z on the keyboard 8 |
| 6 | What is painting Valjean | Les Miserables, Valjean selected | 15 (94%) | Group color under Appearance 15; the legend row 1 |
| 7 | Where Valjean's betweenness comes from | Les Miserables, Valjean selected | 16 (100%) | the betweenness row under Results 16 |
| 8 | Bring in next month's file | Transfers | 5 (31%) | the file chip under the project name 8; Data on the rail 4; the main menu 1; "Change..." on the Loaded line 1 |
| 9 | Accounts that take in far more than they send | Transfers | 4 (25%) | the table strip 8; "Change..." on the amount line 4; "+" on Results 4 |
| 10 | Cheapest route, a bigger transfer costs more | Transfers | 7 (44%) | "Change..." on the "amount not used yet" line 9; the Path tool 7 |
| 11 | Has anything left the computer? | Transfers | 16 (100%) | the line under the project name 16 |
| 12 | Recolor Ribosome or Spliceosome | Protein interactions | 16 (100%) | the legend swatch 14; the Style stack row 2 |
| 13 | Bring in the lab's colors-and-sizes file | Protein interactions | 5 (31%) | "+" on the Style stack 9; the main menu 3; Data 2; the palette icon 1 |
| 14 | How Ribosome differs from the rest | Protein interactions | 13 (81%) | the Ribosome label in the legend 10; the table strip 2; a canvas dot, a filter button, "Change overview..." 1 each |
| | **All prompts** | | **161 of 224 (72%)** | |

- **Picture export is fixed** (2 of 16 to 14 of 16). The main menu is where people look, and the
  File list now answers them.
- **Prompt 5 is weaker than its score.** All 16 wanted Undo; the 8 counted correct opened the
  main menu to find Edit > Undo, not Previous selection. Read it with tree task 13 and the get-back
  sessions: nobody looks for a separate "previous selection" command.
- **Prompt 8: the file chip is where next month's file goes in.** 8 of 16 clicked the chip that
  names the loaded file. In graphty's own terms that chip is the data source, so it is a fair place
  for Update with new data.
- **Prompts 9 and 10 ran on screens without the decided design** (no weighted degree, no per-run
  weight choice). They still show where people start: money questions start in the table (8 of
  16), and "what the amount means" is set on the amount line before running (9 of 16).
- **Prompt 13 agrees with tree task 7**: 9 of 16 click "+" on the Style stack for a team's file.

## Think-aloud: task success and ease

Outcome codes: **success** (done, unaided), **with difficulty** (done after a wrong turn, a guess
or a step-in), **failed** (includes gave up). SEQ is the Single Ease Question, 1 (very hard) to 7
(very easy). **Void** marks a task whose result is spoiled because the round-4 decision it
exercises, or its data, was not on the screens (Part 1).

| Task | Sessions | Success | With difficulty | Failed | Mean SEQ | Round 4 | Change | |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Who matters most, and how sure are you? | 6 | 0 | 6 | 0 | 4.50 | 4.50 | 0.00 | |
| What groups are there, and how does the biggest differ? | 5 | 0 | 5 | 0 | 4.80 | 4.33 | +0.47 | |
| The edges carry a number: rank, and trust it? | 6 | 1 | 5 | 0 | 3.67 | 3.75 | -0.08 | void |
| Amount: cheapest route and most central, and what each used | 7 | 0 | 6 | 1 | 3.14 | 3.33 | -0.19 | void |
| Follow money forward from early August | 5 | 0 | 5 | 0 | 3.80 | 4.00 | -0.20 | |
| Clear or refer a flagged account | 4 | 0 | 4 | 0 | 4.75 | 3.00 | +1.75 | |
| A figure a reviewer can read in gray | 5 | 0 | 5 | 0 | 5.00 | 5.00 | 0.00 | |
| A black-and-white fold-change figure; which genes went up | 5 | 0 | 5 | 0 | 4.20 | 4.33 | -0.13 | void |
| Two groups in colors you cannot tell apart | 7 | 0 | 6 | 1 | 3.00 | 2.67 | +0.33 | void |
| Use a colleague's recipe on your gene list | 5 | 0 | 5 | 0 | 4.80 | 4.33 | +0.47 | |
| Update with this month's file; why did the group count change? | 6 | 0 | 6 | 0 | 4.33 | 4.00 | +0.33 | |
| Top 200 by betweenness past the drawing limit | 5 | 0 | 5 | 0 | 3.60 | 3.33 | +0.27 | void |
| Get back after an unexpected change | 6 | 0 | 6 | 0 | 4.17 | 4.67 | -0.50 | void |
| Fix the wrong middle filter step, keep the third | 4 | 2 | 2 | 0 | 5.25 | 5.33 | -0.08 | |
| Keyboard only: find Javert, walk, select two | 4 | 0 | 3 | 1 | 3.75 | 4.00 | -0.25 | void |
| Leave yourself a note on why you kept these accounts | 5 | 0 | 5 | 0 | 4.80 | 4.67 | +0.13 | |
| Is it OK to use with our data? | 6 | 0 | 6 | 0 | 4.67 | 4.50 | +0.17 | |
| A colleague's file: worth an afternoon? | 6 | 0 | 6 | 0 | 4.33 | 3.75 | +0.58 | |
| **Repeated from round 4 (18 tasks, unweighted)** | **97** | **3** | **91** | **3** | **4.25** | **4.08** | **+0.17** | |
| Top 50 by betweenness into Excel or pandas (round 3: 5.3) | 4 | 0 | 4 | 0 | 4.00 | -- | -1.30 on round 3 | |
| Share your setup without your data (round 3: 5.5) | 4 | 1 | 3 | 0 | 5.25 | -- | -0.25 on round 3 | |
| Answer IT: did anything leave? (round 3: 5.0) | 4 | 0 | 4 | 0 | 4.75 | -- | -0.25 on round 3 | |
| Money in against money out (new) | 5 | 0 | 1 | 4 | 2.00 | -- | -- | void |
| Make this project look like the team's (new) | 6 | 0 | 6 | 0 | 3.17 | -- | -- | void |
| Rank again with one thing changed, and compare (new) | 6 | 0 | 5 | 1 | 3.83 | -- | -- | |
| Make sure a colleague can tell which notes are yours (new) | 4 | 0 | 4 | 0 | 4.00 | -- | -- | |
| A long calculation stopped partway (new) | 5 | 0 | 5 | 0 | 4.40 | -- | -- | |
| **All of round 5** | **135** | **4** | **123** | **8** | **4.10** (per session) | | | |

A figure-for-reviewer session with Jordan
did not run (it returned no transcript and an ease of 0) and is left out; the file with that name
in `../round-4/sessions/` is round 4's.

- **127 of 135 finished (94%); 4 of 135 (3%) without a wrong turn** (round 4: 93% and 5%).
- **The void tasks.** Seven repeated tasks exercise a round-4 decision that was not drawn, or lack
  their data: the weight trap and amount end to end (no per-run weight choice), the signed gray
  figure (the "no change" band is still drawn), the restyle (no too-close flag, no spoken names),
  top 200 (no "keep top rows by the run's column", no rows within the error bound), get back (no
  cleared-selection notice) and the keyboard walk (Javert is still not on the walk page). On the
  other 11 repeated tasks the mean is 4.64, against 4.31 in round 4 (+0.33).
- **What moved up:** the flagged account (+1.75, now that the task's account is on the screens),
  worth an afternoon (+0.58), groups differ and the colleague's recipe (+0.47 each).
- **What moved down:** get back (-0.50, every participant pressed Ctrl+Z first), and the three
  round-3 regressions. Top 50 into Excel fell furthest (5.3 to 4.0): the ranked table opens sorted
  by PageRank, and Chris (ease 1) would have exported the top 50 by the wrong measure (finding 11).
  Without him the task is 5.00, still below round 3.
- **The eight failures:** four on money in against money out (nothing adds up amounts per
  account; finding 1); Priya on amount end to end (the weight list never opens); Morgan on the
  restyle (colors have no names, rows cannot be reached by keyboard); Emma on the keyboard walk
  (Javert not on the page); Elena on two runs compared (never got the second list).
- SEQ from simulated participants is not calibrated against real users.

---

## Part 1: problems caused by the mocks

These cost the round signal and are not counted against the design.

### Mock 1. The round-4 decisions were not drawn (the pre-round gate failed)

- **What happens:** see the table at the top. Participants worked on the round-4 design.
- **Severity for the study:** 4. Seven of 18 repeated tasks and two of five new tasks are void,
  and nine of the confirmed findings in Part 2 are decided but not drawn.
- **Evidence (observed):** about 70 sessions touch a missing decision: money in and out (all 5),
  amount end to end (all 7), the weight trap (all 6), restyle (all 7), gray figures (all 10), get
  back (all 6), team colors (all 6), weekly update (5 of 6 met "Replace data" and "Update with new
  data" as two names), notes (Enter posts: Marcus, Sarah, Dr. Chen), fix the wrong middle step
  ("Undo back to here": Nadia, Marcus, the knowledge engineer), keyboard walk (Find selects:
  Morgan, the knowledge engineer), data stays here and did anything leave (blank colons: all 10).
- **Fix:** make the round-5 list in `tree-test.md` a checklist that is verified on the rendered
  pages (a text search per item, plus a shot of each first-click screen), and do not start any
  round-6 session until every item passes.

### Mock 2. Counts still disagree between pages (third round running)

- **What happens:** the same April file gives 65 communities (was 35) and 27 components on two
  pages and 12 (was 11) and 1 component on another; the Graphs row still says 3,000 accounts after
  April is loaded; one sampled betweenness run is directed on its state line and undirected in its
  record; ACC-365386 is in the US, alerted Aug 7, on the alert pages and in GB, alerted Mar 9, on
  the inspector page; the drop dialog says "9 style layers already here" beside a stack of 4; the
  recipe dialog says 85 of 96 and the applied screen 84; "9 modules" on one page and "8 modules and
  26 unassigned" on another; the start screen's shot still says red is down; "no numeric edge
  column" right after confidence was read as numbers; the histogram's 47 zeros against the rank
  column's 43.
- **Severity for the study:** 4. Participants who check numbers (most of this panel) stopped
  trusting every number on the page.
- **Evidence (observed):** about 35 sessions, 14 participants: weekly update (all 6), top 200 (all 5),
  team colors (all 6), worth an afternoon (5 of 6), use a colleague's file (4 of 5), dated trace
  and flagged account (Sarah, Priya, Marcus), who matters (the knowledge engineer, Alex, the Gephi
  holdout), calculation stopped (Emma, Chris, the knowledge engineer, the Gephi holdout).
- **Fix:** the round-4 decision (every shared number from `kit/fixtures.json`, with a check proved
  to fail on a planted mismatch) still stands. It has now been deferred for two rounds.

### Mock 3. The task's data or result is not on the screens

- **What happens:** the Les Miserables results open on protein panels and "Compare rankings"
  opens payments; Javert is not on the keyboard-walk page; no weighted centrality on transfers, no
  weighted route result, no finished sampled betweenness and no table on the large-graph frames;
  no app state after a data-source query; after the team's style file is applied the canvas and
  the legend are the old ones; the rail and right panel differ between task screens.
- **Severity for the study:** 4 for the keyboard walk and team colors (the task cannot be judged);
  3 elsewhere.
- **Evidence (observed):** about 35 sessions: team colors (all 6), who matters (5 of 6), two runs
  compared (5 of 6), calculation stopped (all 5), amount end to end (5 of 7), did anything leave
  (all 4), keyboard walk (3 of 4), groups differ (4 of 5 saw the project renamed between pages).

### Mock 4. The participant view leaks or hides

- The study view hides the pink "owner decision open" notes, leaving blank colons on the data page
  (all 10 data-page sessions). Storyboards in the study view still print "What we expect him to
  say" and "What she can say after" (Maren and Alex on the recipe, Sarah on the weekly update).
  Several flow and storyboard pages render blank in the study view (Chris, Alex, Dr. Chen, Marcus).
  The recipe fixture's sender is named Maren, the same as a participant. The name dialog comes
  prefilled with "Sarah Okafor", which Dr. Chen read as another user's name.
- Inert controls: the weight lists do not open (Priya failed on it), "Change..." beside a weight
  does nothing (Elena), the note tool on the toolbar contradicts the decision that there is no
  separate Note tool (Marcus, Morgan, Sarah).

---

## Part 2: design findings, most severe first

Each finding says whether it is **new**, **decided, not drawn** (a round-4 decision answers it),
or **reopened** (new evidence against a round-4 decision).

### 1. Money has no totals per account, and the nearest answers are wrong ones

- **Status:** decided, not drawn (weighted degree in, out and total; the table footer's sum),
  plus two new points.
- **What happens:** asked for the ten accounts that take in far more than they send, 4 of 5 failed
  or gave up and all 5 finished in Excel or a notebook from the exported edges. Three things looked
  like answers and were not: the agreement line "The top 10 are the same on both measures, led by
  ACC-393859" ranks link counts, in and out mixed, led by a merchant (new); sorting the Edges tab
  by amount gives the largest single transfers, not the largest totals (new); HITS authority and
  maximum flow sound like money coming in.
- **Severity:** 4.
- **Evidence (observed):** 5 sessions, 5 participants (money in and out, all); the same need in
  dated trace (all 5 added up in against out by hand), amount end to end (Sarah, Priya, Alex) and
  flagged account (Sarah, Marcus). Tree task 10: 3 of 16 went to the table's New column; first
  click 9: 8 of 16 started at the table.
- **Recommendation:** draw the decided weighted degree with the words "money in", "money out" and
  "money in minus out" in its plain line and in Quick actions, and offer it from the table's column
  menu > New column (the element computes it; the table only asks). Label any measure of link
  counts as counts ("number of transfers") wherever it could be read as money, including the
  agreement line.

### 2. The meaning of a weight: one per column, and an answer is filled in before anyone chooses

- **Status:** decided, not drawn (the per-run choice), plus three new points.
- **What happens:** the path popover opens with "a closer or stronger link: a path prefers big
  transfers" already chosen, the opposite of "cheapest" (all 7 amount sessions; Sarah, Priya, Dana
  and Marcus each read it as picked for them). One meaning per column blocks the normal case of
  money as a cost for the route and as a strength for centrality (all 7). In the load step the
  distance option looks selected before anyone clicks (the knowledge engineer, Chris), and the grey
  line listing the measures that read each answer was read as a menu of measures: Alex and Jordan
  picked "distance" because it listed betweenness, the measure they wanted (new). Results name the
  reading but not the conversion to a path length (1/value), which decides the numbers (the Gephi
  holdout, the knowledge engineer, Chris, Emma).
- **Severity:** 4. Jordan, Alex and the Gephi holdout said they would have shipped the wrong
  ranking; the only warning is small grey text.
- **Evidence (observed):** 13 sessions, 11 participants (amount end to end, all 7; the weight
  trap, all 6). First click 10: 9 of 16 went to the amount line's "Change..." to set the meaning
  before running.
- **Recommendation:** draw the decided per-run choice with nothing chosen until the user answers.
  Replace the grey measure lists with one line per answer about the data ("Choose this if more
  means closer, such as a count of shared scenes"). Put the conversion on the result's state line
  ("value read as a strength; path length 1/value"). Keep "Change..." on the amount line as the way
  to the column's default, and have it say that each run can choose again.

### 3. Money cannot be followed forward in time

- **Status:** new as a confirmed finding (round 4 reopened it as an unconfirmed gap).
- **What happens:** on the August screens, Neighbors offers hops and "Follow: All" but no "out
  only" in words and no date window; the dated trace with a window and a per-hop summary exists
  only on March data and is drawn as waiting on the element. The Path tool needs an end account the
  task does not have. Nothing sets money in against money out over the window: every participant
  worked out by hand that 28,062.73 left the day after 3,479.70 arrived, the key fact of the task.
  The step's transfers open sorted by amount, not time.
- **Severity:** 4 (the core fact came from the participant's own arithmetic in all 5 sessions).
- **Evidence (observed):** 5 sessions, 5 participants (dated trace, all); "Follow" not read as
  direction by Nadia, Sarah, Marcus, Priya and Dana; flagged account (Sarah, Marcus). Tree task 16:
  56% direct.
- **Recommendation:** put the dated Neighbors on every transfers screen: "Direction: money out",
  "From: Aug 5", and one summary line per hop with money in before and money out after. Open a
  step's transfers sorted by time when the question is about order. The window and the ordering
  rule are graph logic and belong in graphty-element.

### 4. Ctrl+Z is the reflex for a lost selection, and it takes a filter step instead

- **Status:** reopened. Round 4 decided a notice on the undo line and kept selection out of undo;
  the notice was not drawn, but the tree test did offer it, and nobody chose it.
- **What happens:** in all 6 get-back sessions the participant pressed Ctrl+Z first and lost a
  filter step they wanted. Elena pressed it twice, reached 60 characters and stopped ("I'm making
  this worse"); Alex ended confident he was back when he was not. Previous selection was found
  late, as faint text on the table's scope line.
- **Severity:** 4 (a wrong state the user does not know about, in 2 of 6).
- **Evidence (observed):** 6 sessions, 6 participants; tree task 13, 5 of 16 to Undo and 0 to the
  notice; first click 5, 16 of 16 wanted Undo.
- **Recommendation:** make Ctrl+Z first restore a selection cleared since the last undoable
  change, without touching the redo list (so the round-4 objection, "it would empty Redo after one
  stray click", does not apply), and say so on the undo line ("Selection restored: 18 nodes"). Test
  it in round 6 against the notice alone.

### 5. A team's look is brought in on the style stack, not through "Recipes"

- **Status:** reopened. Round 4 folded style files into recipes and rejected "Add a layer > From a
  file" as a second route.
- **What happens:** 12 of 16 in the tree test and 9 of 16 in the first click went to the style
  stack's "+" for a colleague's colors file; 7 saw "Recipes" and passed it over as a saved workflow
  or a word they did not know. In the sessions all 6 dragged the file onto the canvas, which
  worked; none found a menu route. Once dropped, neither "On top" nor "Replace style stack" means
  "look like the team's" (all 6: on top keeps a mix, replace deletes the user's own highlight), and
  nothing says the file holds no data (Dana, Tom).
- **Severity:** 3 (the drop works; the menu route and the choice do not).
- **Evidence (observed):** 6 sessions, 6 participants (team colors, all); tree task 7 (3 of 16
  correct); first click 13 (5 of 16).
- **Recommendation:** keep one noun, but give the style stack's "+" an entry "From a recipe or
  file..." that opens the same apply dialog. In that dialog, make the first choice "Use this look:
  the file's layers replace the ones that paint the same things; yours stay below", with a before
  and after preview, and a line "No data inside". Keep drag and drop.

### 6. Comparing a group with the rest starts from the group, and says too little

- **Status:** new placement point; the target itself is decided ("the rest of the graph" in
  Compare with...).
- **What happens:** 14 of 16 opened the selected group's own panel first to compare it with the
  rest. In the sessions, "Compare with..." on the run compares rankings, not groups (Dana, Jordan,
  Dr. Chen, Emma); the group comparison shows two data columns and misses what actually differs
  (size, density, edges going out), which sits only in the communities table (Dana, Jordan); the
  table gives a mean and the comparison a median for the same column (Jordan, Emma, Maren); and
  rank-biserial values carry no words (Jordan, Dana).
- **Severity:** 3.
- **Evidence (observed):** 5 sessions, 5 participants (groups differ, all); tree task 12 (0 of 16
  direct in arm A).
- **Recommendation:** put "Compare with the rest" on the group's or set's panel, lead with the
  structural facts (size, edges inside and out, density), use one statistic per column everywhere,
  and add a plain verdict beside each effect size ("about the same", "higher").

### 7. Runs are named by how long they took, and a second run looks like an overwrite

- **Status:** new.
- **What happens:** runs read "Run 1, 1.2 s, shown": no date and not the setting that differs, so
  "yesterday's" run cannot be found. "Re-run" reads as overwrite while the Runs list appends.
  "Compare with..." lists other measures and data versions but never an earlier run of the same
  measure, and a comparison names its sides by measure, so two betweenness runs would both read
  "Betweenness". After a GPU failure, a CPU re-run shows only "CPU", with no setting.
- **Severity:** 3.
- **Evidence (observed):** 11 sessions, 7 participants: two runs compared (all 6), calculation
  stopped (Alex, Chris, the knowledge engineer, the Gephi holdout, Emma).
- **Recommendation:** name each run by the options that differ from the run before, with its date
  ("Run 2, weighted by value, Sep 28 10:14"); list earlier runs of the same measure in Compare
  with...; name comparison sides by the differing option; say on Re-run that the earlier run is
  kept.

### 8. "How sure" stops at the top five, and a filtered result can pass for the whole graph

- **Status:** decided, not drawn (near-tie marks, the tie rule line, rows within the error bound),
  plus one new point.
- **What happens:** the only answer to "how sure" is a 1% tie sentence for the top five, with no
  word on who chose 1% (6 of 6 who-matters sessions) and nothing about ranks 6 to 50 (all 4 top-50
  sessions) or rank 200 of a sampled run (all 5 top-200 sessions). New: the same word,
  betweenness, shows 0.57 in the table (full graph) and 0.419 in the result panel (filtered to 60
  of 77), and the filter is stated only in a pill and the panel's first line. Elena stopped
  trusting both numbers; Jordan and Maren noticed only because they had seen the full ranking
  first.
- **Severity:** 3.
- **Evidence (observed):** 15 sessions, 10 participants.
- **Recommendation:** draw the decided marks. Wherever a value shown beside another comes from a
  different scope, put the scope in the value's own line ("0.419, on 60 of 77").

### 9. The ranked table opens sorted by a different measure than the one asked for

- **Status:** new.
- **What happens:** "Show in table" from a betweenness result opens the three-measure table sorted
  by PageRank. The first five rows agree, so it looks right; exporting and taking the first 50 rows
  gives the top 50 by PageRank. Chris caught it only from the rank column; Emma noticed UBC was
  missing; Dr. Chen asked why. The CSV also drops the tie mark ("#4=" becomes 4) and the table's two
  export buttons disagree on whether a methods file is written.
- **Severity:** 3 (one participant would have sent the wrong top 50 without the rank column).
- **Evidence (observed):** 4 sessions, 4 participants (top 50 into Excel, all).
- **Recommendation:** open a table from a result sorted by that result; offer "Export the top N by
  this column"; keep "=" in exported ranks; one table export that always writes the methods file.

### 10. A subset offered as "Exact", and a refused run shown as a failure

- **Status:** new.
- **What happens:** when an exact betweenness is refused for time, one route reads "Exact, on 5,318
  nodes" without naming the set; every participant who saw it refused it or asked "which 5,318?".
  The refused run stays in Results with the red mark of a failure and "hours". A failed PageRank
  row says only "Failed" while the column still holds the previous run's values, and its damping
  field shows the failed value (0.5) above a small line saying 0.85 is shown. Nothing offers to try
  WebGPU again.
- **Severity:** 3.
- **Evidence (observed):** 10 sessions, 6 participants (calculation stopped, all 5; top 200, all
  5).
- **Recommendation:** name the subset and say it is a different graph ("Exact, on Drug patents
  (5,318)"); show a refusal as "Not run: would take hours" without the failure mark; on a failed
  row, say "Showing Run 1 (damping 0.85). Run 2 wrote nothing."; add "Try WebGPU again".

### 11. What the data page and the send list cannot answer yet

- **Status:** decided, not drawn ("Not decided yet"), plus new points. Hosting, telemetry,
  running your own copy and an organization-wide Assistant switch are open owner questions already
  asked in milestone 4; they are not asked again here.
- **What happens:** blanks after "Usage statistics and crash reports:" and the organization lines
  (all 10 data sessions) read as evasive. New: the send list shows a data-source query as "1
  query", without its text, which in investigations carries names and account numbers (Priya,
  Marcus, Sarah); the export log's format is not stated (4); "Nothing has been sent from this
  project" invites "and from elsewhere?" (Priya, Marcus, Alex); the line is underlined on one page
  and plain on another (4); no version number in the app to match the page's "graphty 2.0"
  (Priya, Dr. Chen); data fetched by a query then stays in browser storage, which the page never
  connects (Sarah, Dr. Chen, Marcus, Dana, Priya).
- **Severity:** 3.
- **Evidence (observed and said):** 10 sessions, 6 participants.
- **Recommendation:** draw "Not decided yet". Show a query's text under "See what was sent"; name
  the export log's format; add a version line to Help and the data page; add one sentence that
  query results are kept with the project in browser storage until the project is deleted.

### 12. Notes: Enter posts half a note, and a citation appears that nobody added

- **Status:** decided, not drawn (Enter makes a new line), plus one new point.
- **What happens:** Marcus and Sarah posted one-line notes by pressing Enter for a new line;
  Dr. Chen predicted it. New: the editor opens with "Cites PageRank, full graph" that the writer did
  not add, and without the run's settings (Alex, Sarah, Morgan, Dr. Chen); Sarah would delete it
  rather than sign something she cannot explain.
- **Severity:** 3.
- **Evidence (observed):** 5 sessions, 5 participants (remember why, all).
- **Recommendation:** draw Ctrl+Enter. Add a citation only when the writer chooses one, and show
  the cited run's settings in the chip.

### 13. A name on notes cannot be checked by the writer, and older notes stay nameless

- **Status:** new. The owner decided that a note records its author and that the author is shown
  only when a project holds more than one; this finding does not change that.
- **What happens:** all 4 set their name, then had no way to see it recorded in a one-author
  project, and learned that notes written before the name was set stay nameless with no way to
  claim them. Nobody could tell whose name a note carries after a colleague edits it. Finding the
  setting took three or four tries (Preferences in the main menu).
- **Severity:** 3.
- **Evidence (observed):** 4 sessions, 4 participants (notes with names, all).
- **Recommendation:** in the note editor, show the author setting as a setting, not a byline
  ("Saving as: Marcus. Change..."), which also leads to the dialog; offer "Mark my unsigned notes
  as mine" once, keeping their dates; define edits ("Edited by Sarah, Oct 2" under the author).
  Check the editor line against the owner's authorship decision before drawing it.

### 14. The colleague's recipe colors collide with the recipient's own values

- **Status:** new.
- **What happens:** after apply, the muted module colors (pale blue Ribosome, salmon DNA repair)
  sit on the same hues as the fold-change scale, so a gene slightly down cannot be told from a
  background protein. Also: the recipe assumes the sender's network, so the recipient's own genes
  missing from it cannot be added (Dr. Chen, Maren), and old gene symbols are not matched to
  current ones (H2AFX, SEPT7).
- **Severity:** 3 (4 for Tom and Maren, who could not read their result).
- **Evidence (observed):** 5 sessions, 5 participants (use a colleague's file); share without data
  (Dr. Chen, Maren: the recipe asks for a module column that only the sender's network has).
- **Recommendation:** when a recipe paints a diverging scale over categorical colors, mute the
  categories to grays or outlines. Match on previous symbols and aliases in graphty-element and say
  so ("H2AFX matched H2AX, previous symbol"). List what the partner must supply exactly as the
  partner will see it.

### 15. The weekly update never says the whole reason in one sentence

- **Status:** decided, not drawn (the reconciling sentence), plus new points.
- **What happens:** 5 of 6 derived the explanation of 35 to 65 on paper; 39 means three things on
  one panel; the 9 March groups with no April match are listed nowhere, and the Shrank and New
  tabs are empty; "AMI" and "Louvain is random" made an audit-minded reader doubt the change was
  real (Nadia, Sarah, Dana, Marcus).
- **Severity:** 3.
- **Evidence (observed):** 6 sessions, 6 participants.
- **Recommendation:** draw the decided sentence; give each count its own word (never two 39s);
  list the unmatched March groups; say the agreement result in words ("April's groups differ more
  than two runs on the same month do").

### 16. The loaded file does not say what to look at first

- **Status:** round-4 finding 25, still open.
- **What happens:** after loading, the graph is grey and the statistics are counts and density
  without a scale; the way to "who matters" is an unlabelled lightning button (Elena, Dana, Alex);
  Tom read the grey as something he broke. Edges count rows while density counts pairs, side by
  side (Alex; Maren asked which).
- **Severity:** 3.
- **Evidence (observed):** 6 sessions, 6 participants (worth an afternoon).
- **Recommendation:** one plain line under Statistics with what stands out and a way in ("One big
  piece and 2 unconnected proteins. Most connected: UBC. Find who matters..."); label the
  lightning button; say in Statistics whether edges are rows or pairs.

### 17. The legend and the colors: decided, not drawn

- **Status:** decided, not drawn (the swatch opens the picker with unused colors first; spoken
  names; a too-close flag; a look's one-line description), plus two new points.
- **What happens:** the legend was the first click for recoloring (6 of 7 restyle sessions) and it
  selects; the value list is three or four levels down; the picker offers only colors already in
  use. New: the default palette itself creates the confusable pair (black for group 0 beside a
  #505050 Other; Elena, Dr. Chen, the Gephi holdout), and "Other" does not say which groups it
  holds (Elena, the Gephi holdout).
- **Severity:** 3; 4 for the screen-reader user (Morgan failed: no color names, value rows and the
  shape binding unreachable by keyboard; one participant, the only screen-reader user).
- **Evidence (observed):** 7 sessions, 7 participants; tree task 9 and first-click prompts 4 and
  12 pass (the legend is where people go).
- **Recommendation:** draw the decisions. Give Other a light gray and list its members in its
  tooltip and spoken name. Make value rows and the shape binding keyboard reachable.

### 18. Figures: the band, forced labels and gray categories

- **Status:** decided, not drawn (the band removed; "for this file only"), plus new points.
- **What happens:** the 0.25 "no change" band that nobody set drew questions in all 10 figure
  sessions. New: two of the ten strongest changes are hidden to avoid overlap and cannot be kept
  (Maren, the Gephi holdout, Emma, Alex, Dr. Chen, Jordan); the Print look says nothing about
  categorical colors in gray, which is how most figures fail (the Gephi holdout, Alex, Emma); the
  gray legend has no break values (Dr. Chen, Emma, the Gephi holdout).
- **Severity:** 3.
- **Evidence (observed):** 10 sessions, 7 participants.
- **Recommendation:** draw the decisions; add "Show anyway" beside each hidden label (reopening
  the rejected "Always label" list in its smallest form); say in the Print look's line what it does
  to categories; print break values under the gray steps.

### 19. Keyboard walk: Find selects, and the walk never names its weight

- **Status:** decided, not drawn (Find does not select), plus one new point.
- **What happens:** Find's Enter selected the hub, so "select two neighbors" ended with three
  (Morgan, the knowledge engineer). New: the walk orders by "weight 0.98" without naming the column
  (confidence) or what "rank 172 of 300" ranks by (Morgan, Emma, Chris).
- **Severity:** 3.
- **Evidence (observed):** 4 sessions, 4 participants.
- **Recommendation:** draw the decision; name the column and the ranking in the walk ("confidence
  0.98; degree rank 172 of 300").

### 20. A referral's evidence leaves out what the referral rests on

- **Status:** new.
- **What happens:** the export's default scope is the account's own 8 transfers, which omits the
  other accounts paying the common payee, the reason to refer (Sarah, Priya, Marcus); account kinds
  (person, merchant, money transfer service) all look like the same dot (Marcus, Sarah, Priya); a
  notice from an earlier alert's step ("Delete step ACC-749505") greets the next alert and reads as
  the reader's own action (all 4).
- **Severity:** 3.
- **Evidence (observed):** 4 sessions, 4 participants (flagged account).
- **Recommendation:** default the evidence scope to the filter step's edges when a filter step is
  open; shape nodes by kind when a kind column exists; clear the undo line when the user moves to a
  different node or step.

### 21. Sharing: what the partner needs, and what a filter carries

- **Status:** new.
- **What happens:** nothing tells the sender what the partner opens a .graphty file with (Maren,
  Jordan, Dana); a note on a filter step and the filter's values travel in full, and may name
  suppliers or people (Dana, Jordan); the network's file name travels as "named, not carried"
  without the sender seeing it (Dana, Dr. Chen); there is no Share entry, so people guessed Export
  (Jordan, Dana, Maren).
- **Severity:** 3.
- **Evidence (observed):** 4 sessions, 4 participants.
- **Recommendation:** add a line for the email ("Your partner opens this in graphty in a browser,
  no account"); list every travelling value, including filter values and file names, with a way to
  leave each out.

### Single voices, kept but not ranked

- Shift+Down steps deeper while an ontology user expects the next sibling (the knowledge engineer).
- Enter in the table replaces the selection while Enter in the walk adds (the knowledge engineer).
- An investigator wants both months together, with dates, not a replacement (Sarah).
- The methods file does not name the layout algorithm or seed (the Gephi holdout).
- A merchant tops every money ranking; a filter by kind is the reader's choice (Sarah, Priya, Dana
  raised it; recorded as a reader's choice, not a design fault).
- "Quote a value" cannot quote a transfer's amount or date (Sarah).
- Two buttons both named "Close" in the note editor (Morgan; accessibility, fix regardless).

---

## Part 3: what to keep

- **One File list** (tree tasks 6 and 8 at 100% direct; first-click export 14 of 16).
- **The line under the project name** (tree 16 of 16 direct, first click 16 of 16) and the
  Sent and saved list as a record.
- **Filter steps with "took out N, M left"** and unticking a step: the easiest task again (5.25),
  praised in every fix-the-middle-step session.
- **Scope and method on every column header** ("Betweenness exact, unweighted, full graph") and
  the run record with Copy: praised in most analysis sessions.
- **The agreement line** ("Valjean is #1 on both. At #2 they part") for rankings, which every
  who-matters participant would paste.
- **Honest statements**: "Paths ignore amount: hops were counted, not dollars", the Exact tooltip,
  "Descriptive only; no statistical test", "Nothing is uploaded".
- **The load step's issues and counts before commit**, and naming unmatched genes and spreadsheet
  dates.
- **Refusing an hours-long run before it starts**, with priced routes and a seed.
- **Dropping a file on the canvas** (all 6 team-color participants did it first, and it worked).

---

## Focus groups in one paragraph each

- **Where results live** (`focus-groups/fg-where-results-live.md`, 6 participants): the "run" tag
  under Styles files a calculation as a color (5 of 6 unprompted); nobody saw a ranked, sortable,
  exportable table (4 of 6 unprompted, all 6 by the end); a value must say which run made it (3 of
  6); a second run must not overwrite the first (a requirement to test; the mock does not show
  this happening). Elena read an empty Results as "nothing has run". The group leans toward Gephi's
  habits, so "a Data Laboratory style table" is the panel's prior, not a finding.
- **Data as one area** (`focus-groups/fg-data-as-one-area.md`, 5 participants): "Recipes applied"
  and "Style files" read as the same thing (5 of 5, the cleanest finding); Update with new data must
  say what changed before it redraws (3 unprompted, 4 by the end); a recipe must only change how
  things look (4 of 5 by the end); "Nothing has been sent" is a claim, not a record (5 of 5), and a
  dated, printable log is the ask. Tom, the only recipient, fears the command the others want most.
- **A color you can name** (`focus-groups/fg-color-you-can-name.md`, 5 participants): one source
  of truth for a group's color that every place follows (5 of 5 by the end); a color should stay
  with the group's name through a re-run, with a real split on what to do with an unmatched group;
  every swatch spoken with its name, count and color (Morgan; check the markup). Discount the round
  3 slogan "this file only", which spread by echo.
- **What a number used** (`focus-groups/fg-what-a-number-used.md`, 5 participants): the screen
  gives two answers to "was the weight used?" (5 of 5); what "bigger means" belongs to the run, and
  each result must print what it used (3 independent voices); who set the reading, and when (5 of
  5); high-volume reviewers never want to be asked, analysts want to be asked every run, which
  points to a default with a named setter plus a per-run override; a copied number must carry scope,
  weight reading, period and who set it.

---

## What round 6 should test

1. **Results as a place on the rail**, as the frozen rule requires, with the same 16 tasks as this
   round's tree test, both arms again only if the rail design changes the right panel; every
   persona runs its arms as separate sessions.
2. **Nothing before the gate:** the round-4 checklist plus the round-5 recommendations drawn and
   verified on the rendered pages, and the fixture check proved to fail on a planted mismatch.
3. **Undo restores a cleared selection** (finding 4) against the notice alone, with the get-back
   task and first-click prompt 5.
4. **A team's look from the style stack's "+"** (finding 5) with tree task 7 and first-click
   prompt 13 unchanged, and the team-colors task on a canvas that repaints.
5. **Money:** money in and out, amount end to end and the dated trace on screens that show
   weighted degree, the footer sum, the per-run weight choice and the dated Neighbors.
6. **The three round-3 regressions** (top 50, share without data, did anything leave), with the
   ranked table opening sorted by the result.
7. **Compare with the rest from the group's panel** (tree task 12).
