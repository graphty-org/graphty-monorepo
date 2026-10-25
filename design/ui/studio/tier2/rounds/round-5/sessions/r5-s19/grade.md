# Grade: session r5-s19

Task T18, dataset A (running club, friends.csv), start setup:friends-ranked.txt, persona Dana
(regular analyst).

**Grade: VOID** -- the run failed before the app opened, so there is nothing to grade.

## Why

- `real.mjs --start` exited 1 with "FAIL: ... round-5/plan.md holds no "Gate evidence" section, so
  no session of this round may start" (transcript, "Did not run"). Round 5's `plan.md` still has
  no "Gate evidence" section; `real.mjs --start` refuses every session of the round until
  `real.mjs --gate <round folder>` has passed and written it.
- No browser opened. The session left no screenshot and no saved file; its work folder
  (`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s19/`) holds only `briefing.md`.
- No finish, ease or confusion rating was given, and none would count.

## Counts

- False "done" claims: none (the participant correctly said the session never started)
- Wrong turns: none (the app was never used)
- Problems with the build: none observed

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0, then run r5-s19 again from a new,
empty folder. The rerun counts toward the round.
