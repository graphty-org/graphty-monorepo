# Grades: a note on a whole money trace (round 8, task r8-t23-transactions)

Task given to participants: "A month of card transfers is open, and the program has just traced
how money went from one account to another (if you do not work in banking, this is example data).
Leave a reminder on that whole trace, not on one account, and check that the reminder says what it
is about."

What this task re-tests: the studio decision that a note whose subject is a chain (a path result)
shows a subject chip with the chain's color and its two end accounts. This is the second domain
for that chip; the first was the general tier-2 note task.

Success state: the path result row is selected (it is selected at the start), the participant adds
a note, saves it, and reads the subject chip as the whole trace. On the reference route the
trace's own panel shows "Note on: Path ACC-271813 to ACC-2335..." and, after a save, "1 note --
Open in Notes"; the saved note in the Notes list carries a chip with the orange path dot and
"ACC-271813 to ACC-233575".

Each grade was checked against the participant's last render, not only their own account.

## Grading rule for a click-through tool artifact

Four of the five participants opened the row's More actions menu and clicked "Add note". The
click-through tool reported that two controls share that name, clicked the first -- the trace
panel's own "Add note" link, which sat behind the open menu -- and timed out. To the participant
it looked like a dead menu item. It is not: clicking the menu item itself (by its menu-item role)
opens the note form on the trace at once, with the chip "ACC-271813 to ACC-233575" already filled
in (checked for this grading; render in tmp/grade-r8-t23-transactions/menu.png). As in earlier
rounds, retries that only chased a tool artifact are not counted as design wrong turns. Each of
the four then pressed N with the menu still open, which only moved the menu's highlight to Rename;
that follow-on is logged as a real, minor finding below but is a consequence of the artifact, not
a wrong turn the participant would have taken with a working click.

## Result

| Participant | Route taken | Their own grade | Graded | Ended on |
|---|---|---|---|---|
| fraud-analyst | More actions > Add note (artifact), then N on the selected row | success-with-difficulty | success | note saved on the trace; Notes list and trace panel both show it; hovering the list chip |
| alert-reviewer | More actions > Add note (artifact), then N on the selected row | success-with-difficulty | success | note saved on the trace; both places show it |
| intelligence-analyst | More actions > Add note (artifact), then clicked the row and pressed N | success-with-difficulty | success | note saved on the trace; both places show it |
| data-journalist | Notes in the left rail > Add note | success | success | note saved on the trace; hovering the list chip |
| supply-chain-analyst | More actions > Add note (artifact), then N on the selected row | success-with-difficulty | success | note saved on the trace; both places show it |

Totals: 5 success, 0 success-with-difficulty, 0 failure, 0 gave up (5 participants).

Counted as the participants experienced it, with the artifact retries treated as wrong turns, the
totals would be 1 success and 4 success-with-difficulty. Nobody put a note on a single account,
nobody needed the chip explained, and nobody ended anywhere but the trace.

## Why each grade

- fraud-analyst: menu header "ACC-271813 to ACC-233575" told her the menu was for the trace. After
  the artifact and the in-menu N, pressed N with the row selected; the form read "Note on:
  ACC-271813 to ACC-233575". Saved; read the list chip and the trace panel's "Path" chip as the
  same subject ("both sides agree it's on the path"). Last render matches.
- alert-reviewer: same route and recovery. Read the chip as the two end accounts and the trace
  panel's "Note on: Path ..." as confirmation. Last render matches.
- intelligence-analyst: same route; recovered by clicking the trace row and pressing N. Noted the
  chip names the trail before anything is written. Saved; read both chips correctly. Last render
  matches.
- data-journalist: the only participant who did not use the row menu. Opened Notes from the left
  rail and clicked Add note; the form came prefilled with the trace, because Add note writes about
  whatever the right panel shows. Two clicks, no wrong turn. This is a different door from the
  reference path but reaches the identical end state, so it is a full success. Last render shows
  the saved note, the list chip and the trace panel's "1 note".
- supply-chain-analyst: same route and recovery as the fraud analyst. Read the chip as both ends of
  the route and checked it against the trace panel. Last render matches.

## What the chip test showed

The decided chip held: all five read "ACC-271813 to ACC-233575" with the path's color as the whole
trace, before and after saving, and none attached the note to an account.

But all five raised the same doubt about the chip in the Notes list, unprompted:

- The trace panel's chip says "Path ACC-271813 to ACC-2335..."; the Notes list chip says only
  "ACC-271813 to ACC-233575". It does not carry the word "Path" (or a step count).
- To a banking reader, "account A to account B" reads as ONE transfer between them, not a
  three-step route through two other accounts (fraud analyst, alert reviewer, intelligence analyst,
  data journalist). The supply chain analyst could tell only by inference from the word "to".
- The color dot is the only other cue, and two said they would not rely on it (grayscale case
  files, print).

So the chip works where it sits next to the trace, and is ambiguous where the note is read cold --
which is exactly where a reviewer or fact-checker reads it. The note in the list should name its
subject's kind the way the trace panel does. Evidence: 5 of 5. Severity 2 (minor; it did not stop
anyone, but it misleads the next reader). This also means the reference wording "the saved note in
the Notes list carries the same chip" is not quite true: it carries the same name and color but
drops the kind word.

## Other findings from these sessions

| Finding | Seen by | Severity |
|---|---|---|
| The note in the Notes list shows no "Path" or step count on its subject chip (above) | 5 of 5 | 2 |
| Notes are saved with no author unless a name is set in Settings; analysts and reviewers need "who wrote it" for a case or alert file | 4 of 5 (fraud, alert, intelligence, supply chain mentioned; journalist accepted it as long as the date stays) | 2 |
| The N printed next to "Add note" in the row menu does nothing while that menu is open (it moves the highlight to the first item); only reached because of the tool artifact, so real-world exposure is lower | 4 of 5 | 1 |
| The trace panel's chip truncates the end account ("ACC-2335..."), the part that tells two traces from the same start apart | 1 of 5 (supply chain) | 2 |
| The trace panel's own "Add note" is below the fold at the start, so the row menu is the first door found | 1 of 5 (intelligence) | 1 |
| The row menu opened over the left list, away from the three-dot button the participant clicked on the right | 1 of 5 (alert reviewer) | 1 |
| The small gray helper line in the note form is hard to read at laptop size | 1 of 5 (supply chain) | 1 |

Single-voice findings (one participant) are recorded but not acted on without a second source.

## Tool defect (not a design finding)

The click-through tool resolves a name shared by a visible menu item and an obscured link to the
obscured link and times out. Four of five sessions lost three steps to it. A participant's click
on a named control should prefer the topmost visible one; until then, moderators should name the
menu item as role=menuitem:Add note.
