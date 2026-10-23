# Tier 2 round 1 insights: returning users on the real graphty app

What round 1 of the returning-user study shows, after two independent skeptics checked every bar,
problem and candidate insight in `scores.md` against the grades, transcripts, screenshots, persona
files and expert reports. Rule applied: a claim both skeptics drop is dropped; a claim either one
weakens is weakened unless the other answers its reason with evidence. Most severe first.
Severity is Nielsen 0 to 4 (4 = cannot be done, the user leaves, or reports a wrong answer
unknowingly). Screenshot paths are relative to `sessions/` unless they start with `../`.

All participants are simulated: one model playing personas, each told a history of earlier
sessions. A failure is strong evidence; a pass is weak until real people confirm it. A simulated
returning user goes first to whatever its history names, so a first move that matches the history
says little about real users.

## 1. Was there a dry run, and did participants hit implementation faults?

**There was, and it removed the faults on the routes it walked -- but it walked only the answer
key's routes.** Five early sessions were started, stopped and discarded
(`../discarded-round-1-before-dry-run/`). Then every task was walked on both datasets on four
successive builds (`../../../dry-run-r1-1.md` to `../../../dry-run-r1-4.md`), with each walk's
implementation faults fixed before the next build, and once more on the frozen study build
946256efb876 (`../r1d4/pilot/`). On the study build, T18 B has screenshots (`../r1d4/pilot/T18B/`)
but no written report, and the answer key still cites the previous build for it: that walk
happened but its result is unrecorded.

**On the routes the dry run walked, no participant met a broken control.** Every `session.log`
is empty (no script, console or request errors), and no grade was decided by a build defect. The
three sessions that did not succeed stopped on where a feature lives, on controls that work.

**Off those routes, yes.** Participants chose detours (styling, the selection display) that no
dry run walked, and met these on the frozen build:

| What participants met                                                                                                                                                                    | Sessions                         | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Adding Color under Edges while a run's layer is open writes it to Everything; the open panel shows nothing                                                                               | r1-s43, r1-s46 (`r1-s46/05.png`) | Build defect, confirmed, severity 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| The selection display overrides a node's own color: a new fill shows in the selection tint until cleared (r1-s51, s52, s54), and a selected path node loses the path color (r1-s19, s23) | 5                                | Weakened from build defect to a severity-2 design finding: the selection highlight taking priority may be working as designed                                                                                                                                                                                                                                                                                                                                                                                                              |
| Edge width reads thinner than its number                                                                                                                                                 | r1-s43, s44, s45                 | Weakened and split. "Thick only while selected" is refuted: width 30 draws thick after the selection is cleared (`r1-s45/26.png`). What remains: (a) the selection band hides a line's own width while selected (severity 2); (b) width has no unit and "Width by attribute" maps to 1 to 3, under the base width of 8 -- a units and default-range question, not shown to be a rendering fault. `graphty-element/src/meshes/EdgeMesh.ts` scales width by *20 and /40, so a script should check whether the element's units are consistent |
| The canvas key grows over a drawn name                                                                                                                                                   | r1-s52, s54                      | Weakened: the key does not avoid what is drawn under it (kept); which name it covers depends on the unseeded default layout                                                                                                                                                                                                                                                                                                                                                                                                                |
| The Analyze popover does not close on a canvas click or Escape                                                                                                                           | r1-s16 (`r1-s16/07.png`)         | One session, under a load average of about 158; not shown until a script reproduces it                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| The Direction list on the import page opens as a thin strip                                                                                                                              | r1-s06                           | One session; needs a script                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Two edge labels drawn on top of each other                                                                                                                                               | r1-s43                           | Folded into label placement (problem 5 below), not a separate defect                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**The study tool reached participants more often than the build did.** These must be fixed before
round 2, because each one spends a session on something other than what a returning user needs:

- More than four sessions ran at once (a load average of about 158), against the four-browser
  limit. Click timeouts followed in r1-s14, r1-s16's setup and r1-s46.
