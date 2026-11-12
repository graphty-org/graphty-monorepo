# Grade: session r5-s01

Task T22, dataset A (bus stops, bus-stops.csv), start setup:bus-stops-ranked.txt, persona Grace
(tier 1 graduate).

**Grade: VOID** -- the run failed before the app opened, so there is nothing to grade.

## Why

- The session left no screenshot, no transcript and no saved file. Its work folder
  (`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s01/`) holds only `briefing.md`, and this
  folder held nothing before this file.
- Round 5's `plan.md` has no "Gate evidence" section, and `real.mjs --start` refuses every session
  of a round until `real.mjs --gate <round folder>` has passed and written it. Sessions r5-s02 and
  r5-s04 on the same build record that exact refusal (exit 1, no browser opened). r5-s01 started
  in the same batch against the same plan, so it could not have opened the app either.
- The participant never used the app, so the run says nothing about the build.

## Counts

- False "done" claims: none (the app was never used)
- Wrong turns: none (the app was never used)
- Problems with the build: none observed

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0, then run r5-s01 again. The rerun
counts toward the round.
