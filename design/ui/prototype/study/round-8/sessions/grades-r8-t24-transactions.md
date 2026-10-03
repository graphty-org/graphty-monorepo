# Grades: one network from two tables (accounts and transfers)

Task given to participants: "Two spreadsheets are open on the program's import page: a list of
accounts and a log of transfers between them. If you do not work in banking, treat this as example
data. Make one network of accounts tied by their transfers, and check that no transfer refers to an
account missing from the list."

What counts as success: the participant reads that the transfers table links from and to the
accounts table, reads the match lines ("9,113 of 9,113 from_account found in accounts", and the
same for to_account), loads, and reads 3,000 accounts and 9,113 transfers on the graph's Data tab.
Changing a column's role and restoring it, or reading the counts only after Load, is success with
difficulty. Failure is not being able to say whether every transfer's accounts are on the list.

Expected path: import page on the transfers table -> loading -> loaded graph with the Data tab
open -> the same Data tab with nothing selected. Reference renders:
shots/tasks/r8-t24-transactions/01.png to 04.png.

## Results

| Participant | Their own call | Grade | Read the match lines before Load | Ended on | Counts read after Load |
|---|---|---|---|---|---|
| Fraud analyst | success | **success** | yes, on the start screen | loaded graph, Data tab | 3,000 / 9,113 |
| Alert reviewer (bank, level 1) | success | **success** | yes, on the start screen | loaded graph, Data tab | 3,000 / 9,113 |
| ML engineer (recommendations) | success | **success** | yes, on the start screen | loaded graph, Data tab | 3,000 / 9,113 |
| Supply chain analyst | success | **success** | yes, on the start screen | loaded graph, Data tab | 3,000 / 9,113 |
| Data journalist | success | **success** | yes, on the start screen | the import report, reopened from "from 2 tables" (nothing changed) | 3,000 / 9,113 |

Totals: 5 success, 0 success with difficulty, 0 failure, 0 gave up. Five of five quoted both
"9,113 of 9,113" lines before loading; five of five opened the accounts table first and quoted
"3,000 rows; every key is unique" (not required, but each did it unprompted); five of five
matched the loaded counts to the sheet sizes. Nobody changed a column role. Mean Single Ease
Question 6.0 of 7 (6, 6, 6, 6, 6).

Every participant's loaded-graph render is byte-identical to the reference render 03.png, which
already shows the Data tab with "Nodes 3,000" and "Edges 9,113 transfers, each a distinct pair".
No participant saw the loading state (the click lands straight on the loaded graph) or the
reference 04.png (the same Data tab after a community coloring); neither is needed to read the
counts, so neither is held against anyone.

## Why each grade

- **Fraud analyst -- success.** Read both match lines on the start screen ("That's my check. No
  orphans either way"), checked the accounts table for unique keys, pressed Load, and ended on the
  Data tab reading 3,000 nodes and 9,113 transfers, "same numbers as the import page, so nothing
  got dropped". No wrong turn.
- **Alert reviewer -- success.** Same path and same reading. Noted she "almost scrolled past" the
  match report because it is small gray text under the table. Ended on the Data tab with the
  correct counts and the correct conclusion. The near-miss is a finding, not a difficulty: she
  found it unaided on the first screen.
- **ML engineer -- success.** Read the match lines as "the anti-join I'd do in pandas", checked
  key uniqueness, loaded, and used the node count (3,000, not more) as independent confirmation
  that no unknown account was created. Correct conclusion, no wrong turn.
- **Supply chain analyst -- success.** Read both lines, checked the account list for duplicates,
  loaded, and reconciled "rows in equals rows out" on the Data tab. Correct conclusion.
- **Data journalist -- success.** Read the match lines, checked the account list, loaded and
  read the counts on the Data tab, then clicked "from 2 tables" to see whether the check stays
  with the graph. It reopened the transfers import as "Edit: transfers" with the same match report
  and "Apply is off: Nothing has changed yet." Ending there is a deliberate verification after the
  task was complete, with nothing changed, so it is not a wrong turn.

## Findings

Severity is Nielsen's 0 to 4 scale. Counts are participants out of 5.

1. **The loaded picture is a gray hexagon blob nobody could read -- 5 of 5, severity 2.** Four
   called it a blob, hairball or honeycomb and expected dots and lines; only the ML engineer
   accepted it as a density view. The data journalist: "a graphics desk person would ask me what
   the hexagons are and I couldn't answer." Nothing on screen says what a hexagon stands for.
   It did not block this task, which is about counts, but it will block the next one.
2. **"Nothing is colored or sized by a row" is not understood -- 4 of 5, severity 2.** Read as an
   error or skipped ("by a row of what?").
3. **The Weight controls under amount are opaque -- 5 of 5, severity 1.** "Higher means Stronger /
   Farther / Capacity" meant nothing to anyone; all five left it alone. Harmless here because the
   guess was right; a participant whose guess was wrong would not know which control to touch.
4. **Graph vocabulary on the import page and Data tab -- 5 of 5, severity 1.** "Each row is a node
   / an edge", "One edge per Row / Pair", "Top node", "Weak components", "Reciprocity". The answer
   to "is it one network" sits behind "Weak components 1", which three participants had to decode.
5. **The match report shows only the passing case -- 3 of 5 raised it, severity 2.** The data
   journalist, ML engineer and supply chain analyst each asked what would happen to a transfer
   whose account is missing (dropped row, or a new unknown account?) and whether the unmatched
   IDs can be listed and exported. This round's data has no orphans, so the study cannot say
   whether the report works when the check FAILS -- which is the case the task exists for. A
   data set with a few missing accounts should be added before this result is trusted.
6. **The match report is easy to miss and seems to vanish after Load -- 2 of 5, severity 1.** The
   alert reviewer nearly scrolled past it and wanted it saved for an audit file; the ML engineer
   called it "below the fold-ish". Only the data journalist discovered that "from 2 tables" brings
   the report back after Load.
7. **No currency on "amount totals 14,156,522" -- 1 of 5, severity 1.**

## What worked

- The orphan check is stated as a sentence, not a chart: all five read it on the first screen and
  could repeat it ("9,113 of 9,113 ... found in accounts").
- The schema line "account (3,000) --transfers (9,113)--> account (3,000)" told every participant
  what network would be built before they touched anything.
- "every key is unique" on the accounts table answered the follow-up check that four of five said
  they would otherwise do by hand.
- "Local only" and "nothing is uploaded" were noticed unprompted by four of five.

## Caveat on the evidence

Five of five on a happy-path data set with the answer printed on the first screen is a ceiling
result. It shows the report is findable and readable; it does not show that a participant would
notice or act on a mismatch. Treat finding 5 as the open question for the next round.
