# Grades: find out how the April rerun went, and which month is on screen

The task: "Before lunch you asked graphty to redo the rings of accounts on April's data. See how
that went, and which month the drawing is showing you now. The data on screen is a sample: one
month of card and bank transfers between accounts."

The intended path: on the Transfers project, open the Louvain run (its row in the left tree, or the
panel on the right) and read the bar at the top of that panel: "Rerun on April data failed and
wrote nothing. The March result is still shown." with a Try again button. The right answer is that
the rerun failed and the drawing is still March.

Grading rule: success means the participant read that bar and concluded the rerun failed and the
drawing is March. Success with difficulty means they reached the bar only after looking in Notes,
Version history or the Data place first. Failure means they concluded the drawing shows April, or
that the rerun finished. Grades go by what was on screen at the end and what they concluded, not by
how they rated themselves.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Expert Emma (network scientist) | success with difficulty | failure | Never saw the failure bar. Went run link (opened the Analyze picker), title menu, Version history, Runs, then clicked the rerun entry and landed in a different project (06.png). Concluded the rerun "ran on April", 65 communities, modularity 0.742. Said the main drawing is colored by the March result but could not say which month the nodes are. Concluding the rerun finished is the failure condition. |
| ML engineer (recommendation systems) | success with difficulty | failure | Never saw the failure bar. Went title menu, run link, Assistant, Data, then the panel's More actions, Compare with another run, and found an "April data" Louvain run with full results (07.png, 08.png). His answer: "the April rerun finished". He got the month right (March, from the title, the 03 source files and the 35-group legend), but the rerun half is wrong. Ended in the wrong project after clicking "April data" (09.png). |
| Cybersecurity analyst | success with difficulty | failure | Never saw the failure bar. Went title menu, Version history (which lists a finished Louvain rerun on April), run link, Data, then clicked the Louvain row in the tree (05.png) -- the intended place -- and saw no failure mark there. Ended on the March-vs-April compare screen (14.png). Answer: "it ran", 65 communities; drawing "March, with low confidence". Right on the month, wrong on the rerun. |

Totals: 0 success, 0 success with difficulty, 3 failure, 0 gave up. Ease scores: 3, 3, 3 out of 7.
On the month, the answers were better than the grades: 2 of 3 said plainly the drawing is March
(ML engineer, analyst), and Emma said the colors are March but the screen did not tell her the
month of the nodes. On the rerun, 3 of 3 concluded it finished.

## These failures are not evidence against the design

All three failures come from the prototype, not from the failure bar or where it sits.

1. **The failure bar cannot be reached by clicking.** It is drawn only by the second render of the
   task (shots/tasks/t33/02.png). Starting from the first screen, clicking the Louvain row in the
   tree, or anything else, leaves the panel exactly as it began: no bar, no Try again (the
   analyst's 05.png is identical to 01.png). The analyst clicked the intended row and the bar was
   not there to find. No participant could have succeeded.
2. **The rest of the prototype says the rerun succeeded.** Version history lists "Louvain
   communities, rerun -- 65 communities, modularity 0.742. The March result is kept as an earlier
   result" and an "April data -- current" version; Compare with another run offers a finished
   "Louvain communities, April data" run with agreement scores and size changes. That is a
   different story from the one the task tells (rerun failed, nothing written). Every participant
   who found it believed it, reasonably, because it was detailed and self-consistent.

Before this task runs again: either make the Louvain row (and the run link) open the failed state
when the task starts on the transfers tree, or start the task on the failed state; and make
Version history, the Runs list and Compare show the failed rerun (no April result) when the
project is in this state. Until then, t33 measures nothing about the failure bar.

## The flag: where people looked first for the run's status

The tree draws no failure mark on the run row in this state; that choice is decided but untested.
What the sessions show about it:

- First place each participant went: the title menu and Version history (ML engineer, analyst,
  2 of 3); the "from Louvain, Sep 28" link at the top of the run's panel (Emma, 1 of 3). Nobody
  clicked the run row in the tree first (0 of 3); one reached it fourth (analyst).
- All 3 read the run's panel on the right on the first screen and remarked that nothing there said
  "out of date", "April" or "failed". The analyst, the one person who opened the run row, said
  "No 'out of date' mark anywhere on it."
- 3 of 3 said they expected a job list or a status line ("In Splunk a finished search sits in the
  job list"; "no job status, no 'your run finished', no toast").

With the bar unreachable this cannot say whether the bar alone is enough, but it does say people
look for job status in the document's history first and in the run's own panel second, and not in
the tree. A mark on the row would not have been seen first by anyone here.

## Findings the sessions surfaced anyway (beyond this task's goal)

1. **The run link opens the wrong thing (3 of 3).** "Run from Louvain, Sep 28" at the top of the
   run's panel opened the Analyze picker. All three expected that run's record: its inputs, its
   data month, when it ran. Severity 3 (major): the most obvious way to ask "where did this come
   from" starts a new analysis instead.
2. **Clicking an entry in history or compare switches to another project (3 of 3).** The rerun
   entry in Runs (Emma), "April data" in the compare picker (ML engineer), and Esc in Version
   history (analyst) each dropped the participant into the Les Miserables project. All three read
   it as lost work. Severity 4 (catastrophe) if the shipped app did it; most likely a prototype
   wiring fault, but it must be fixed before the next round because it ends sessions.
3. **"Local only" and "Assistant: off, nothing is sent" contradict the history (3 of 3 noticed).**
   Version history records 14 account ids sent to api.anthropic.com on Oct 1. Emma and the analyst
   said that alone would stop them using the tool on client data. Severity 4 for the trust it
   costs; whether the fixture or the design is wrong, the two statements must agree.
4. **Opening Data or Assistant changes the drawing (2 of 3).** A filter "amount is at least 1,000"
   appeared, the scope chip changed to "812 of 3,000 nodes", and the coloring turned into a gray
   hex blob. Both asked whether the Louvain numbers were computed on that subset. Severity 3.
5. **Praised: the compare screen (2 of 2 who reached it).** The agreement score shown next to the
   same-data rerun band (0.449 against 0.759 to 0.768) and the note that 26 of the 65 groups are
   single accounts with no transfers were called better than what they build in their own
   notebooks. Asked for: the name of the agreement measure, and the seed and weight on the rerun.
