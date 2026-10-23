# Tier 2 round 5 insights: returning users on the real graphty app

What round 5 of the returning-user study shows, on build 8c015b806 (graphty@0.8.65), after two
independent skeptics checked every bar, problem and candidate insight in `scores.md` against the
session transcripts, the briefings, the participants' histories (`../../roster.md`), the answer key
and the screenshots. Rule applied: a claim both skeptics drop is dropped; a claim either one weakens
or drops is weakened, unless the other answers its reason with evidence. Most severe first.
Severity is Nielsen 0 to 4 (4 = cannot be done, the user leaves, or reports a wrong answer
unknowingly). Screenshot paths are relative to this folder.

All participants are simulated: one model playing personas, each told a history of earlier
sessions. A failure is strong evidence; a pass is weak until real people confirm it.

**In short.** 55 of 55 valid sessions succeeded and every task meets its floor. Two bars fail:
bar 9 (b), an edge's inspector at 29 words against 27, and bar 10, on one confirmed severity 3
(drawn names and nodes covering each other). Several findings in `scores.md` came from the study,
not the app: how steps are counted (bar 11's "on the limit"), the histories (the Style tab), the
setups (T19, T21) and the prompts' own words (T20's weight, T22's funnel). With those removed, the
round shows few new design problems, and the strict reading of the stall rule is met (item 3).
One session is void and its re-run is owed (r5-s02bb, Ruth, T22 B); no bar depends on it.

## 1. Confirmed severity 3 (bar 10): drawn names and nodes cover each other

**Both skeptics keep it.** On friends two nodes are drawn inside each other at the bottom of the
drawing, and drawn names sit on other nodes (`expert/visual/narrow/02.png`). On T17 A the
overlapping pair hides one tie at "5 or more", so a count by eye does not match the count on
screen: r5-s09b, s11b and s15b could not check the dots, and r5-s09b could not see the fifth tie at
all (`sessions/r5-s09b/10.png`). The same class shows on T20 B (Creek and Summit drawn inside each
other).

- It is one drawing per dataset, so it counts once per dataset. The specialists rate it severity 3;
  the sessions alone support severity 2, because nobody was misled into a wrong answer.
- **The tie-click half did not reproduce.** Three clicks on the Station-Stadium tie on this build
  (r5-s26b, s28b, `expert/figma/path/27.png`) all got the tie. Round 4's scripted claim
  (`claims/c-tie-click/`) was made on 5277e2cbe and has not been re-run here.
- Owner: graphty-element (label placement, and a layout that spaces centers by drawn size). Already
  on the owner's list; the studio cannot close it alone.

## 2. The study measured itself in four places; correct these before any round compares

**Both skeptics found each of these.** Each one put a study artifact into `scores.md` as a design
finding.

**Step counts (bar 11 and every cost comparison).** The answer key counts typing a name and picking
it as one step (`--type Chloe --click "Chloe"`, `../../answers.md` T18 A), and the tool accepts that
in one call. Participants sent typing and picking as separate calls, and opened Analyze, typed
"path" and picked as three. r5-s19b's 8 steps (Analyze, type "path", pick, type Chloe, pick, type
Milo, pick, Find path; end state `sessions/r5-s19b/09.png`) are about 5 counted the key's way. r5-s17b's
and s23b's 9 each include a click the tool refused ("Chloe" is the node and its ties); r5-s22b's
includes a hover.
- **Dropped as a design finding** (one drop, one "weaken hard", and both name the same mechanism):
  "T18 holds on the limit only because two answered by hand; tool users' median 8.5". Bar 11 holds
  for T18 with room to spare once counted the same way.
- What remains real: nobody used the P key (0 of 74 over five rounds), and searching the Analyze
  list costs one or two actions more than P. That is not a cost problem.
- The same skew is in T20's and T21's medians and in every comparison with earlier rounds. Count
  participants and the key the same way before bar 11 means anything.

**Histories steer first moves (T22's Style tab).** All three who went to Everything > Style first
(Alex r5-s03b, Elena r5-s06b, Jordan r5-s08b) have histories naming "the Style tab of Everything"
as where they color or size dots. Nadia and Tom, whose histories do not, never went there. The
candidate insight's own refutation test is met. **Insight dropped in substance** (one drop, one
weaken that states the refutation is met); the fact that Style has no threshold stays at
severity 1.

