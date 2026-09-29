# Round 6: what the study found

Round 6 tested the design as recorded after round 5 (`../decision-log.md`, "Round 5"): runs as a
place on the rail named "Results" (against a "Runs" label), a run's record opened inside the run,
Compare with the rest on a group's or set's own panel, weighted degree in money words, the meaning
of a weight chosen in each run, a table footer that totals the selection, a team's look brought in
from the Style stack's "+", "Show label anyway" on a selected node, and two undo designs: the
cleared-selection notice alone, and the notice plus Ctrl+Z that first restores the selection.

Four methods, all with **simulated participants** built from the persona files in `../personas/`:

- **Tree test** (`tree-test.md`, answers in `tree-test/`): 16 personas, 16 tasks, text tree only.
- **First click** (`first-click/`): 16 personas, 14 prompts on still screens.
- **Think-aloud sessions** (`sessions/`): 211 sessions across 36 tasks: 25 repeated from round 5
  (get back in two arms), 1 repeated but flagged (a colleague's recipe on your gene list), 7
  regressions last run in round 3, and 2 new (load a messy export; real change or noise).
- **Focus groups** (`focus-groups/`): runs on the rail, getting back, money as money, a look you
  receive.

**Every number on this page comes from simulated participants.** Sixteen personas share blind
spots, so a failed task is a strong signal and a passed task a weak one until real people confirm
it. Compare rounds with each other, not with published norms.

How to read this page:

- **Severity** is Nielsen's scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe
  (the task cannot be done, the user leaves, or the user would report a wrong answer without
  knowing).
- **Observed** means the participant did something (picked the wrong place, stopped, nearly
  reported a wrong number, failed). **Said** means an opinion. A finding supported only by opinion
  has its severity held down by one. **Confirmed** means observed in at least two participants.
- **Sessions** counts think-aloud sessions; **participants** counts distinct personas. Tree-test and
  first-click counts are separate and never added to session counts.
- **Decided, not drawn** marks a problem a round-5 decision already answers but that was not on the
  screens. Such findings confirm the decision; they do not ask for a new one.
- Problems caused by the mocks are in Part 1 and are not counted against the design.

---

## Verdict: the round does not pass

The bars were frozen before the round. They are scored as written and not rescored.

| Bar | Result | Met? |
|---|---|---|
| 0. Precondition: the kit gate passes before any first click or session | Not met. The sessions and first clicks ran anyway (see below). By the plan, a failed gate stops the whole round | **No** |
| 1. Tree test: every task at least 70% correct and 55% direct, main tree, all 16 | 9 of 16 tasks pass. Tasks 2, 5, 7, 11, 12, 15 and 16 miss (only task 7 misses on correctness). Only 11 personas took the main tree | **No** |
| 1b. Label: "Runs" replaces "Results" only with more than 4 extra direct successes over tasks 1 to 4 (of 64) | Could not be run as frozen (no persona took both trees). On the sessions that did run, the variant is behind: 16 of 20 direct against 39 of 44. The label stays **Results** | Label stays |
| 2. First click: every prompt at least 70% | 6 of 14 pass; 154 of 224 (69%) under the kept undo design | **No** |
| 3. Think-aloud: no confirmed severity 3 or 4 design finding | 24 confirmed severity 3 or 4 design findings in Part 2 (3 at severity 4); finding 3 and part of 15 are decided but not drawn, and finding 1 is settled by the undo decision | **No** |
| 4. Ease: the 25 tasks repeated from round 5 at or above 4.13 | **4.78** (+0.65). 21 of 25 rose, 1 held, 3 fell | **Yes** |

So one bar passes. The ease bar passing is the weakest of these signals: simulated participants
score ease generously, and nine session summaries handed to this synthesis carried a higher ease
than the transcript itself (all corrected here to the transcript; see "Data quality").

### The precondition gate failed

The plan required, before any first click or session: `kit/check.mjs --all` and `--tasks` clean,
`kit/prove-gate.mjs` passing all 15 proofs, and six named fixes on the pages. Checked on the source
pages on 2026-09-29 and against what participants report seeing:

| Required before the round | On the pages participants saw? |
|---|---|
| Note tool removed from the shared toolbar | No. `kit/template.html` still has the Note tool on the floating toolbar (Marcus and Morgan saw it on the sets-and-paths screen) |
| `screens/navigation.html` reads "Not on a bridge edge" | No. It still reads "on no bridge" (Jordan, Elena, Maren) |
| `screens/navigation.html` reads "Re-run (keeps ...)" | No. It reads "Re-run" (Elena, Chris, the knowledge engineer, Alex) |
| Quick actions labelled on `screens/navigation.html` | No (the Gephi holdout: "the lightning icon has no label; I would not touch it") |
| One right panel on every task screen | No. The frame at rest still has the older panel (Graph, Background, Layout, Statistics); the inspector page is clipped at 1440 wide (Jordan, Maren, Elena, Alex) |
| Weighted degree in the results-panel catalog | No. `screens/results-panel.html` has no "Weighted degree"; the main menu's Algorithms list has no Degree group (Priya, Maren, Dr. Chen) |
| Fixture task entries for every round-4 and round-5 task | No. `kit/fixtures.json` has 30 task entries; none for money in and out, team colors, two runs compared, notes with names, calculation stopped, dated trace, weekly update, gray figure, restyle, top 200 or amount end to end. `node kit/check.mjs --tasks` reports "0 problems on 0 pages; 0 fixture values bound", so it checked nothing |
| `kit/prove-gate.mjs` passes all 15 proofs | Not shown to pass; the plan recorded 2 of 15 failing and no later run is on record |

The per-task effect is in the tables: where a finding is a gate item, it is marked "decided, not
drawn" and not counted as a new design problem.

### Undo: keep the notice plus Ctrl+Z restore (studio decision)

The two undo designs ran in separate sessions, 8 each, same personas, same wording. Compared on
outcome first, as planned:

| | Notice alone | Notice plus Ctrl+Z restore |
|---|---:|---:|
| Ended with the hand-picked selection lost for good | **5 of 8** (Alex, the Gephi holdout, Morgan, Dana, Emma) | **0 of 8** |
| Ended with the wrong filter steps | 0 | 1 of 8 (Elena, who did not know what "degree" means; not an undo problem) |
| Failed | 5 | 1 |
| Mean ease | 3.62 | 5.12 |

In the notice-alone design, pressing Ctrl+Z while "Selection cleared (18 nodes) / Bring it back"
was showing undid a filter step, replaced the notice and emptied the held selection. All five who
lost it had seen or heard the notice; all five pressed Ctrl+Z anyway, because the notice looks like the undo
line and Ctrl+Z is their undo. No wrong end state went unnoticed in either arm; the notice arm's
losses were noticed afterwards and could not be recovered. **Studio decision (reversible): keep the
notice plus the Ctrl+Z restore.** First-click prompt 4 is therefore scored on that key (16 of 16).

---

## Tree test

**Simulated participants, 16 personas. A failed task is a strong signal; a passed one is weak.**

The plan was for every persona to take both trees in separate sessions. That did not happen: each
persona took one tree. Eleven took the main tree ("Results"); five took the label variant ("Runs"):
Alex, Priya, Elena, Maren and Marcus. The trees are word for word the same apart from that one
label, so tasks 5 to 16 are shown for all 16 and for the 11 alone; they fail on the same tasks
either way. Maren's session also saw the answer key in the tree file before answering; by the
frozen rules it should be run again. Removing it changes no pass or fail.

| # | Task | Correct (16) | Direct (16) | Main tree only (11): correct / direct | Round 5, arm A (16): correct / direct | Where the misses and detours went |
|---:|---|---:|---:|---:|---:|---|
| 1 | Start a second ranking | 16 (100%) | 16 (100%) | 11 / 11 | 100% / 75% | none |
| 2 | Where Valjean scored and places | 13 (81%) | 7 (44%) | 10 / 6 | 100% / 94% | 9 of 16 opened an opened run's Top nodes: 3 stayed there (Elena, Marcus, Tom), 6 backed out to the table or the node |
| 3 | How an earlier calculation was set up | 16 (100%) | 16 (100%) | 11 / 11 | 88% / 25% | none; the run's record inside the run works |
| 4 | Every score in one list, highest first | 16 (100%) | 16 (100%) | 11 / 11 | 100% / 100% | none |
| 5 | A bigger transfer counts as more expensive | 12 (75%) | 5 (31%) | 9 / 5 | 100% / 62% | 4 ended on Data > Sources > Its columns (now wrong); 7 more reached it after opening the column or a path command |
| 6 | A picture for the paper | 16 (100%) | 16 (100%) | 11 / 11 | 100% / 100% | none |
| 7 | Bring in a team's colors-and-sizes file | 11 (69%) | 0 (0%) | 8 / 0 | 19% / 0% | 10 ended on the Style stack's "From a recipe or file...", 1 on Recipes; 5 ended on Data > Sources > Add a source; all 16 opened File first |
| 8 | Next month's file, keeping the setup | 16 (100%) | 16 (100%) | 11 / 11 | 100% / 100% | none |
| 9 | Change one of two colors you cannot tell apart | 16 (100%) | 13 (81%) | 11 / 9 | 100% / 94% | nobody picked a Look |
| 10 | Accounts that take in far more than they send | 16 (100%) | 15 (94%) | 11 / 10 | 81% / 50% | 12 chose the table's New column, 3 Algorithms > Weighted degree, 1 Quick actions |
| 11 | Money moved along a selected route | 16 (100%) | 4 (25%) | 11 / 4 | 100% / 69% | 12 of 16 opened the path's Members first ("a count, not a sum") |
| 12 | How the biggest group differs from the rest | 16 (100%) | 6 (38%) | 11 / 4 | 94% / 0% | 7 opened an opened run's Compare with... first and backed out |
| 13 | Get back 18 characters a stray click cleared | 16 (100%) | 16 (100%) | 11 / 11 | 69% / 69% | all 16 chose Edit > Undo; nobody chose the notice |
| 14 | Take out only the wrong second filter step | 13 (81%) | 11 (69%) | 9 / 8 | 100% / 81% | 3 ended on Edit > Undo history (Nadia, Elena, Tom) |
| 15 | Make a hidden name always show (new) | 16 (100%) | 8 (50%) | 11 / 4 | -- | 7 went to the Style stack, a Look or View first, reading labels as styling; 1 to the legend's labels line |
| 16 | Where money went next in early August | 13 (81%) | 5 (31%) | 8 / 4 | 88% / 56% | 3 wrong (a filter step, a column filter, Data > Versions); 8 more started in the table, Search, a filter step or Algorithms > Path |
| | **All tasks** | **238 of 256 (93%)** | **170 (66%)** | 165 / 120 of 176 | 90% / 67% | |

**Tasks whose key changed since round 5, under both keys** (16 personas):

| # | New key (this round) | Round-5 key |
|---:|---|---|
| 5 | 12 correct, 5 direct (the column now wrong) | 16 correct, 5 direct (the column counted correct, not direct) |
| 10 | 16 correct, 15 direct (the table's New column now right) | 4 correct, 4 direct |
| 12 | 16 correct, 6 direct (the group's own panel now right) | 0 correct (nobody ended on the run's Compare with...) |
| 13 | 16 correct, 16 direct (Edit > Undo right, the kept design) | 0 correct under the notice-only key and under round 5's key; nobody chose the notice |

**The label.** On tasks 1 to 4, the main tree ("Results") had 39 of 44 direct answers (89%); the
variant ("Runs") 16 of 20 (80%; 13 of 16 without Maren's spoiled session). Scaled to 64, "Runs" is
behind, not more than 4 ahead. The frozen rule could not be run as a paired comparison, but it
cannot be met on this evidence: **the label stays "Results".** The focus group on runs found the
opposite in talk (all six expected values, not a log, behind "Results"); what people did outranks
what they said.

**What the tree test settles.**

- **Runs on the rail work where they were meant to.** How a calculation was set up went from 25%
  to 100% direct; start a second ranking from 75% to 100%.
- **The table is where money questions start.** Money in against money out rose from 50% to 94%
  direct, 12 of 16 through the table's New column.
- **Ctrl+Z is the answer to a lost selection.** All 16, against 11 of 16 before, and nobody chose
  the notice.
- **A team's colors file** rose from 3 to 11 of 16 correct through the Style stack's "+", but nobody
  was direct: File > Open... is the first place almost everyone looks for a file.

**What it breaks.** Moving runs to the rail made an opened run's Top nodes a magnet for one
node's value (task 2: 94% direct to 44%). A path's Members is still where people look for a
route's money total (task 11: 69% to 25% direct). Both are fixes in the thing people open first,
not in the tree.

## First click

**Simulated participants, 16 personas.** Prompt 4 is scored on the kept undo design (notice plus
Ctrl+Z restore); under the notice-only key it is 13 of 16.

| # | Prompt | Screen | Correct | Round 5 | Where the clicks went |
|---:|---|---|---:|---:|---|
| 1 | A picture for the paper | Les Miserables, at rest | 13 (81%) | 88% | main menu 13; a saved view's camera icon 3 |
| 2 | How the bridges calculation was set up | Les Miserables, at rest | **4 (25%)** | 100% | the "Bridges off" layer in the Style stack 12; Results on the rail 4 |
| 3 | Rank the characters a second way | Les Miserables, at rest | 9 (56%) | 62% | Results on the rail 9; the table's "..." menu 4; a column header 3 |
| 4 | Get back a cleared selection | undo notice | 16 (100%); 13 (81%) notice-only | 50% | "Bring it back" 13; Ctrl+Z 3 |
| 5 | Where Valjean's betweenness comes from | Valjean selected | 16 (100%) | 100% | the betweenness row under Results 16 |
| 6 | Bring in next month's file | Transfers, at rest | 7 (44%) | 31% | "Change..." on the Loaded line 9; the file chip 6; the main menu 1 |
| 7 | Accounts that take in far more than they send | Transfers, at rest | 13 (81%) | 25% | the table strip 6; Quick actions 6; Results 1; "Change..." on the Loaded line 3 |
| 8 | Cheapest route, a bigger transfer costs more | Transfers, at rest | **1 (6%)** | 44% | "Change..." on the Loaded line ("amount not used yet") 15; Quick actions 1 |
| 9 | Has anything left the computer? | Transfers, at rest | 16 (100%) | 100% | the line under the project name 16 |
| 10 | Recolor Ribosome or Spliceosome | Proteins, at rest | 16 (100%) | 100% | the legend swatch 16 |
| 11 | Bring in the lab's colors-and-sizes file | Proteins, at rest | 11 (69%) | 31% | the main menu 8; Data 2; "+" on the Style stack 1; the palette icon beside Graph 5 |
| 12 | How Ribosome differs from the rest | Proteins, at rest | 12 (75%) | 81% | the Ribosome label 10; the table strip 2; "Full graph" 2; a canvas dot 1; "Change overview..." 1 |
| 13 | Make a hidden name always show (new) | Proteins, at rest | 9 (56%) | -- | the table strip 7; the legend's hidden-labels line 2; the magnifier beside "Graphs" 7 |
| 14 | Re-run with one setting changed, keep this one (new) | a run open | 11 (69%) | -- | Re-run 11; Compare with... 5 (all afraid Re-run would overwrite) |
| | **All prompts** | | **154 of 224 (69%)** | 72% | |

- **The Loaded line's "Change..." takes the most wrong clicks in the test:** 27 across prompts 6, 7
  and 8. On the cheapest-route prompt, 15 of 16 went there to say what a bigger amount means, the
  opposite of the per-run decision (finding 2).
- **Prompt 2 fell from 100% to 25%.** With runs off the right panel, the only word "Bridges" on the
  screen is a style layer, and 12 of 16 clicked it (finding 7).
- **Prompt 14's misses are decided, not drawn:** the run on that screen reads "Re-run", not
  "Re-run (keeps Run 1)", and all five who chose Compare with... said they feared Re-run would
  overwrite.
- **Money in and out on first click rose from 25% to 81%** now that the screens name money.

## Think-aloud: task success and ease

**Simulated participants.** Outcome codes: success (done, unaided), with difficulty (done after a
wrong turn, a guess or a step-in), failed (includes gave up). Ease is the Single Ease Question, 1
(very hard) to 7 (very easy); SEQ from simulated participants is not calibrated against real users.

| Task | Sessions | Success | With difficulty | Failed | Mean ease | Round 5 | Change |
|---|---:|---:|---:|---:|---:|---:|---:|
| Who matters most, and how sure are you? | 8 | 0 | 8 | 0 | 5.00 | 4.50 | +0.50 |
| What groups are there, and how does the biggest differ? | 7 | 0 | 7 | 0 | 5.00 | 4.80 | +0.20 |
| The edges carry a number: rank, and trust it? | 7 | 4 | 3 | 0 | 5.14 | 3.67 | +1.47 |
| Amount: cheapest route and most central, and what each used | 7 | 0 | 6 | 1 | 4.00 | 3.14 | +0.86 |
| Follow money forward from early August | 5 | 0 | 5 | 0 | 5.00 | 3.80 | +1.20 |
| Clear or refer a flagged account | 4 | 1 | 3 | 0 | 5.25 | 4.75 | +0.50 |
| A figure a reviewer can read in gray | 6 | 1 | 5 | 0 | 5.00 | 5.00 | 0.00 |
| A black-and-white fold-change figure; which genes went up | 5 | 0 | 5 | 0 | 5.00 | 4.20 | +0.80 |
| Two groups in colors you cannot tell apart | 7 | 0 | 7 | 0 | 4.71 | 3.00 | +1.71 |
| Update with this month's file; why did the group count change? | 6 | 3 | 3 | 0 | 5.33 | 4.33 | +1.00 |
| Top 200 by betweenness past the drawing limit | 6 | 0 | 6 | 0 | 3.83 | 3.60 | +0.23 |
| Get back after an unexpected change (both arms) | 16 | 2 | 8 | 6 | 4.38 | 4.17 | +0.21 |
| -- notice alone | 8 | 0 | 3 | 5 | 3.62 | | |
| -- notice plus Ctrl+Z restore | 8 | 2 | 5 | 1 | 5.12 | | |
| Fix the wrong middle filter step, keep the third | 6 | 4 | 2 | 0 | 5.67 | 5.25 | +0.42 |
| Keyboard only: find Javert, walk, select two | 5 | 0 | 2 | 3 | 3.60 | 3.75 | -0.15 |
| Leave yourself a note on why you kept these accounts | 5 | 3 | 2 | 0 | 5.40 | 4.80 | +0.60 |
| Make sure a colleague can tell which notes are yours | 5 | 1 | 4 | 0 | 4.80 | 4.00 | +0.80 |
| Is it OK to use with our data? | 6 | 0 | 6 | 0 | 4.83 | 4.67 | +0.16 |
| A colleague's file: worth an afternoon? | 6 | 2 | 4 | 0 | 4.83 | 4.33 | +0.50 |
| Top 50 by betweenness into Excel or pandas | 6 | 1 | 5 | 0 | 5.00 | 4.00 | +1.00 |
| Share your setup without your data | 5 | 1 | 4 | 0 | 5.00 | 5.25 | -0.25 |
| Answer IT: did anything leave? | 5 | 0 | 5 | 0 | 4.40 | 4.75 | -0.35 |
| Money in against money out | 6 | 0 | 6 | 0 | 5.00 | 2.00 | +3.00 |
| Make this project look like the team's | 6 | 0 | 6 | 0 | 4.00 | 3.17 | +0.83 |
| Rank again with one thing changed, and compare | 6 | 0 | 6 | 0 | 4.50 | 3.83 | +0.67 |
| A long calculation stopped partway | 6 | 0 | 6 | 0 | 4.67 | 4.40 | +0.27 |
| **Repeated from round 5 (25 tasks, unweighted)** | **153** | **23** | **120** | **10** | **4.78** | **4.13** | **+0.65** |
| Use a colleague's recipe on your gene list (flagged, not in the bar) | 5 | 0 | 5 | 0 | 5.00 | 4.80 | +0.20 |
| **Round-3 regressions** | | | | | | **Round 3** | |
| Look only at characters with 5+ partners (narrow or paint) | 5 | 1 | 3 | 1 | 4.60 | 4.8 | -0.20 |
| How is one account connected to another? | 5 | 0 | 5 | 0 | 4.60 | 4.2 | +0.40 |
| Too big to draw: anything worth a look? | 5 | 2 | 3 | 0 | 5.40 | 5.0 | +0.40 |
| Measure who bridges groups on the whole citation graph | 6 | 0 | 6 | 0 | 4.17 | 4.2 | -0.03 |
| Do these two rankings agree? | 5 | 2 | 3 | 0 | 5.40 | 5.5 | -0.10 |
| Redo last week's export on this week's data | 5 | 0 | 4 | 1 | 4.20 | 4.0 | +0.20 |
| Explain every count, and why it is not 300 | 5 | 0 | 5 | 0 | 4.60 | 3.7 | +0.90 |
| **New** | | | | | | | |
| Load a messy export; is it what you think? | 7 | 0 | 7 | 0 | 4.43 | -- | -- |
| Real change or noise in the ring's group? | 6 | 0 | 6 | 0 | 4.17 | -- | -- |
| **All of round 6 (per session)** | **211** | **28** | **171** | **12** | **4.72** | 4.10 | |

- **199 of 211 finished (94%); 28 of 211 (13%) without a wrong turn** (round 5: 94% and 3%).
- **The bar:** 4.78 against 4.13. It holds with either undo arm alone (4.81 with the kept arm, 4.75
  with the notice arm).
- **What moved up most:** money in against money out (+3.00; round 5 had 4 failures in 5, now 0 in
  6), restyle (+1.71), the weight trap (+1.47), the dated trace (+1.20), the weekly update and top
  50 into Excel (+1.00 each). These are the tasks where a round-4 or round-5 decision finally
  reached the screens.
- **What fell:** did anything leave (-0.35), share without data (-0.25), keyboard walk (-0.15).
  Three of the seven round-3 regressions are still below their round-3 means (narrow or paint,
  costly measure, rankings agree); none by more than 0.2.
- **The twelve failures:** five on the notice-alone undo arm (selection lost for good); three on
  the keyboard walk (Javert is not on the page, third round running); Emma on amount end to end
  (never saw a cheapest route); Elena on narrow or paint (reported 40 where the answer is 41) and on
  the restore arm (left the wrong filter on); Nadia on this week's export (refused to export
  March's data as this week's).

### Data quality

- Nine session summaries passed to this synthesis gave a different ease from the transcript; the
  transcript is used everywhere above. Seven were one point higher in the summary (figure for
  reviewer: the Gephi holdout and Jordan; restore arm: Elena; data stays here: Priya; top 50: the
  knowledge engineer and the Gephi holdout; money: Nadia) and two were 1 where the transcript says 5
  (weekly update: Sarah; load a messy export: Alex).
- The tree test ran one tree per persona, not both (above), and one session saw its answer key.
- Four sessions on the undo page were reset by the kit's Esc exit while the steps list was open
  (Part 1, mock 4).

---

## Part 1: problems caused by the mocks

Not counted against the design. Each cost the round signal.

### Mock 1. The gate failed and the round ran anyway (severity for the study: 4)

See "The precondition gate failed" above. Every gate item showed up in sessions: "Re-run" without
"(keeps ...)" drove the five misses on first-click prompt 14 and Elena's fear on two runs compared;
"on no bridge" was misread again (Jordan, Elena, Maren); the older right panel on the frame at rest
and the clipped inspector (Jordan, Elena, the Gephi holdout, Tom, Maren) made participants ask
whether they were in the same product. **Fix:** do not start round 7 until the gate items are
verified on the rendered pages, and make `check.mjs --tasks` fail when it checks 0 pages.

### Mock 2. The same fact disagrees between pages (fourth round running; severity 4)

- The sampled betweenness run says Directed in its header and Options and "citations read as
  undirected" with the undirected normalization in its record: top 200 (all 6), costly measure (all
  6), calculation stopped (all 6). Twelve distinct participants; the knowledge engineer, Emma, the
  Gephi holdout, Chris, Dr. Chen and Alex all refused to report the number. Third round unfixed.
- "Linked pairs 9,113" at rest against "412 rows repeat a pair" in the load step (load a messy
  export: Nadia, Marcus, Priya, Alex, the knowledge engineer).
- "No numeric edge column" right after confidence was read as a number (worth an afternoon: Alex,
  Elena, Maren, Jordan, Tom; read the numbers: Dr. Chen).
- "Attributes 4" against the dialog's 3 (Alex, Elena, Maren, Tom, Dr. Chen).
- Run numbers reversed between the results panel and the comparison (two runs compared: Alex, the
  Gephi holdout, Jordan, Chris).
- Dates and project names drift across the weekly-update, version-history and real-change screens
  (Nadia, Alex, Sarah, Marcus, Dana, Emma, the knowledge engineer).
- ACC-365386 is GB in March and US in August (Sarah, Marcus, Dana).
- Two drawings of the same GPU failure offer different actions (calculation stopped: all 6).
- Betweenness zeros 47 against 43 (the knowledge engineer; the Gephi holdout found 32 against
  NetworkX's 28 on the filtered run).
- **Fix:** the decision to bind every shared number to `kit/fixtures.json`, with a check proved to
  fail on a planted mismatch, has now been deferred for three rounds. It is the first thing to do.

### Mock 3. The task's data or result is not on the screens (severity 4 for four tasks)

- Keyboard walk: Javert is not on the page (all 5; third round). The task cannot be done as worded.
- Team colors: after the team's styles are applied the canvas stays grey and the old legend stays
  (all 6). Four would have pressed Undo, believing it failed.
- Amount end to end: no weighted route result and no centrality on transfers (all 7).
- Who matters, groups differ, two runs compared, gray figure: the Les Miserables or protein task
  jumps to protein, patent or payments screens partway (about 25 sessions); community rows cannot
  be clicked and "Compare with the rest" opens a payments page.
- This week's export: no "export again" state on April data; the only export dialog shows March and
  another case. Nadia refused to export (the task's one failure) partly for this reason.
- Did anything leave: no app state after a data-source query (all 5).
- Fixture names that collide with participants: the recipe sender "Maren", the note author
  "Marcus" and "Nadia" (Maren, Sarah, Priya, Marcus, Dr. Chen, Alex).

### Mock 4. The participant view leaks, hides or resets (severity 3)

- The study view hides the "not decided" notes, so the data page shows labels ending in a colon
  while the Data panel says "Not decided yet" (all 11 data-page sessions; third round).
- Esc in the participant view exits and resets the page, because the undo page's steps list closes
  on Esc without stopping the key (Morgan, Marcus, Emma, Jordan; two thought the product had thrown
  away their work). The owner asked for Esc to leave the participant view; the page must mark the
  key handled when it uses it.
- The failure storyboard and the compare-versions flow render blank in the study view (Alex, Emma,
  the Gephi holdout, the knowledge engineer, Dr. Chen).

---

## Part 2: design findings, most severe first

Each finding says **new**, **decided, not drawn**, or **repeated** (seen in an earlier round and
still open). Participant counts are distinct simulated personas.

### 1. Undo without the restore loses the selection for good (severity 4, confirmed; answered)

- **Status:** answered this round by the arm comparison; keep the Ctrl+Z restore.
- **What happens:** see the undo table above. In the notice-alone arm, 5 of 8 lost the selection
  permanently after one Ctrl+Z; the notice reads as a report, not an offer (Dana, Alex, Emma), and
  the spoken text still tells screen-reader users "Ctrl+Z brings it back" in the arm where it does
  not (Morgan, who followed it). The table then keeps saying "showing the selection just cleared"
  with no way to reselect (Alex, the Gephi holdout, Emma, Dana, Marcus).
- **Focus group:** all five in "getting back" said a notice that fades does not exist for them and
  asked for one that names what was lost and what was kept. Discount: primed against Ctrl+Z.
- **Recommendation:** ship the restore arm. Keep the notice until something else changes; name
  what was cleared and what was kept ("18 selected nodes cleared; 3 filter steps unchanged").

### 2. The Loaded line invites setting a weight's meaning on the data (severity 3, confirmed; reopens)

- **Status:** new evidence against the round-5 decision that the meaning is chosen in each run.
- **What happens:** the state line reads "amount not used yet. Change..." and "Change..." opens the
  load choices. On first click, 15 of 16 went there for the cheapest route, 9 for next month's
  file and 3 for money in and out. In the tree test 10 of 16 opened the column during task 5 and
  4 stayed there. In sessions the load step sets amount's role to "Weight" and the next screen says
  "not used yet" (load a messy export: Sarah, Nadia, Marcus, Priya, Dana, Alex; 6); Sarah and Alex
  on amount end to end expected to "tell it once". The focus group "money as money" rejected
  asking on every run (4 of 5) and wanted the meaning set once and stamped on each result with who
  set it and when.
- **Recommendation (studio, reversible):** keep the choice in the run, but stop the data line from
  promising it: drop "Weight" as a load role and replace "not used yet. Change..." with a line that
  says where the meaning is chosen ("amount: each run that uses it asks what a bigger amount
  means"). Then offer the previous run's answer as the default on the next run, stamped with when
  it was given, which answers "tell it once" without putting the meaning on the column. Test with
  first-click prompt 8 unchanged.

### 3. The path's weight editor comes filled in with the wrong reading (severity 4, confirmed; decided, not drawn)

- **What happens:** the found path's "a bigger amount means" is prefilled with "a closer or stronger
  link: the path prefers big transfers", the opposite of cheapest, while the betweenness form waits
  on "Choose...". All 7 on amount end to end (Alex, Priya, Emma, Sarah, Marcus, Chris, Dana); Alex,
  Priya and Marcus caught it only by reading the line underneath. Related: the weight list opens
  with the wrong first answer highlighted, so Enter picks it (the weight trap: Alex, Elena, the
  Gephi holdout, Jordan, Emma; Elena said she would have taken it).
- **Decision:** nothing preselected, per run (round 5). **Recommendation:** draw it on the path
  editor; open the list with nothing highlighted.

### 4. Stacked degree filters count degree on what is left, and the count is silently wrong (severity 4, confirmed; repeated)

- **What happens:** with "Filter to degree >= 2" above it, "degree >= 5" keeps 40, not the 41 the
  question means. Elena reported 40 and failed; Alex nearly handed in 40; the knowledge engineer
  and the Gephi holdout spotted it by arithmetic. The only warning is a grey line ("among the 60 it
  reads"). The filtered run on screen is also on a different subset (60 of 77) from the filter just
  made, and nothing flags the mismatch (Alex, Elena, the Gephi holdout, the knowledge engineer,
  Jordan).
- **Recommendation:** when a degree step follows another step, show both counts in the row ("40
  left; 41 on the full graph") and let the step choose which graph it counts on. On a run whose
  scope differs from the current filter, say so on the run and on Re-run ("Run on 41 of 77").

### 5. A cheapest route is never shown with its total, and its tie cannot be seen (severity 3, confirmed; repeated)

- **What happens:** amount end to end (all 7) never saw the weighted route or a dollar total; how
  connected (Sarah, Marcus, Priya, Nadia, Dana) got "Ties: 1 of 2 as short" with no way to view the
  second route; the Edges footer adds both tied routes together (Dana, Marcus). In the tree test 12
  of 16 opened a path's Members for its money total (task 11 direct fell from 69% to 25%).
- **Recommendation:** the found path states its own total and its tie stepper, and a path's Members
  row gives the total beside the count ("3 transfers, $22,397.82").

### 6. "In order" checks dates, not money; the in-and-out split exists for one account only (severity 3, confirmed; new)

- **What happens:** on the dated trace (all 5: Nadia, Priya, Sarah, Marcus, Dana) each first-hop
  account pays out about three times what it received, yet every row says "in order". Sarah rated it
  4: a junior would write "the funds were forwarded" in a report. The footer splits money at the
  From date for the selected account only, and leaves out money that arrived after it (Nadia).
- **Recommendation:** rename the column to what it checks ("after the transfer that reached the
  sender"), add received-against-sent per hop account, and show money arriving after the From date.

### 7. A style layer named after a run does not lead to the run (severity 3, confirmed; new)

- **What happens:** first-click prompt 2 fell from 100% to 25%: 12 of 16 clicked the "Bridges off"
  layer to see how the bridges calculation was set up. Maren and the knowledge engineer read
  computed values under "Attributes" as file columns, and three inspectors disagree on where a
  computed value lives (the knowledge engineer, the Gephi holdout, Alex on who matters).
- **Recommendation:** a layer made by "Show as style layer" names its run and opens it ("From:
  Bridges, Sep 28"); computed values sit under Results on every inspector, never under Attributes.

### 8. An opened run's Top nodes is taken for one node's value (severity 3, confirmed; new)

- **What happens:** tree task 2 fell from 94% to 44% direct; 9 of 16 opened Top nodes looking for
  Valjean, 3 stayed. Knowledge of where a node ranks is on the node and in the table, but the rail
  place is now the first place people look.
- **Recommendation:** give an opened run a "Find a node's rank..." row that selects the node and
  opens its row, so the wrong first click still lands.

### 9. The weekly and monthly re-export does not say which data it uses (severity 3, confirmed; new)

- **What happens:** on this week's export (all 5), "Export again" is a circular-arrows icon read as
  refresh; saved export rows carry no data version (an April-named file dated the day April loaded),
  and the new file keeps the old name. Nadia refused to export and Marcus could not finish with
  confidence. Dragging the new file in leads to "Add data" as the primary button (Nadia, Dana,
  Alex).
- **Recommendation:** label the action "Export again, on April data"; each saved row names the data
  version it was made from; the file name carries the data period; make Replace primary on the drag
  path as it is on Update with new data.

### 10. Too-close colors: the check is silent on the default pair and does not say for whom (severity 3, confirmed; repeated)

- **What happens:** restyle (all 7) came to fix the default orange and vermilion; no flag. A picked
  dark gold beside orange gets no flag either, while a picked light blue does (Dr. Chen, Elena, the
  Gephi holdout, Jordan). Maren (rated 4) and Tom, who has red-green color weakness, asked "too
  close for whom?". With eight groups, "Not used in this layer" is empty (Dr. Chen, Maren, the Gephi
  holdout, Jordan). Legend swatches at rest show no sign they can be clicked (Elena, the Gephi
  holdout, Jordan, Tom).
- **Recommendation:** run the check on every pair in the layer, not only picked colors; say what it
  measures ("close for red-green color vision"); when the palette is used up, offer colors that
  clear every neighbor; give the swatch a hover ring at rest.

### 11. Groups: rows cannot be opened, and the same group changes color between partitions (severity 3, confirmed; repeated)

- **What happens:** groups differ (7): a community row cannot be selected, so Compare with the rest
  is out of reach from the table (Dr. Chen, Dana, the Gephi holdout, Maren). Ribosome is amber under
  Louvain and light blue under the file's modules, and amber means Proteasome there (Dr. Chen, Maren,
  Jordan, Dana, the Gephi holdout, Elena; two misread the map). The fold change is a mean in the
  table and a median in the comparison, with opposite signs (Emma, Jordan, Elena).
- **Recommendation:** a community row selects its members and opens the group's panel; when a
  partition is shown after another, match colors by overlap (as the weekly update already does);
  one statistic per column across surfaces.

### 12. How sure is the order: the near-tie rule is misread and missing on the graph asked about (severity 3, confirmed; repeated)

- **What happens:** on who matters (8), the tie sentence exists on the protein run but not on the Les
  Miserables run (Alex rated 4, Elena, the knowledge engineer, Jordan, Dr. Chen, Emma; partly the
  mock). Where it appears, "over the 1% tie line; the smallest is 1.2%" is read as "basically tied"
  (Maren, Jordan) or as rounding, not stability (Dr. Chen, Emma); 1.5% gaps are left unmarked
  (Alex, the Gephi holdout). Values show at two precisions (0.57 and 0.570; Alex, the Gephi holdout,
  the knowledge engineer).
- **Recommendation:** state the answer, not the rule ("#4 and #5 are within 2% of each other; treat
  them as tied"), on every ranking; one number format per measure.

### 13. Team look: "Use these styles" also removes the reader's own finding (severity 3, confirmed; new)

- **What happens:** team colors (6): the dialog lists the reader's layers that go, and they include
  a finding such as the Mule ring highlight (Jordan rated 4; Elena feared losing the ring; Dana
  wanted one sentence on what the file sets). There is no preview of the result (Elena, Jordan, the
  Gephi holdout). The focus group "a look you receive" named silent overwriting as the reason all
  six would quit (discount: seeded by one participant; 2 independent voices).
- **Recommendation:** "Use these styles" replaces only layers that paint the same property for the
  whole graph; layers scoped to a set or selection stay. Show a before-and-after thumbnail and the
  match count in the dialog.

### 14. Rank columns export as text, and the table opens on the wrong measure (severity 3, confirmed; repeated)

- **What happens:** top 50 into Excel (6): rank cells like "4=" and "near #8" make the column text in
  pandas and Excel (Emma, the knowledge engineer, Chris, Alex, the Gephi holdout). The three-measure
  table says it is sorted by PageRank "the run that opened the table" when it was opened from
  betweenness (Dr. Chen, Emma, Chris; third round).
- **Recommendation:** export rank as an integer and the tie mark in its own column; sort by the run
  that opened the table.

### 15. Top 200 on an estimate: the cut and the neighbors' scope are not stated (severity 3, confirmed; repeated)

- **What happens:** top 200 (6): Keep top rows over a sampled score reports only exact ties at the
  cut, though rows past 200 are inside the error bound (Emma, the Gephi holdout, the knowledge
  engineer, Chris, Dr. Chen). After a keep step, nothing says whether Neighbors of a node reaches the
  full graph or only the 200 (Priya, Emma, the Gephi holdout, the knowledge engineer, Chris, Dr.
  Chen). citationsReceived (max 779) is read as in-degree (max 236) (too big to draw: Emma, Chris,
  the knowledge engineer, the Gephi holdout, Dr. Chen; third round).
- **Recommendation:** "N rows are within the error bound of row 200" on the keep step (decided in
  round 5, not drawn); a Scope line on every neighbor step; say on the column header that the count
  includes citations from outside the sample.

### 16. Load a messy export: the checks people use are hidden or missing (severity 3, confirmed; new)

- **What happens:** load a messy export (7): the dollar total appears only inside the amount issue's
  dropdown (all 7); no first and last date or time zone (Sarah, Nadia, Marcus, Priya, Alex, the
  knowledge engineer); the account with 907 transfers is not named (Sarah, Marcus, Priya, Dana,
  Alex, the knowledge engineer); the privacy line appears only after the file is loaded (Marcus,
  Priya, Dana, Alex rated 4).
- **Recommendation:** "What will load" gives rows, the amount total, the date range with its zone,
  and the top account; the data-stays line sits in the load step.

### 17. Counting units drop off after a filter (severity 3, confirmed; new)

- **What happens:** read the numbers (5): the full-graph panel says "edges (rows)" and "linked
  pairs"; the filtered panel says "Interactions 217 of 1,262" and the Results overview plain
  "edges" (Maren rated 4, Dr. Chen, Elena, Tom, Alex). After the filter, the Results panel shows
  "Full graph" and a run on 300 nodes, so three asked whether the filter was undone (Alex, Elena,
  Tom).
- **Recommendation:** one set of counted nouns with units on every panel; a run's panel says when
  its scope differs from the current filter (see 4).

### 18. Notes: a name set today does not reach earlier notes (severity 3, confirmed; new)

- **What happens:** notes with names (5): the name applies from now on and nothing puts it on
  earlier notes (Alex, Dr. Chen, Marcus rated 4, Nadia). In a one-author project the saved note shows
  no name, so nobody can check what was recorded (Alex, Sarah, Marcus, Nadia). The owner's rule (the
  author is shown only when a project holds more than one) stands; this is evidence on how it plays,
  not a question.
- **Recommendation (studio):** offer "Put my name on my N earlier unnamed notes" when the name is
  first set; keep "Saving as" visible in the note editor on every edit.

### 19. Flagged account: no Refer action, and the export leaves out the reason to refer (severity 3, confirmed; repeated)

- **What happens:** flagged account (4): the referral is "Create set" in the filter chip's step menu,
  found by accident (Priya, Sarah, Marcus, Nadia); the export defaults to the account's own 8
  transfers, not the 13 that show the ring (Priya, Sarah, Marcus, Nadia).
- **Recommendation:** "Keep for referral" on the selected account's panel; when a filter step is on,
  the export's default scope is the step.

### 20. Real change or noise: the answer has to be assembled (severity 3, confirmed; new)

- **What happens:** real change or noise (6): no breakdown of the ring's group into stayed, left,
  joined from other groups and new (Sarah, Marcus, Alex, Emma, the knowledge engineer); no verdict
  sentence linking month-to-month agreement (3 in 10) to re-run agreement (6 in 10) (Dana, Alex,
  Sarah); "large change" on the version badge is driven by 26 silent accounts (Alex, Dana, Marcus,
  Sarah); the group's stability is given for April only (5).
- **Recommendation:** a four-number breakdown for the selected group; one sentence ("the months
  differ more than two runs on one month do"); stability for both months; the badge counts silent
  accounts separately.

### 21. How connected: no Path to... on an account (severity 3, confirmed; repeated)

- **What happens:** how connected (5): the account inspector on transfers has Neighbors but no Path
  to... (the protein inspector has it), and the Path tool's icon has no label (Sarah, Marcus, Priya,
  Nadia, Dana).
- **Recommendation:** one inspector header for every dataset, with Path to...; label the toolbar tool.

### 22. Which genes went up: the figure and table rank by size, not sign (severity 3, confirmed; repeated)

- **What happens:** gray figure (5): labels are top N by absolute change and the fold-change column
  is not in the table, so "which went up most" is pieced together from the legend and minus signs
  (Dr. Chen, Emma, Maren, the Gephi holdout, Jordan). Small triangles at low degree cannot show up
  or down (Emma, Maren, Jordan, Dr. Chen, the Gephi holdout).
- **Recommendation:** "Top N increases" and "Top N decreases" as label rules; the colored column in
  the table; a minimum mark size in the Print look.

### 23. Rankings agree: the table's summary contradicts the comparison (severity 3, confirmed; new)

- **What happens:** the table line "The top 10 are the same on both measures" (March data, measures
  unnamed) sits after the comparison's "0 of the top 50 in both" (Alex rated 4, Jordan).
- **Recommendation:** every agreement sentence names both measures and the data version.

### 24. The data page cannot be approved: hosting and telemetry are open (severity 3, confirmed; repeated)

- **What happens:** data stays here and did anything leave (11 sessions, 7 participants): "Not
  decided yet" for who hosts graphty, usage statistics and an organization-wide Assistant switch is
  read as "no" by every regulated participant (Sarah, Priya, Marcus, Dr. Chen, Dana, Nadia, Alex).
  The page's blanks are a mock defect (Part 1); the undecided answers are not.
- **Recommendation:** these are owner-level answers; they are listed in the round's open questions
  and not re-asked here.

### Findings at severity 2 or below (grouped)

- Restoring a selection swaps the right panel from Statistics to the selection, so the numbers the
  task is about disappear (restore arm: Alex, Elena, the Gephi holdout, Marcus; severity 3 by count,
  held to 2 because nothing is lost).
- Undo cannot reach a middle filter step without taking the good one first (both arms: Alex,
  Marcus, Emma, Jordan, Dana, Morgan); the steps list saves it.
- Blank "full graph" cells where the value matches read as missing (Alex, the Gephi holdout, Marcus,
  Emma, Jordan).
- Filter-step rows open their menu only on hover (Alex, Elena, Marcus, the knowledge engineer, Dana).
- Two Look controls (project and file) read as one (Alex, the Gephi holdout, Jordan, Elena, Emma,
  Maren).
- Merchants top every money-in list and nothing says so (Sarah, Dana, Marcus, Nadia); no ratio
  column.
- "Recipe" is not the word for a colors file (Elena, Jordan, Tom, Dana, the Gephi holdout).
- The flagged failure of a GPU run has no mark on the Results rail once the notice clears (Emma,
  Chris, Dr. Chen, Alex; decided, not drawn).
- Find's empty result does not say what it searched (Emma, Chris, Alex).
- A way to find one node at rest: 7 of 16 clicked the magnifier beside "Graphs" to find a protein
  (first-click prompt 13).

### Single-participant findings to keep (not confirmed)

- Morgan (screen reader): focus drops to the page body after Ctrl+Z, Bring it back and the filter
  chip; the Les Miserables legend names no colors; a note's Ctrl+Enter is silent. Morgan is the only
  screen-reader persona, so these cannot be confirmed by count; treat them as severity 3 until a
  real screen-reader user checks them.
- Dana: notes and filter values travel in a "no data" recipe and may carry supplier names.
- Marcus: transfers have no bank reference or source row for discovery.

---

## Focus groups

- **Runs on the rail** (6): all six expected values behind "Results" in their first answers; the
  tree test says the label works in practice, so behaviour wins. Re-run must never overwrite (3
  independent voices); every computed column should name its run.
- **Getting back** (5): a notice that fades is missed by everyone for a different reason; it must
  say what was lost and what was kept. The group was primed against Ctrl+Z; the arm comparison is
  the evidence that counts.
- **Money as money** (5): set a weight's meaning once and stamp it on every result (finding 2);
  totals must reconcile to the penny with a row count and date window (finding 16).
- **A look you receive** (6): fear of silent overwriting; show the effect before Apply (finding 13).
  Discount: the fear was seeded by one participant.

## What round 7 must do first

1. Pass the gate on the rendered pages, including a `check.mjs --tasks` that fails on 0 pages
   checked, and bind every shared number to the fixtures (Part 1, mocks 1 and 2).
2. Run every tree-test persona on both trees in separate sessions if the label question is ever
   reopened; this round the label stays "Results".
3. Re-test the cheapest-route first click (prompt 8) and tree task 5 after finding 2's change, with
   the wording unchanged.
4. Draw the decided-but-missing items: nothing preselected on the path editor, "Re-run (keeps ...)",
   rows within the error bound, the unseen-failure mark on the rail.
