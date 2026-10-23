# Grade: session r5-s32 (task T20, persona Dana, regular analyst)

**Grade: VOID** -- the run failed before the app opened. Re-run this session and count the re-run.

## Why the run is void

`real.mjs --start` refused to start the session:

    FAIL: .../design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate .../design/ui/studio/tier2/rounds/round-5 until it exits 0

The round's start gate had not passed, so the tool blocks every session in the round. No browser
opened, the participant took no steps in the app, and the session folder holds only
`transcript.md`: there is no screenshot and no saved file to grade from. When this grade was
written, `rounds/round-5/plan.md` still had no "Gate evidence" section (the only match is the prose
on line 61 that describes the gate). Sessions r5-s30, r5-s31 and r5-s33 to r5-s35 also hold only a
transcript, which points to a round-wide block, not anything specific to this session.

The fault is in the tool and the round setup, not in the participant or the app build, so under
the criteria ("a tool fault voids the session, which is re-run and counted") this session is VOID.
The task (load trails.csv so kilometers count as a longer walk, then find the shortest walk from
Trailhead to Summit) was never attempted, so its success definition cannot be judged.

## Claims and counts

- False "done" claims: 0. The participant claimed nothing about the task and said the session
  never started.
- Wrong turns: 0. No app steps were taken.
- Problems in the app: none observable. The app was never shown.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (tool, not app) | The round 5 start gate never passed, so `--start` refuses every session; the session must be re-run after `real.mjs --gate design/ui/studio/tier2/rounds/round-5` exits 0 | `transcript.md`, Commands step 2 output; `rounds/round-5/plan.md` has no "Gate evidence" section |
