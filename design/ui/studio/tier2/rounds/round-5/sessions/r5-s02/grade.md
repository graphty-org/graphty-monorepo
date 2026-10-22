# Grade: session r5-s02 (task T22, Ruth, tier 1 graduate)

**Grade: VOID** (the run failed before the session started; re-run and count it)

## Why

The session never reached the app. Its start command exited 1 with:

    FAIL: .../design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate .../design/ui/studio/tier2/rounds/round-5 until it exits 0

The round's start gate had not been run to a pass, so `real.mjs --start` refused the session by
design. No browser was opened, no step was taken, and the session folder holds no screenshot and
no saved file -- only the transcript and the briefing. With no last screenshot there is nothing to
grade against T22's success definition. This is a run failure, not a participant outcome, so
the grade is VOID and the session must be re-run once `real.mjs --gate` on the round-5 folder exits
0 and writes "Gate evidence" at the end of `plan.md`.

## Counts

- False "done" claims: 0 (the participant never acted)
- Wrong turns: 0
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round-5 session is refused at start | `transcript.md`, Start: exit 1 and the FAIL line above; `plan.md` line 61 says `--start` refuses until the gate writes "Gate evidence" |
