# Grade: session r5-s24

Task T18, dataset B (Florentine families), start setup:florentine-ranked.txt, persona Tom
(tier 1 graduate).

**Grade: VOID** -- the run failed before the app opened, so there is nothing to grade.

## Why

- The session left no screenshot and no saved file. Its work folder
  (`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s24/`) holds only `briefing.md`; this
  folder holds only the transcript.
- The transcript records that `real.mjs --start` refused the session with exit 1: round 5's
  `plan.md` holds no "Gate evidence" section, and no session of a round may start until
  `real.mjs --gate <round folder>` has passed and written it. No browser was opened. The plan
  still has no such section.
- The participant never used the app, so the run says nothing about the build.

## Counts

- False "done" claims: none (the app was never used)
- Wrong turns: none (the app was never used)
- Problems with the build: none observed

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0, then run r5-s24 again from a new,
empty folder. The rerun counts toward the round.
