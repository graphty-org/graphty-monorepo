# Grade: session r5-s15 (task T17, Nadia, tier 1 graduate)

**Grade: VOID** -- the run failed before the session started. Run it again and count the rerun.

## Why

The session never reached the app. Its start command (`real.mjs --start ...
setup:friends-ranked.txt`, with `REAL_DIST` set to the round 5 build
`.study-builds/tier2-r5-8c015b806/`) refused to start with:

    FAIL: .../design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate .../design/ui/studio/tier2/rounds/round-5 until it exits 0

The round's start gate has not been run to a pass, so `real.mjs --start` refuses every session of
the round by design (`plan.md` line 61; the file still holds no "Gate evidence" section). No
browser opened and no step was taken. The tool's session folder
(`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s15/`) holds only `briefing.md` and
`transcript.md`: there is no screenshot and no saved file, so there is no last screen to grade
against T17's success definition (the running club's friends.csv: keep only the ties that meet the
task's condition, count what is left, then bring everything back). This is a fault in running the
study, not something the participant did, so the grade is VOID. The other round 5 sessions graded
so far (r5-s01, r5-s02, r5-s04, r5-s06 through r5-s11, r5-s14) were refused the same way.

## Counts

- False "done" claims: 0 (the transcript says plainly that the session never started)
- Wrong turns: 0 (the participant never acted)
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round 5 session is refused at start | `transcript.md`, the FAIL line above; no screenshots in either session folder |

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0 and writes "Gate evidence" at the end
of `plan.md`. Then run r5-s15 again from a new, empty folder with the same persona, task, data
(friends.csv) and start (`setup:friends-ranked.txt`).
