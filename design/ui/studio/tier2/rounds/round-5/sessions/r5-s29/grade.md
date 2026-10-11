# Grade: session r5-s29 (task T20, Nadia, tier 1 graduate)

**Grade: VOID** -- the run failed before the app opened. Re-run the session once the round gate passes.

## Why void

`real.mjs --start` refused to start the session (exit 1):

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no
    session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5
    until it exits 0

Round 5's `plan.md` has no "Gate evidence" section; its only mention (line 61) says that `--start`
refuses every session until the gate writes one. The refusal was correct for the state the round
was in. No browser opened, no screenshot was taken and no file was saved. This session folder did
not exist; the session's only record is a transcript written to the scratch session folder
`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s29/transcript.md` (beside its
`briefing.md`). With no last screenshot and no saved file there is nothing to grade against T20's
success definition. This is a run failure, not a participant outcome, so the criteria's rule
applies: a void session is counted, reported and re-run from a new, empty folder.

## Claims and behavior

- False "done" claims: 0. The participant claimed nothing about the task and reported that the
  session never started ("Not finished: no session ran. Ease: not rated.").
- Wrong turns: 0. The participant correctly did not run the round gate itself.

## Problems

- Severity 0 (tool/process, not the app): sessions were launched before the round's start gate
  had passed, so every round 5 session launched in this state is void. Evidence: the transcript's
  start command output; `plan.md` has no "Gate evidence" section.
- Severity 0 (tool/process): the session's transcript was written only under `tmp/studio-sessions/`
  and never copied into this round's session folder, so the study record for r5-s29 held nothing
  until this grade.

No problem in the app was observed.
