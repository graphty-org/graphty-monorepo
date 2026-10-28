# Grade: session r5-s13 (task T17, Elena, tier 1 graduate)

**Grade: VOID** -- the run failed before the session started. Run it again and count the rerun.

## Why

The session never reached the app. Its start command (`real.mjs --start <session folder>
setup:friends-ranked.txt`, with `REAL_DIST` set to the round 5 build
`.study-builds/tier2-r5-8c015b806/`) exited 1 with:

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5 until it exits 0

`plan.md` for round 5 still has no "Gate evidence" section (checked at grading time), so
`real.mjs --start` refuses every session of the round by design (`plan.md`, "The gate before the
first session"). No browser opened and no step was taken. The only files are `transcript.md` and
`briefing.md` in the tool's session folder
(`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s13/`); this folder held nothing before
this grade. There is no screenshot and no saved file, so there is no last screen to grade against
T17's success definition (keep only the pairs who ran together 4 or more times, count the people
left, then bring the whole club back). This is a fault in running the study, not something the
participant did. Sessions r5-s01, r5-s02, r5-s04, r5-s06 through r5-s11 and r5-s14 were refused
the same way.

## Counts

- False "done" claims: 0 (the transcript says plainly that the session did not run)
- Wrong turns: 0 (the participant never acted)
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round 5 session is refused at start | `transcript.md`, Start: the FAIL line above; no "Gate evidence" in `../../plan.md`; no screenshots anywhere for this session |
| 0 (run, not app) | The transcript was written to the tool's session folder under `tmp/studio-sessions/`, not to this folder | Only `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s13/transcript.md` exists |

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0 and writes "Gate evidence" at the
end of `plan.md`. Then run r5-s13 again from a new, empty folder with the same persona, task and
setup (`setup:friends-ranked.txt`, dataset A).