**Setups contradict histories (T21 and T19).** The T21 setups never save, while Tom's and Ruth's
histories say the project was saved, so a plain Save opened "Save as" (r5-s41b, s42b). T19 has the
same clash: r5-s47b's history says "last time I saved from the menu", yet "Save friends as" opened.
**Kept and widened.** The claim that a reopened project normally shows the last run in the
inspector (so T19's wrong note subject is "a real returning state") is asserted, not shown, and is
weakened.

**Prompt words set the behavior they are scored on.**
- T22's "Without taking any stop or link off the drawing" put the fear of hiding into every
  transcript, which inflated the funnel-icon hesitation (item 5).
- T20's "so that every calculation treats more minutes as a longer trip" made the numeric-column
  default impossible to observe; "Farther 8 of 8" says nothing about uncued readers.
- T17 asks for a count the top bar already shows ("10 of 20 nodes, 5 of 41 edges",
  `sessions/r5-s09b/10.png`), so no participant had a reason to open the data table (item 3).

**The "Graph" shared name (bar 8 note): weakened.** In r5-s45b and s48b the "conflict" was the tool
refusing `--click "Graph"` as ambiguous; a sighted reader clicking the rail icon would not hit the
note's chip. Keep it as an accessible-name defect to script (add a graph note to the bars screen),
not as evidence a reader was confused.

## 3. Fixes are landing where no task reaches them; strictly read, the round meets the stall rule

**Both skeptics weaken "Not stalled".** The criteria call a round stalled when the core four's
successful sessions rise by fewer than 3, no confirmed severity 3 or 4 on a core-four task closed,
and no failed bar now holds.

- The core four rose by 2 (30 of 30 valid to 32 of 32). Every task already succeeds, so success
  cannot rise by 3.
- Round 4's severity 3, the data table ignoring a filter step, is fixed by four specialist checks:
  the table now reads "12 of 41 edges" with only the kept rows
  (`expert/engineer/1200x900/table/09.png`). No reader met it.
- Bar 5 holds only by absence: 0 of 12 T17 and T23 participants opened the table under a filter
  step, and the T17 prompt gave them no reason to.
- Read leniently (a specialist-verified fix closes a severity 3), the round is not stalled. Read
  strictly (only readers close a problem), it is. The tasks have reached a ceiling: they no longer
  route readers through the screens being fixed.
- What remains open is small: bar 9 (b) (two scope words on one screen), bar 10 (the element's
  label placement), and the severity 2 items below.

## 4. Confirmed severity 2 problems

Each has two or more sessions, or a specialist and a session, and both skeptics keep it at 2.

| Problem | Evidence | Owner |
| --- | --- | --- |
| No names are drawn unless the setup turns them on, so a route, chain or neighborhood can be checked only against a list | 8 of 8 T20; r5-s19b to s22b, s24b on T18 (`sessions/r5-s19b/09.png`); T23; both T4 | graphty app (default), element draws |
| Replace has no visible control: it is in the source row's right-click menu or behind "..." | 7 of 8 T21 needed a hidden route; r5-s39b and s43b each made two wrong turns at the file name beside "Graph" (`sessions/r5-s39b/04.png`), not pointed there by their histories | graphty app |
| Opening the newer file lands on "Add to ..." with Load as the filled button although every tie would be added a second time | r5-s38b (`sessions/r5-s38b/04.png`, "16 edges in this file are already in team. Load adds them a second time."); same state in `expert/visual/replace/13.png`. Not raised to 3: one session, Load never pressed | graphty app |
| Rule syntax in reader text: "Put numbers in backticks:" read as a refusal; the layer and key read "minutes >= `10`" | r5-s05b took the rewrite (behavior); r5-s03b's layer; accessibility specialist | graphty app (words); graphty-element returns the rule as a code |
| A new note's subject is whatever the inspector shows, and the form cannot change it | 4 of 4 met it and pressed Cancel; 3 of 4 from the run the setup leaves open, r5-s46b from her own selection | graphty app |
| "Hops" unexplained, and "Medici and 11 connections" does not match "Selection 12" | r5-s49b to s52b; r5-s52b had to work out which of 11 and 12 was the answer | graphty app |
| "Filter to neighbors" grays out with no way back on the panel | r5-s49b, s52b; audit 11, visual 13. No prompt asked anyone to go back | graphty app; compact-mantine for the look |

**One session, severity 2, newly listed:** the Add page leaves new people out by default. The header
reads "team-v2 adds 0 nodes", "Leave out" is pressed, and the reason given is "5 edge rows name 2
nodes missing from the node rows" for a file that has no node rows (`sessions/r5-s38b/04.png`).
r5-s38b linked it to the two new people only because the prompt said two had joined: "If I hadn't
known, I'd have loaded a team with nobody new in it." Owner: graphty app for the default and the
words, graphty-element if the fact it returns names node rows that do not exist.

**Weakened to one unsteered session, severity 2:** a returning user who starts in the find box gets
no hint the program can find the chain. Nadia's history (r5-s18b) scripts the by-hand route ("reading
lists of connections one after another and writing the chain down"); only Tom (r5-s24b) is clean.
The stricter severity 3 reading is dropped by both.

**Weakened, still worth a fix:** nothing lasting says the project is saved. The header stays "Local
only" after saving (r5-s46b), which is real, but part of the surprise is the setup fault in item 2,
checking by reopening is what the task asked, and the start-screen warning that the browser can clear
projects is not in these transcripts.

## 5. Weakened to severity 1

- **The funnel icon on the find box's value rows** ("minutes is 10 or more (3)",
  `sessions/r5-s01b/02.png`). It is the toolbar Filters icon and has no tooltip, but the T22 prompt
  primed the fear of hiding; r5-s05b saw it and was not misled; 3 of 3 who hesitated still clicked,
  succeeded and rated ease 6. Candidate insight "its icon can undo the gain" is weakened to "the icon
  misleads": nothing was undone. Cheap to fix (app: a select icon and a tooltip).