- Tool faults beyond those timeouts: r1-s44 (the tool matched the wrong "Enjolras" row, and one
  command used a step the tool does not have), r1-s30 (an ambiguous match between the Sources row
  and the panel heading), r1-s29 (the tool's file drop sends synthetic events, so the screen stayed
  silent where a real browser would have opened the file).
- r1-s04 is void and was never re-run; two T18 sessions (r1-s22, r1-s23) never got the follow-up
  prompt; r1-s03 read the facilitator notes and the avoided-words list.
- The preflight scripts three bars depend on were never built (the open-work lister, the weight
  script, the accessibility and word counts on tier 2 screens), so bars 2, 7, 8 and 9 cannot hold
  this round whatever the sessions show.

**What to change:** a dry run should also walk each task's commonest detours (from the previous
round's wrong turns, or the pilot's "what would a person try first"), and a tool check should run
the same detours, so sessions spend their time on where things live and what users expect.

## 2. The find box answers a condition with only "No match" (T22) -- severity 3, confirmed

4 of 4 participants asked to mark everything that meets a condition typed it in the find box in
their own syntax (`minutes >= 10`, `shared_chapters >= 10`) and got only "No match for ...", with
no hint that a rule exists or how one starts (`r1-s46/12.png`). The rule path exists (a leading
"=", numbers in backticks), but nothing leads there. This is T22's blocker and the only task below
its success floor (3 of 4; mean ease 2.75, median 25 steps against a 3-step success path).

Severity 4 is dropped: r1-s43's count of 3 was correct and she said honestly she had only done it
"Partly", so no wrong conclusion and no one left. The candidate insight "users type conditions
where they search" is weakened: the find box is the place the histories name most, so starting
there is expected of these participants. What holds: the column itself was the second place every
one looked (its summary and its menu, 4 of 4), and neither offers a "select where". The decision
fixed before the round applies: round 2 first changes the find box's hint and refusal words.

A related finding, weakened to severity 2: a number in a rule must be wrapped in backticks
(`=minutes >= 10` is refused). One expert found it; r1-s46 met the refusal and fixed it in one
step from the message's example.

## 3. "Replace with file..." is not visible at rest (T21) -- severity 3, confirmed

8 of 8 participants bringing in a newer file had to hunt for Replace. A left click on the source
row shows only the source's facts, and the main menu offers nothing; Replace is on the row's
right-click menu. The hover-only "..." in `scores.md` is not shown anywhere: no "..." is drawn at
rest (`../r1d4/pilot/T21A/03.png`), nor with the pointer resting on the row after a left click
(`r1-s29/08.png`). 7 of 8 found it by a right-click on their first or second try, from Excel,
Gephi or Windows habit; median 9 steps against 6, inside the 2x bar.

Severity 4 is dropped. The one person who left (r1-s29, Tom) followed his persona file's scripted
exit: "He gives a new file about two minutes and two attempts ... He does not look for a
right-click menu" (`recipe-recipient.md`, lines 157 to 162). His briefing does not say this, but
the persona file he played does, so the give-up is the persona, not the screen.

Kept on its own, one session, severity 3: in r1-s29, "Open project or file..." with a project open
leads to an "Add to friends" page whose summary puts the combined total (82 edges) under the new
file's name (`r1-s29/05.png`), which ended his first route.

The candidate insight "commands behind a right-click or a hover cost returning users the most" is
weakened to "Replace is not visible at rest": T20 and T22 cost far more, the note's subject detour
has nothing to do with right-click, and the hover "..." is not shown.

## 4. A plain open ignores what a weight means, and the way to say it drops the graph (T20) -- severity 3, confirmed

All 7 participants opened the trail or bus file with "Open project or file...", which loads a CSV
with no import step: nothing on that route sets what the minutes or kilometers mean, and nothing
says they were ignored. The page that asks ("Higher means: Farther") works when reached -- every
participant who reached it chose right -- but with a graph open it is reachable only by "Back to
start", which drops the open graph without asking (`r1-s05/09.png`). 3 of 7 never did the "every
calculation" half and set the weight on one path run only. The path's Weight list starts on "None"
while offering "minutes (farther)" (4 sessions; kept). T20 costs a median of 23 steps against a
22-step limit.

