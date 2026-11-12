# Grade: session r5-s38 (task T21, Dev, tier 1 graduate)

**Grade: VOID** -- the run failed before the session started. Run it again and count the rerun.

## Why

The session never reached the app. Its start command
(`real.mjs --start ... setup:team-ranked.txt`, with `REAL_DIST` set to the round 5 build)
refused it with:

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5 until it exits 0

The round's start gate had not been run to a pass, so `real.mjs --start` refuses every session of
the round by design (`plan.md` line 61), and `plan.md` still holds no "Gate evidence" section. No
browser opened and no step was taken. The session folder holds only `transcript.md`, with no
screenshot and no saved file, so there is no last screen to grade against T21's success definition
(replace team.csv with team-v2.csv, redo the ranking, and report the team size and first place
before and after). This is a fault in running the study, not something the participant did, so
the grade is VOID.

## Counts

- False "done" claims: 0 (the transcript says plainly that the session could not start and gives no rating)
- Wrong turns: 0 (the participant never acted)
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round 5 session is refused at start | `transcript.md`, Start: the FAIL line above; `plan.md` has no "Gate evidence" section |

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0 and writes "Gate evidence" at the
end of `plan.md`. Then run r5-s38 again from a new, empty folder with the same persona, task and
setup.
