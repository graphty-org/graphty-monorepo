# Grade: session r5-s55

Task T12R (Les Miserables, Javert's ties), start setup:lesmis-ranked.txt, persona Ruth (tier 1
graduate).

**Grade: VOID** -- the session tool refused to start the session, so the app never opened and
there is nothing to grade.

## Why

- `real.mjs --start` exited 1 with: `plan.md holds no "Gate evidence" section, so no session of
  this round may start; run real.mjs --gate .../round-5 until it exits 0`. The round's
  pre-session gate had not passed, and the tool blocks every session of the round until it does.
  `round-5/plan.md` still has no "Gate evidence" section.
- No browser was taken, no screenshot was made and no file was saved. This folder holds only the
  transcript, and the work folder (`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s55/`)
  holds only `briefing.md`.
- This is a failure of the run, not of the participant or the app: the participant never saw the
  app. The session must be re-run from a new, empty folder with the same persona and setup once
  `real.mjs --gate` on round 5 exits 0.

## Measures

- Finished: no. Steps: 0. Wrong turns: 0. False "done" claims: none.
- Ease: not rated (the participant's rating is never used for the grade in any case).

## Problems

None scored against the app. The only problem is the run's: the round gate had not passed when the
session was launched (severity 0 for the app; it blocks the measurement, not the user).
