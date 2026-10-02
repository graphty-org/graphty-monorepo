# Round 7 grades: what the project looked like before a change (Transfers, March 2026)

Task as given: "Someone changed the analysis of March's transfers on Tuesday. See what the project
looked like before that, and what has been done since. The data on screen is a sample: one month
of card and bank transfers between accounts."

Grading bar:

- Success: Version history is open, an older version is chosen (March data, view only), and its
  log of runs and edits is read.
- Success with difficulty: the same, but only after trying Undo first, a wrong turn, a long
  search, or help from a hover.
- Failure: cannot reach any earlier state, ends somewhere else, or concludes wrongly.

The intended path is three screens: the start screen, then Version history (opened from the
project title menu), then the March version selected in the log.

Grades go by what ended on screen and what the participant concluded, not by how sure they felt.

## Grades

| Participant | Their own call | Grade | Where they ended | Answer |
|---|---|---|---|---|
| Fraud analyst (Sarah) | success with difficulty | success with difficulty | Data section with the March files, after a history row threw them out of Version history | before and since correct; doubts which version is live |
| Alert reviewer (Nadia) | success with difficulty | success | Version history, Runs filter | before and since correct, laid out as a written answer |
| Knowledge engineer (Dr. Kim) | success with difficulty | success | Version history, hovering the Louvain rerun row | before and since correct, with counts and settings |

Totals: 2 success, 1 success with difficulty, 0 failure, 0 gave up. All three found Version
history in one click from the project title menu, opened the March version, read its log, and went
on to Compare with current. Nobody tried Undo.

All three graded themselves down for the same reason: they could not say which entry happened "on
Tuesday" or who made it. That is not a navigation failure. The task asked for the state before and
the work since, and all three gave both correctly. See "The task wording" below: the Tuesday
detail matches nothing in the sample, so nobody could have answered it.

## Why each grade

**Fraud analyst -- success with difficulty.** The path to the target was clean: title menu,
Version history, March data (render 03 is the target screen, with "March data, view only" and the
March log). Compare with current followed. Then they clicked the log row "Replaced the data with
April" to find who did it and when, and the click took them out of Version history to the Data
section showing accounts-2026-03.csv and transfers-2026-03.csv, 3,000 nodes (render 05 confirms
it). They ended there, asking which version is the live project, and said "I'd stop here." The
target was reached, but the session ended off it and with the participant's confidence in the
answer shaken by the screen. That is a wrong turn at the end rather than the start, and it counts
as difficulty.

**Alert reviewer -- success.** Direct path in three clicks; render 03 is the target screen, and
the transcript reads the March log line by line (the 35-community Louvain run, the 14-account
export). Their last step, the Runs filter, stays inside Version history and was a search for
dates, not a detour. Their written answer is correct: before = the March data version and its
run and export; the change = the April data swap that marked March runs out of date; since =
PageRank, the Louvain rerun, the recipe and the assistant question.

**Knowledge engineer -- success.** Same direct path (renders 03 and 04). They read the March log
and the compare panel more closely than anyone, then filtered to Runs and hovered the rerun row
looking for a timestamp or an author. The hover only highlighted the row; it did not help them
reach anything, it was a check for information that is not there. Ended inside Version history
with a complete, correct answer.

## Findings

Severity uses Nielsen's 0 to 4 scale. Counts are participants out of 3.

1. **Most log entries carry no date and no person (3 of 3). Severity 3.** Only the two data
   versions, the assistant question and the recipe have dates; only the recipe has a name, and that
   name is who saved the recipe, not who applied it. All three are people who answer to QA or an
   examiner, and all three said an entry without who and when is not an audit trail. Every row
   should state when it happened and who did it. This is the main reason all three graded
   themselves down.

2. **The title and the start screen contradict the history (3 of 3). Severity 3.** The project is
   titled "Transfers, March 2026" and the start screen's inspector shows the March Louvain result
   (35 communities), while Version history marks "April data" as current with 65 communities. All
   three asked whether they had been looking at old results on new data. Part of this may be a
   prototype artifact -- the start screen and the history screen were drawn separately -- but if
   the design really keeps the old title after a data swap, that needs a decision. Either way the
   start screen must show the current version or say plainly that it is showing an older one.

3. **Clicking a history log row leaves Version history (1 of 3, confirmed by the render).
   Severity 3.** "Replaced the data with April" opened the Data section, and that section shows
   the March files. The participant expected the row to give details about that entry. It took
   them out of the history, to a page that contradicts it, and ended their session. Only one person
   clicked a non-version row, so the count is low, but the render shows exactly what they described.
   A row in the log should open its details inside the history, or plainly say where it is taking
   you.

4. **"Mar 28" on the recipe row is ambiguous (2 of 3). Severity 2.** It sits among September
   dates and reads as either when the recipe was saved or when it was applied. Label it "saved Mar
   28" and give the date it was applied.

5. **The compare panel does not name its agreement measure (1 of 3). Severity 1.** The knowledge
   engineer asked whether 0.449 is adjusted Rand or NMI. The other two were satisfied by the
   explanation and the reference band. A hover or a footnote naming the measure would be enough.

## What worked (3 of 3 unless noted)

- "Version history" in the project title menu was the first place all three looked, and it used
  the word they were looking for.
- "View only. Restore adds it as a new version on top" was understood immediately: looking does
  not destroy anything, and restore does not wipe later work.
- The data-version summary (counts labeled as accounts versus transfers, "was" figures, "large
  change" flags) was praised by all three.
- The assistant entry saying exactly what left the machine was called out by all three as
  something QA would want.
- Compare with current, with the reference band for reruns on the same data, convinced all three
  that the change was real and not noise. The alert reviewer called it "the one screen I'd
  screenshot for the file."

Single Ease Question: 5, 5, 5 (mean 5 of 7). All three lost points on the missing who and when
and on the March-versus-April contradiction, not on finding the history.

## The task wording

The task says the change happened "on Tuesday". The sample's dates are Sep 28 (a Monday), Sep 30
(a Wednesday) and Oct 1; with today being Friday Oct 2, Tuesday is Sep 29, and nothing in the log
falls on it. All three noticed and settled on the April data swap (Sep 30) as the change, which is
the intended answer. This is a defect in how the task was written against the sample, not in the
design. Either the sample gets an entry on Sep 29 or the task stops naming a weekday. It should not
be scored against the participants, and it inflated the "who and when" complaint only slightly:
they would have asked for names on every row regardless.