- **Everything's Style tab has no threshold.** Real, but only for users whose habit is the Style tab
  (item 2).
- **A numeric column loads as a plain attribute (T20).** A design risk at severity 1 until a prompt
  does not name the weight; no session met the default.
- **Old Top 10 at full contrast between Replace and Rerun.** 8 of 8 noticed, 0 copied; r5-s40b's
  "almost copied" is from the debrief, and in the session she said "Nice that it tells me" and
  reran. Bar 5 holds on this reading too.
- **A second path replaces the first** (6 of 6 who ran two; controls specialist). Every participant
  had written the first down and no prompt asked for both; the harm is stated only as a possibility.
  Bar 2 is scored holding as in earlier rounds; read round 1's way it fails in 6 sessions.
- **The stale From on the T18 follow-up** (r5-s23b): filled from her still-selected node; she
  noticed and cleared it.
- **The neighbor list behind a menu** (T23): 4 of 4 found it, at 7 steps against 10.
- **"Follow: Out / All" unexplained**: changed no answer; r5-s19b and s23b read "All" correctly.
- **"PageRank, full graph" under a filter**: r5-s09b ("honest labeling"), s14b and s52b read it
  correctly; only r5-s51b was unsure, about the clock icon.
- **T17: the column offered only by its file name, and nothing says who a step dropped.** 0 wrong
  turns in 8 sessions; the prompt names the column and asks how many, not who.

The remaining severity 1 items in `scores.md`, and bars 8 and 9 as measured, stand.

## What worked

**Kept by both:** Shift-click for a tie's ends (T24, 4 of 4); a bare "10" in the find box giving a
"10 or more" row (3 of 3, where round 4 refused it); the toolbar's Filters button as first move
(T17, 8 of 8, 0 wrong turns); Recent for coming back to Shortest path (5 of 6 tool users).
**Weakened:** "Farther chosen at load 8 of 8" (the prompt told them).

## Candidate insights, after the skeptics

| # | Insight | Verdict |
| --- | --- | --- |
| 1 | A habit-matching fix lands at once, and its icon can undo the gain | Weakened: the fix landed; the icon misleads but undid nothing (item 5) |
| 2 | The Style tab is the second place a returning user looks | Dropped in substance: every participant who went there had a history naming it (item 2) |
| 3 | T18's cost is the path tool's route | Dropped: it is how steps are counted (item 2); one extra action over the P key remains |
| 4 | Setups steer two findings | Kept and widened to T19's save; "a real returning state" weakened (item 2) |
| 5 | Bar 5 holding is not evidence about the table | Kept, stronger: the T17 prompt gives no reason to open it (item 3) |

## What to do next

1. Recount steps the same way for participants and the key (type plus pick is one step; a refused
   click is not a step) and restate bar 11 and every cost comparison from rounds 2 to 5.
2. Before the next round, grep each history, prompt and setup against every first move the round
   will score: T21 and T19 setups must save if the histories say they did; T20 and T22 prompts must
   not name the weight or the fear being measured; the T17 prompt should need something only the
   table shows.
3. Tell the owner the stall rule is met on its strict reading, with this evidence, and that the next
   useful signal needs tasks that route readers through the fixed screens, or real people.
4. Run r5-s02bb (Ruth, T22 B) and score it into this round.
5. Smallest fixes, each in its owning package: Add page defaults (Load not filled when every tie
   repeats; new people not left out by default, words that do not name missing node rows); a visible
   Replace on the source; the note form's subject choosable; the value row's icon and tooltip.
   graphty-element: label placement and spacing by drawn size (owner's list). Re-run
   `claims/c-tie-click` on 8c015b806.
