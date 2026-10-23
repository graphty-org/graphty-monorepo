# Grade: session r5-s35

Task T20, dataset A (bus stops, bus-stops.csv: import with minutes as trip length, find the
quickest Depot-to-Harbor route, show where the program says it used the minutes), persona Elena
(tier 1 graduate).

**Grade: VOID** -- the run failed before the app opened, so there is nothing to grade.

## Why

- The session folder holds only `transcript.md`; there is no screenshot and no saved file. The
  work folder (`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s35/`) holds only
  `briefing.md`.
- The transcript records `real.mjs --start` exiting with: `plan.md holds no "Gate evidence"
  section, so no session of this round may start`. Round 5's `plan.md` still has no "Gate
  evidence" section, so `--start` refuses every session of the round until
  `real.mjs --gate <round folder>` passes and writes it. No browser was opened.
- The participant never used the app, so the run says nothing about the build. This is a fault of
  the round setup, not of the participant or the build.

## Counts

- False "done" claims: none (the transcript says "Finished: no" and claims nothing about the app)
- Wrong turns: none (the app was never used)
- Problems with the build: none observed

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0, then run r5-s35 again from a new,
empty folder. The rerun counts toward the round.
