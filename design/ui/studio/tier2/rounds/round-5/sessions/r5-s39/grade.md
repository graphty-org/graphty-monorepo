# Grade: session r5-s39 -- Alex (returning analyst), T21 half A (running club, friends.csv to friends-v2.csv)

**Grade: VOID.** The tool refused to start the session, so the app was never opened. Re-run the
session from a new, empty folder with the same persona, prompt and setup
(`setup:friends-ranked.txt`) once the round's gate has passed, and count the re-run.

## Why the session is void

- Evidence: the session folder holds only `transcript.md`. There are no screenshots, no
  `session.json`, no `session.log` and no saved files, so there is no last screen to grade.
- Mechanism: the round, not the app and not the participant. `real.mjs --start` exited 1 with
  `FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no
  session of this round may start`. The round plan ("The gate before the first session") says
  `--start` refuses every session until `real.mjs --gate` has written "Gate evidence" at the end of
  the plan. At grading time `plan.md` still has no such section (the only match for the phrase is
  the rule itself), so the gate had not been run or had not passed when the session was attempted.
- The participant stopped correctly: running the round gate is the round runner's job, no browser
  slot was taken, and nothing needed `--end`.

## Measures

- Steps: 0 in the app. Wrong turns: 0. False "done" claims: none (the participant reported that
  the session never started and gave no answer).
- Earlier work kept (bar 2): not judged; no work was opened.

## Problems

| Severity | Problem | Evidence |
| -------- | ------- | -------- |
| 0 (app) | None observed: the app was never reached. | `transcript.md`, step 1 |
| Tool/round fault | The round was launched before its gate wrote "Gate evidence" to `plan.md`, so every session of round 5 started this way fails the same way. Run `real.mjs --gate design/ui/studio/tier2/rounds/round-5` until it exits 0 before re-running. | `transcript.md` step 1 output; `plan.md` has no "Gate evidence" section |
