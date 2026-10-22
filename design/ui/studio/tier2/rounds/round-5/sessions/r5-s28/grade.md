# Grade: session r5-s28 (task T24, Jordan, regular analyst)

**Grade: VOID** -- the run failed before the app opened. Re-run the session once the round gate passes.

## Why void

`real.mjs --start` refused to start the session (exit 1):

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no
    session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5
    until it exits 0

Round 5's `plan.md` has no "Gate evidence" section; its only mention (line 61) says that `--start`
refuses every session until the gate writes one. The refusal was correct for the state the round
was in. No browser opened, no screenshot was taken and no file was saved: this folder holds only
`transcript.md`. With no last screenshot there is nothing to grade against T24's success
definition. This is a run failure, not a participant outcome, so the criteria's rule applies: a
void session is counted, reported and re-run from a new, empty folder.

## Claims and behavior

- False "done" claims: 0. The participant claimed nothing about the task and reported that the
  session never started.
- Wrong turns: 0. The participant correctly did not run the round gate itself.

## Problems

- Severity 0 (tool/process, not the app): sessions were launched before the round's start gate
  had passed, so every round 5 session launched in this state is void. Evidence: `transcript.md`
  start command output; `plan.md` has no "Gate evidence" section.

No problem in the app was observed.
