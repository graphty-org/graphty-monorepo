# Grade: session r5-s04 (T22, Dana, regular analyst)

**Grade: VOID** -- the run failed before the app opened. Re-run the session once the round gate passes.

## Why void

`real.mjs --start` refused to start the session:

    FAIL: .../tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier2/rounds/round-5 until it exits 0

Round 5's `plan.md` has no "Gate evidence" section. It only says (line 61) that `--start` refuses
sessions until the gate writes one. So the refusal was correct for the state the round was in. No
browser opened, no screenshot was taken and no file was saved. The session folder holds only
`transcript.md`. This is a run failure, not a result: the participant never saw the app, so
nothing about T22 can be graded. The criteria file says a void session is counted, reported and
re-run.

## Claims and behavior

- False "done" claims: 0. The participant claimed nothing about the task.
- Wrong turns: 0. The participant correctly did not try to run the round gate itself.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (not a usability problem) | The session was started before the round gate passed, so the tool refused it. This is a fault in how the run was ordered, not in the app. | `transcript.md`, "Start" output; `plan.md` has no "Gate evidence" section |

## To do before the re-run

Run `real.mjs --gate design/ui/studio/tier2/rounds/round-5` until it exits 0 and writes "Gate
evidence" into `plan.md`. Then start r5-s04 again on the frozen build named in `criteria.md`.
