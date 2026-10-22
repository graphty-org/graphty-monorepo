# Tier 2 round 4 insights: returning users on the real graphty app

What round 4 of the returning-user study shows, on build 5277e2cbe1bd (graphty@0.8.64), after two
independent skeptics checked every fault, bar, problem and candidate insight in `scores.md` against
the grades, transcripts, briefings, persona files, screenshots, the four expert reports and the
build's source. Rule applied: a claim both skeptics drop is dropped; a claim either one weakens or
drops is weakened, unless the other answers its reason with evidence. Most severe first. Severity
is Nielsen 0 to 4 (4 = cannot be done, the user leaves, or reports a wrong answer unknowingly).
Screenshot paths are relative to this folder.

All participants are simulated: one model playing personas, each told a history of earlier
sessions. A failure is strong evidence; a pass is weak until real people confirm it. Seven sessions
saying the same thing are one model's habit, not seven people. This round two more priming sources
were found in the briefings themselves (item 3), so several "noticed unprompted" counts below are
discounted, and each says so.

**53 of 53 valid sessions succeeded; 3 sessions were lost to the study runner and are still owed.**
After the checks, bars 1 to 8 and 11 hold, and two bars still fail: bar 9 (b), an edge's inspector
two words over its limit, and bar 10, on two confirmed severity 3 findings (items 1 and 2).

## 1. Confirmed severity 3: drawn names and nodes cover each other and the ties a task asks about

**Both skeptics keep it.** On bus stops the "Stadium" label sits over most of the short
Station-Stadium tie (`sessions/r4-s08/01.png`), so a click aimed at the tie picked the Stadium stop
in r4-s04 and r4-s08 (`sessions/r4-s08/02.png`). On friends "Hana" is drawn on Ivan's dot; sized
nodes are drawn inside each other (Chloe and Farah; Creek and Summit, named in 3 of 4 T20 B grades:
r4-s30, s32, s34). Two specialists (screenshot audit, visual) report it with screenshots.

- Part of each T24 miss is the simulated participant's: both clicked at a point estimated from a
  screenshot without hovering first, where a real pointer would have shown the hover.
- The setups tick "Show all labels", which turns the element's label declutter off. The overlaps
  that cost clicks are a label over a tie and a label over a dot, which declutter (label against
  label only) does not avoid, so they remain with it on.
- "Nothing names who a filter left out" (T17) is folded in here: in all three sessions the doubt
  came from two overlapping dots on friends with no names drawn.
- Owner: graphty-element (label placement that avoids ties and dots, and a layout that spaces
  centers by drawn size). Already on the owner's list.

## 2. Confirmed severity 3: the find box offers a rule for a bare number, then refuses it

**Both skeptics keep it, and one says the scores understate it.** On bus stops, typing "10" offers
one highlighted row, "=`10`" with "Select its matches"; Enter answers in red "Not a rule Find can
read (at character 2)" (`expert/figma/find/08.png`). No "is 10 or more" row appears, because 10 is
not a value in the minutes column.

- `tool/files/bus-stops.csv` has no 10 in its minutes column, and T22 A's prompt asks for stops
  "10 minutes or more" on that file. So the task's most natural first move, typing the prompt's
  number, lands here. In round 3, 4 of 4 participants on the other half typed the bare number
  first.
- No round 4 session met it (r4-s09 typed "minutes"; r4-s10 was on Les Miserables, where 10 is a
  value and the "or more" row appeared and was taken).
- Severity is contested between specialists (controls 3, visual 1); it stands at 3 because it
  sits on the route the task invites and ends in a refusal of the app's own suggestion.
