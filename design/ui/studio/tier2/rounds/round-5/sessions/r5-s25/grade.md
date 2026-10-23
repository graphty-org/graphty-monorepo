# Grade: session r5-s25 (task T24, persona Ruth, tier 1 graduate)

Task T24, dataset A (running club, friends.csv, names drawn), start
setup:friends-ranked-names.txt.

**Grade: VOID** -- the run never reached the app, so there is nothing to grade.

## Why it is void

- This session folder did not exist before grading: no transcript, no screenshot and no saved
  file. The session's work folder
  (`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s25/`) holds only `briefing.md`, written
  by `real.mjs --brief` at 07:11; no `--start` output, step screenshot or download follows it.
- Round 5's `plan.md` holds no "Gate evidence" section (only the sentence describing the
  requirement, line 61). `real.mjs --start` refuses every session of the round until
  `real.mjs --gate` on the round folder exits 0 and writes that section. The sessions started
  beside this one (r5-s24, r5-s26) recorded exactly that refusal, exit 1, and no browser opened.
- With no last screenshot and no saved file, neither success nor failure can be judged. This is a
  run fault (the round gate was never passed, and this session left no transcript of its own), not
  a participant or app outcome.

## Counts

- False "done" claims: none (the app was never used)
- Wrong turns: none (no step was taken)
- Problems with the build: none observed

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0, then run r5-s25 again from a new,
empty folder. The rerun counts toward the round.
