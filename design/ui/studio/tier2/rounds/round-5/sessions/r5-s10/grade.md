# Grade: session r5-s10 (task T17, Grace, tier 1 graduate)

**Grade: VOID** (the run failed before the session started; re-run and count it)

## Why

The session never reached the app. Its start command exited 1 with:

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5 until it exits 0

`plan.md` for round 5 still has no "Gate evidence" section (its only mention is line 61, which
says `--start` refuses every session until the gate writes one), so `real.mjs --start` refused the
session by design. No browser was opened and no step was taken. The session folder holds only the
transcript: no screenshot and no saved file. With no last screenshot there is nothing to grade
against T17's success definition (keep only the pairs sharing 5 or more chapters, count the
characters left, then bring every character back). This is a run failure, not a participant
outcome, so the grade is VOID. Re-run the session from a new, empty folder with the same persona
and prompt once `real.mjs --gate` on the round-5 folder exits 0 and writes "Gate evidence" at the
end of `plan.md`.

## Counts

- False "done" claims: 0 (the transcript says "Finished: no"; the participant never acted)
- Wrong turns: 0
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round-5 session is refused at start | `transcript.md`, Step 1: exit 1 and the FAIL line above; `plan.md` line 61 |