- Owner: graphty app (never suggest a rule the box will refuse) and graphty-element (an "or more"
  row for any number inside a column's range, not only one that is a value).

## 3. The study's faults: an unenforced gate, three lost sessions, and briefings that leak answers

**Both skeptics keep this; it limits what every other count can show.**

- **The gate did not run, two rounds running.** `plan.md` has no "Gate evidence" section, and the
  scripted bars were run only after the sessions, outside this folder. The runner did not refuse
  to start without them.
- **Three sessions are void and still owed** (r4-s05, r4-s20, r4-s28). The runner started each
  participant while all four browser slots were taken; `real.mjs --start` waited past the shell
  call's limit and went to the background; the participant armed a monitor and ended its turn
  ("Waiting for the browser slot to free up."), and a workflow participant's ended turn is its
  return, so the start never ran. No bar's verdict depends on them.
- **Every briefing carries the tool's data-file table, which states each file's contents.** It
  tells T21 participants that `team-v2.csv` has "two new people (Mo, Nia)" and that each weight in
  `friends-v2.csv` "is now 6 - w", and T4 participants that one row of `passes.csv` names `s11`,
  "who is not in players.csv". r4-s38 named "Mo and Nia" on the Replace page before anything on
  screen named them (`sessions/r4-s38/05.png`). The same table lists `--shift-click` among the
  tool's commands. The leak check reads only participant logs, so it cannot see this.
- **The personas and histories prime two behaviors the scores called unprimed.** The nonprofit
  analyst's persona "checks counts before and after"; the student's "will count the rows". Six of
  seven T17 histories say earlier rankings ran "from the analysis button in the toolbar".
- The same file table was in round 3's briefings, so comparisons between rounds are not skewed;
  claims that something was noticed unprompted are.

Before round 5: the runner refuses to start without gate exit 0 and starts a participant only on a
free slot; the briefing's file table names each file and its kind only; the owed re-runs r4-s05b,
r4-s20b and r4-s28b run from new folders.

## 4. Severity 2: with a filter step on, the data table lists everything and does not say so

**Both skeptics keep the problem and lower it from 3 to 2, and both take it out of bar 10.** In
`sessions/r4-s27/09.png` the top bar, the step row and the Overview read "19 of 20 nodes, 12 of 41
edges" while the table's Edges tab reads "41 edges" and lists Ava-Ben 3 and Ava-Dev 2, ties the
step hides, with only "In the order loaded" above them. r4-s21 met the same.

- Both participants still reported the right number, from three other places on screen that
  agreed. r4-s27: "That shook my confidence for a moment."
- The two sessions share one trigger (the same pair of overlapping dots, item 1) on the same task
  half, and one persona is scripted to check counts.
- Bar 5 holds by its own words (the answer key's T17 route never opens the table); the problem
  stays open at severity 2. Owner: graphty app (the table shows what the step keeps, or says that
  it shows everything).

## 5. What worked: the Shift-click fix carried T24 from 2 of 4 to 7 of 7

T24 (select exactly the two ends of one tie) passed 7 of 7 with 0 false "done" (round 3: 2 of 4,
2 false "done"), a median of 4 steps against round 3's 7.5, and 0 wrong turns at the median. Every
participant clicked one end and Shift-clicked the other (`sessions/r4-s08/05.png`), the route the
graphty-element fix added this round. T17's new toolbar Filters button was the first and only door
in 7 of 7, and T17's wrong turns fell to 0.

**Both skeptics weaken the insight drawn from this** ("a fix that matches a habit is used by
everyone; a menu command by no one"):

- Priming was not low: the briefing lists `--shift-click`, and the histories point at the toolbar.
- One model's single habit, not seven people. Round 3, when Shift-click failed, 4 of 4 tried a
  modifier click first, which supports the habit half.
- "Used by no one" is not shown: "Select endpoints" was unnecessary once Shift-click worked, and in
  round 3, 2 of 4 found it in the menu.

Kept: a control that does what a common habit expects is used at once. Not shown: that a menu
command is not found when it is needed.

## Bars after the checks

| Bar | Verdict | Why |
| --- | --- | --- |
| 1 Success rate, each task and half | Holds | Holds even if the three owed re-runs fail. T4's half is discounted: the briefing named the unmatched row |
| 2 Earlier work kept | Holds | The second path run replacing the first is real every time (item below) |
| 3 Confirmed severity 4 | Holds | |
| 4 Silent commit | Holds | The second run changes the drawing, the run row and the Values |
| 5 Numbers that disagree | Holds by its words | Problem kept open at severity 2 (item 4) |
| 6 False "done" | Holds | |
| 7 Weight read as loaded | Holds; (b) "for the right reason" weakened | T20's prompt says "a longer walk"; T21's briefing told participants the new weights are inverted |
| 8 Automated accessibility | Holds | "Shortest path" under Recent and in its section is dropped as a shared-name defect: same command, same name. The note's "Graph" chip beside the rail's "Graph" button stays at severity 1 |
| 9 (b) Words at rest | **Fails** | An edge's inspector 29 against 27; the two extra words are scope words ("full graph", "of nodes") |
| 10 Expert and audit | **Fails** | On items 1 and 2 alone. The specialists' totals rising from 139 to 153 is mostly ground walked for the first time, not evidence of regression |
| 11 Cost of the core four | Holds | Better than reported: the tool refused an ambiguous click in about 15 sessions (7 of 8 on T20), each adding one step. T18 sits on its limit (8 against 8) |

## The rest of bar 10's list

- **The "is N or more" row names its layer by the field path ("data.minutes >= `5`")**: weakened
  to severity 2 by both. Real (`atLeastOf` in graphty-element's `session/query.ts`); the
  specialists split 3 and 2; readable jargon; no session styled that row. Owner: graphty-element.
- **The "or more" row sits below the fold in the find list**: weakened to severity 2 by both, not
  shown on any task. It appears under the fold only on friends with "4", a file no find-box task
  uses; measured at 1200 x 900 and 1280 x 800, while sessions ran at 1440 x 900. Owner: graphty app.
- **One-specialist severity 3s still to script before fixing:** an off filter step that turns
  itself on when its editor closes (`Filters.tsx`); New project, then Discard, showing the error
  page. **One session at severity 3, to script:** a rule on a column that does not exist runs and
  answers only "Nothing matches this rule" (r4-s12).

## Problems after the checks

**Kept at severity 2:**

- A second Shortest path run replaces the first with no notice (T18, 7 of 7). The cost is not
  shown: all 7 had written the first chain down, no task asked for both, and the 7 complaints
  share one near-identical sentence.
- "Direction: As the file says" loads a CSV directed without saying so (T20). Merged into it: Follow
  "Out / All" unexplained and ties titled "From -> To" with arrowheads for two-way relations (T20,
  T18, T23, T24). r4-s30 and s33 finished unsure their route was valid.
- A whole-number column loads with the role "Attribute" and "Weight: none", needing two choices
  (T20, 7 of 8; also T4).
- Opening a node's Degree arrow selects the node and all its neighbors (r4-s04, r4-s54; round 3
  three more).
- Nothing lasting says whether the project is saved (r4-s40, s55, s56).
- The find box's threshold rows are invisible until a number is typed; r4-s11 never found them
  (T22).
- A path tie drawn through a node not on the path (T18, three sessions and the visual report).
- After Rerun nothing shows how the ranking changed (T21, one session at 2).
- A new note takes the inspector's subject and the form cannot change it (T19, 2 of 2 and every
  earlier round).
- The unmatched row keeps its warning mark after the reader's choice (T4).
- T23's neighbor list behind an unlabeled "..." and "Filter to neighbors" going gray with no way
  back shown.

**Weakened to severity 1:** no names drawn unless the setup turns them on (the setups chose names
off and no participant tried hovering a node; on T20's default drawing, 8 of 8 checked routes in
lists and r4-s36 took the wrong dot for the Summit); "PageRank, full graph" not saying what it
means; Shortest path not on the Analyze list's first screen (typing found it first in 15 of 15);
"4 hops" against "5 nodes, 4 edges" (all 7 read it right); no count before "Add step"; "Capacity"
explained only once chosen; Replace with no visible control (8 of 8 found it, though persistent
simulated participants overstate how often real users would); the old histogram and Top 10 at full
contrast after Replace (0 of 8 misled; the "five named it as a risk" were mostly grader wording).

**Dropped or weakened as evidence:** "4 of 4 read the new blue dots as newcomers" (the prompt says
two people joined and the briefing names them); "4 of 4 noticed the misfit" on T4 (the briefing
named it); the segmented control read right 4 of 4 on T4 stands, but on primed participants.

## Insights after the checks

1. **A control that does what a common habit expects is used at once** -- weakened (item 5).
2. **A feature with no visible control costs a guess** -- weakened from "is still found by a guess
   every time": r4-s11 never found the threshold rows, and simulated participants try every menu.
3. **Readers check an answer in the table, so the table must agree with the drawing** -- weakened:
   two sessions with one trigger, and one persona scripted to check counts (item 4).
4. **A second run replacing the first is noticed** -- weakened from "repeat work needs the earlier
   answer kept": no one needed the first chain afterwards.
5. **On the app's default drawing, a drawn answer can be checked only against a list** -- weakened:
   shown on T20's default drawing (8 of 8), not on the setups, which turn names off by choice.
6. **A study gate that is not enforced is not a gate** -- kept by both, with the leaking briefing
   added as a second fault of the same kind (item 3).
