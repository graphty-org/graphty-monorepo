# Grade: session r5-s36 (task T20, Jordan, regular analyst)

Task T20, dataset B (hiking trails, trails.csv), start setup `empty`.

**Grade: VOID** -- the run failed before the session started. Run it again and count the rerun.

## Why

The session never reached the app. Its start command (`real.mjs --start ... empty`, with
`REAL_DIST` set to the round 5 build `.study-builds/tier2-r5-8c015b806/`) exited with:

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5 until it exits 0

The round's start gate had not been run to a pass, so `real.mjs --start` refuses every session by
design (`plan.md` line 61; the file still holds no "Gate evidence" section). No browser opened and
no step was taken. The session folder holds only `transcript.md`, and the tool's own session
folder (`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s36/`) holds only `briefing.md`:
there is no screenshot and no saved file, so there is no last screen to grade against T20's
success definition in `answers.md`. This is a fault in running the study, not something the
participant did.

## Counts

- False "done" claims: 0 (the transcript says plainly that the session could not start)
- Wrong turns: 0 (the participant never acted)
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round 5 session is refused at start | `transcript.md`, Commands: the FAIL line above; no screenshots in either session folder |

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0 and writes "Gate evidence" at the
end of `plan.md`. Then run r5-s36 again from a new, empty folder with the same persona, task and
setup.
