# Design hypotheses: loading a file, checking it, and reopening it

For the design team and session runners only. Do NOT include this file in the prompt that plays a
participant: a simulated user who knows the intended answer will find it, and the session proves
nothing. The task wording below never names weight, role, issue, policy, parallel edge, version
history or selection.

The flow these come from is `flows/load-and-characterize.html`; the screens are
`screens/load-transfers.html`, `screens/load-step.html` and `screens/take-a-note.html` (state 5).
Each hypothesis is a design belief, not a finding, until sessions support it.

## H1. Left at its default, the amount's meaning goes unnoticed and shapes the ranking

- **Belief:** the load step does not ask what a bigger amount means; the graph's Edges row shows
  "weight: unknown" with its role control, and a distance algorithm asks the first time it reads
  the column. An analyst who never opens that row will not realise that PageRank and community
  detection already read a bigger amount as a closer tie.
- **Competing design:** `screens/load-step.html` asks the same question inside the load step, on the
  weight column's row. Run half the sessions on each.
- **Participants:** the fraud analyst (`study/personas/fraud-analyst.md`) and the marketing analyst
  (`study/personas/marketing-analyst.md`).
- **Task (say exactly this):** "Here is March's export of transfers. Load it so that a ranking of
  accounts reflects how much money moved between them, then tell me which account comes out on
  top."
- **Start state:** the start screen, `transfers-2026-03.csv` on the desktop.
- **Holds if:** the participant sets the amount's meaning before running a ranking, or, asked once
  afterwards "What does that ranking assume about the amounts?", says in their own words that a
  bigger amount counts as a closer tie.
- **Does not hold if:** they run a ranking and cannot say what it assumed about amount. If the
  load-step version passes clearly more often, the owner should prefer it.
- **Record:** whether they opened the Edges row, the meaning chosen and when, and their answer.

## H2. The currency warning is read, not clicked through

- **Belief:** because the amount issue already defaults to reading the column as currency and
  Load is on, most analysts press Load at once. The dollar signs marked in the sample are enough
  for them to confirm afterwards that the amounts were read as numbers.
- **Task:** "Open March's transfers. Before you do anything else with them, tell me whether graphty
  read the amounts correctly, and how you know."
- **Holds if:** the participant points at the issue row, the marked sample cells or the Last import
  row, and names either the currency reading or the total ($14,156,522.28).
- **Does not hold if:** they cannot answer without guessing. If that happens, the warning should
  block until the analyst chooses, and the merged blocking rule in `framework-changes.md` needs
  revisiting.

## H3. Repeated pairs: the count is read before a "how many pairs" answer

- **Task:** "How many different pairs of accounts moved money in March?"
- **Holds if:** the answer is 8,701, reached through the parallel-edges issue (Merge into one) or
  its mark row after the load. The answer 9,113 is a failure.

## H4. After a reopen, the screen is trusted as last week's without a line saying so

- **Belief:** with nothing beside the project name, as in Figma, analysts still trust that the
  reopened screen is last week's, and they check what changed in Version history or on the Last
  import row rather than asking.
- **Competing design (departs from Figma):** a transient line under the project name, "Last
  edited 7 days ago", that clears on the first interaction and never becomes a permanent state
  word. Show it in half the sessions.
- **Task (a week after the participant's first session, or framed as one):** "This is the project
  you were working on last week. Has anything changed since you left it? How can you tell?"
- **Holds if:** the plain version gets as many correct answers (the data version is the same; the
  results are current) as the line. Adopt the line only if it gets clearly more.

## H5. Wanting last week's selection back (untested one-way door)

- **Belief:** an analyst who closed with a working selection (the 14 flagged accounts) wants it back
  on reopen. Saving it would change the project file format, so nothing is drawn until sessions
  show the need.
- **Task:** end a session with the 14 flagged accounts selected; at the next: "Carry on from where
  you stopped."
- **Record:** whether they try to recover the selection, and how (Previous selection, Undo,
  re-selecting by hand, a set). Take the proposal to the owner only if most participants try.
