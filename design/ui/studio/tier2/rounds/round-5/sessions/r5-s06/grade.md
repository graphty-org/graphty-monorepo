# Grade: session r5-s06 (task T22, Elena, tier 1 graduate)

**Grade: VOID** (the run failed before the session started; re-run and count it)

## Why

The session never reached the app. Its start command exited with:

    FAIL: .../design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate .../design/ui/studio/tier2/rounds/round-5 until it exits 0

The round's start gate had not been run to a pass, so `real.mjs --start` refused the session by
design (`plan.md` line 61). No browser was opened, no step was taken, and the session folders hold
no screenshot and no saved file -- only `transcript.md` here and `briefing.md` in the session's
scratch folder. With no last screenshot there is nothing to grade against T22's success
definition. This is a run failure, not a participant outcome, so the grade is VOID and the session
must be re-run once `real.mjs --gate` on the round-5 folder exits 0 and writes "Gate evidence" at
the end of `plan.md`.

## Counts

- False "done" claims: 0 (the participant never acted)
- Wrong turns: 0
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round-5 session is refused at start | `transcript.md`, Step 0: the FAIL line above; `plan.md` line 61 says `--start` refuses until the gate writes "Gate evidence" |
