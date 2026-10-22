# Grade: session r5-s50

Task T23, start setup:florentine-ranked.txt, persona Ruth (tier 1 graduate).

**Grade: VOID** -- the study tool refused to start the session, so the app never opened and there
is nothing to grade.

## Why

- The session folder holds only `transcript.md`: no screenshot and no saved file.
- The transcript records `real.mjs --start` exiting 1 with: round 5's `plan.md` "holds no \"Gate
  evidence\" section, so no session of this round may start". `real.mjs --start` refuses every
  session of a round until `real.mjs --gate <round folder>` has passed and written that section.
  No browser was taken and no `--end` was run.
- The participant never saw the app, so the run says nothing about the build. The participant's
  "not rated" is not used.

## Counts

- False "done" claims: none (the participant correctly reported it did not finish)
- Wrong turns: none (the app was never used)
- Problems with the build: none observed

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0 and records "Gate evidence" in
`plan.md`, then run r5-s50 again from a new, empty folder with the same persona and prompt. The
rerun counts toward the round.
