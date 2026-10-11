# Grade: session r5-s09 (task T17, Ruth, tier 1 graduate)

**Grade: VOID** -- the run failed before the session started. Run it again and count the rerun.

## Why

The session never reached the app. Its start command
(`real.mjs --start ... setup:friends-ranked.txt`, with `REAL_DIST` set to the round 5 build)
exited 1 with:

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5 until it exits 0

The round's start gate had not been run to a pass, so `real.mjs --start` refuses the session by
design (`plan.md` line 61). No browser opened and no step was taken. The session folder holds only
`transcript.md`, with no screenshot and no saved file, so there is no last screen to grade against
T17's success definition (keep only the running pairs with 4 or more runs, count the people left,
then bring the whole club back). This is a fault in running the study, not something the
participant did, so the grade is VOID. Sessions r5-s01, r5-s02, r5-s04 and r5-s08 were refused
the same way.

## Counts

- False "done" claims: 0 (the transcript says plainly that the session could not start)
- Wrong turns: 0 (the participant never acted)
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round 5 session is refused at start | `transcript.md`, Start: exit 1 and the FAIL line above |

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0 and writes "Gate evidence" at the
end of `plan.md`. Then run r5-s09 again from a new, empty folder with the same persona, task and
setup.
