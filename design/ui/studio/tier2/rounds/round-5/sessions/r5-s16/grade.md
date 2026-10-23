# Grade: r5-s16 (T17, Les Miserables, Tom -- tier 1 graduate)

**Grade: VOID** -- the run failed before the app was shown; re-run this session once the round's
start gate has passed.

## Why

- This folder held no screenshots, downloads or transcript. The only files for this session are
  under `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s16/` of the worktree: a briefing
  and a transcript, and no screenshot.
- The transcript records two commands. `real.mjs --brief` wrote the briefing to the `tmp/` folder
  instead of this one (exit 2). `real.mjs --start ... setup:lesmis-ranked.txt` on the frozen build
  `.study-builds/tier2-r5-8c015b806/` exited 1 with: `plan.md holds no "Gate evidence" section, so
  no session of this round may start; run real.mjs --gate ... until it exits 0`.
- `../../plan.md` ("The gate before the first session") confirms `--start` refuses every session
  until `--gate` has written "Gate evidence" at its end, and the file has no such section.
- So no browser opened and no step was taken. There is no last screenshot to grade, and the
  participant never saw the task's screen. This is a tool or run failure, not a participant
  failure.

## Counts

- False "done" claims: 0 (the transcript says "Finished: no").
- Wrong turns: 0 (no step taken in the app).
- Ease: not rated.

## Problems

None in the app; nothing was shown. One run-setup problem (not scored against the app):

- Severity n/a -- the round's start gate was never run, so `real.mjs --start` refuses every
  round 5 session. Evidence: the exit message above, and every other round 5 folder under `tmp/`
  holding only a briefing.