Weakened: "7 of 7" is not evidence of a real-user habit. The start screen shows "New from data..."
right under "Open project or file..." (`r1-s01/02.png`), and participants chose "Open" because
their histories name it (r1-s01: "the way I opened the class spreadsheet"). The task's wording
("bring it in so that every calculation...") also leans toward an import step. What holds: on the
route a user habitually takes, nothing leads to setting what a column means, and going back
throws the work away. The candidate insight "users set a column's meaning after loading" is
weakened accordingly; going to the column next (6 of 7) is the real signal.

## 5. Drawn names overlap and run off the canvas -- severity 3, confirmed as a class

Three experts independently found drawn names covering each other and cut at the canvas edges, and
sessions r1-s38, r1-s51 and r1-s53 show it (r1-s53: the Gus-Ivan line seems to end at Hana). The
specific overlaps ("Chloe" over "Farah", "Hana" on Ivan's dot) are weakened: the default force
layout is unseeded, so which names collide depends on that load's layout, and counting them "once
per dataset" is wrong. The class -- label placement and frame-to-fit ignoring label extents --
belongs to graphty-element. Two stacked edge labels (r1-s43) fold in here.

## 6. An out-of-date run looks current after Replace -- weakened to severity 2 to 3

Between Replace and Rerun the drawing, the key's range and the old Top 10 stay at full contrast;
the only marks are a gray clock icon on the run's row and a bar inside the run's inspector
(`r1-s28/07.png`). Two experts found this independently, and bar 5 fails on it as written. But
every one of the 7 sessions caught it before reading a name, after the prompt had told them a rerun
was due and made them write down who was first -- so no participant was misled, and their catching
it shows neither danger nor safety. The case for marking the key and the drawing rests on the
experts. The candidate insight "users notice a stale picture only from its numbers" is weakened:
the noticing was induced by the prompt.

## 7. Nothing on the Graph place leads to filtering (T17) -- severity 3, not 4

The toolbar (r1-s12, s14, s16), Everything (r1-s14) and the Analyze list (r1-s16) offer no way to
narrow the drawing; 7 of 8 found Filters under Data, at a median of 7 steps, equal to the success
path. Severity 4 is dropped: the one give-up (r1-s16) is Tom again, under his persona's scripted
patience, who also lost 3 steps to the Analyze popover not closing under a load of about 158.
r1-s12 and r1-s14 went to Data at step 3 for a stated reason (Gephi's data table; "Data listed my
columns last time"), not by a guess. Weakened: neither search box finding a column by the task's
word ("chapters" against `shared_chapters`) is partly the task's wording.

## Bars after the skeptics

| #   | Bar                                 | After the skeptics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Success per task and half           | **Fails** on T22 (3 of 4). r1-s43's F is fair: a continuous color scale does not separate the links of 10 minutes or more                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2   | Earlier work kept                   | **Does not hold**: not scored (the open-work lister was never built). A second path run replacing the first counts as `not-kept` by the bar's wording, at severity 2 -- the follow-up prompt itself asks for a second chain, and only r1-s18 and r1-s19 wanted both                                                                                                                                                                                                                                                                                                                        |
| 3   | No confirmed severity-4 problem     | **Holds.** Each give-up is one participant, the criteria need two, and two of the three are Tom's persona's scripted exit. The three problems stay at confirmed severity 3 (insights 2, 3, 7)                                                                                                                                                                                                                                                                                                                                                                                              |
| 4   | No silent commit                    | Holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 5   | Numbers agree with drawing and data | **Fails** as written on the stale key after Replace; severity 2 to 3, no participant misled (insight 6)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6   | No false "done"                     | Holds (0 of 55)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 7   | Weight read as loaded               | **Does not hold**: part (a)'s script never built; 0 sessions read a weight the wrong way round                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 8   | Automated accessibility check       | **Does not hold**: not run; fails by hand (focus falls to the page after "Add step" and after deleting a step)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 9   | App words at rest                   | **Does not hold**: not counted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 10  | Expert walkthrough and audit        | **Fails** with three severity-3 findings: find results cut off with long names (three experts; no session used long names), drawn names overlapping (insight 5), and the stale run (insight 6, at 2 to 3). Weakened out of the severity-3 list: the left-out row unreported after Load (severity 2; 6 of 6 T4 sessions saw the row before loading) and backticks (severity 2). Method note: the criteria confirm an expert finding by a script or a second specialist shown only the capture; "one specialist plus a session" was the scorer's own rule, and is stated here as a deviation |
| 11  | Cost of the core four               | **Fails** on T20 (23 against 22; insight 4). T18 (9.5 against 8) is weakened: two graders counted the success path as 5 steps, at which it passes; the longest T18 routes follow the personas' histories (Tom skims long panels, Nadia traces chains by lists)                                                                                                                                                                                                                                                                                                                             |

## Other problems after the skeptics

- **T18, nothing in a person's connections or the find results leads on to the chain:** weakened,
  not confirmed. The two sessions are in two different places (r1-s18's Hops stopping at 3 when
  the target was 4 away; r1-s24 working the chain out by hand), and both were steered by their
  histories. Hops stopping at 3 is kept as a separate fact.
- **T19, a new note takes the inspector's subject:** weakened to severity 2. Every note ended on
  the right subject; it cost detours, not wrong outcomes.
- **T4, "Leave out" preselected and shown by an outline only; nothing on the Graph place says a
  row was dropped:** weakened to severity 2. Every T4 participant found the unmatched row before
  loading; "a hurried user would lose a link" is a guess.
- **T20, "Back to start" drops the open graph without asking:** kept, severity 2 to 3 (part of
  insight 4).
- **Every severity 1 and 2 finding in `scores.md`** not named here is kept: each rests on two or
  more sessions with screenshots.
- **"Components 1" under a filter:** neither skeptic ruled; it stays a candidate.

## Candidate insights after the skeptics

1. Users set a column's meaning on the column after loading -- **weakened strongly** (insight 4).
2. Commands behind a right-click or hover cost the most -- **weakened** to "Replace is not visible
   at rest" (insight 3).
3. Users notice staleness only from numbers -- **weakened**: prompt-induced (insight 6).
4. Users type conditions where they search -- **weakened**: the find box is where histories start;
   the column as second place holds (insight 2).
5. **Users read names, not ids, and want numbers in their own units -- kept, low confidence.** No
   drawn names on T4, T18 and T20 sent participants to lists; "Total distance 14" has no unit (7 of
   7 T20 sessions; r1-s05 added the table up by hand to learn it). Many sessions on several
   datasets, each severity 1 to 2.
6. The second time is cheap only where the first route was in place -- **weakened to not shown.**
   T18 follow-ups took 5, 5, 6, 6, 7 and 8 steps, about one over a 5-step target, and that step has
   a mechanical cause (From starts filled from the current selection). No one used the P key, as
   expected: no history names it and no participant was keyboard-only.

## What holds and what worked

0 false "done", 0 silent commits, 0 weights read the wrong way round, every `session.log` empty,
52 of 55 valid sessions succeeded. T23 and T12R ran at or under their success paths with no wrong
turn; T17 follow-ups took exactly the key's 4 steps; once found, the path run, the Replace page and
the load-time "Higher means" question were each read correctly every time.

## Before round 2

1. Fix the study tool and the run: at most four sessions alive, re-run r1-s04 as r1-s04b, the
   follow-up to every successful T17 and T18 session, participants never shown facilitator files,
   a real file drop (or a note when the tool cannot do one).
2. Build the missing preflight scripts (open-work lister, weight script, tier 2 accessibility and
   word counts) and record five clean save-and-reopen proofs.
3. Extend the dry run to each task's commonest detours from this round, and give each one-session
   build defect above (popover, Direction list) a script before calling it a defect.
4. Write the T18 B walk's report on the study build, or walk it again.
5. Persona check: Tom's scripted two-attempt exit decided two of three non-successes; keep it, but
   graders should label a give-up that follows a persona's scripted rule so it is not read as the
   screen's doing.
