# Grade: session r5-s27 (task T24, Dana, regular analyst)

**Grade: VOID** -- the run failed before the app opened. Re-run the session once the round gate passes.

## Why void

`real.mjs --start` refused to start the session:

    FAIL: .../tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier2/rounds/round-5 until it exits 0

Round 5's `plan.md` has no "Gate evidence" section; the only mention (line 61) says that `--start`
refuses sessions until the gate writes one. The refusal was correct for the state the round was in.
No browser opened, no screenshot was taken and no file was saved: this folder holds only
`transcript.md`, and the session's work folder holds only `briefing.md`. With no last screenshot
there is nothing to grade against T24's success definition. This is a run failure, not a
participant outcome, so the criteria's rule applies: a void session is counted, reported and re-run
from a new, empty folder.

## Claims and behavior

- False "done" claims: 0. The participant claimed nothing about the task and said it was not
  attempted.
- Wrong turns: 0. The participant correctly did not run the round gate itself.

## Problems

- Severity 0 (tool/process, not the app): the round's start gate was never run to a pass before
  sessions were launched, so every round 5 session launched in this state is void. Evidence:
  `transcript.md` step 0 output; `plan.md` has no "Gate evidence" section.

No problem in the app was observed.
