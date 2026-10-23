# Grade: session r5-s46

Task T19 (leave two reminders, one on a node and one on the whole network, that survive a return
visit, and show where to read them), start setup:florentine-ranked.txt, persona Elena (tier 1
graduate).

**Grade: VOID** -- the tool refused to start the session, so the app never opened and there is
nothing to grade.

## Why

- `real.mjs --start` exited 1 with: `plan.md holds no "Gate evidence" section, so no session of
  this round may start; run real.mjs --gate .../tier2/rounds/round-5 until it exits 0`. No browser
  opened and no screenshot was taken (`transcript.md` in this folder).
- The session's work folder (`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s46/`) holds
  only `briefing.md`: no screenshot, no saved file.
- Round 5's `plan.md` still has no "Gate evidence" section; the words appear only in the paragraph
  that describes the gate. The refusal was correct: the round was launched before its start gate
  passed. Other round 5 sessions (r5-s45 among them) failed the same way.
- The participant never used the app, so the run says nothing about the build.

## Counts

- False "done" claims: none (the participant correctly reported "Finished: no")
- Wrong turns: none (the app was never used)
- Problems with the build: none observed

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0, then run r5-s46 again. The rerun
counts toward the round.
