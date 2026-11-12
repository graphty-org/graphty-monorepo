# Grade: r1-s30 (T71 A, setup A: volunteers, volunteers.graphml ranked, Sam, keyboard only)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers.txt --keys`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant wrote "Finished: no").

## Why void

`real.mjs --start` exited 1 with:

    FAIL: design/ui/studio/tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no
    session of this round may start; run real.mjs --gate design/ui/studio/tier5/rounds/round-1
    until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s30/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. A later `--step` answered "no live
session". T71 A's success definition in answers.md (keep only board members and people with 30
or more hours in the picture without deleting anyone, and report how many remain) cannot be
checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the session folder. It read the
briefing and the participant's two logs and printed one VOID line: "opened a facilitator file,
plan.md (Bash, agent-ab6661cee66ba13ef.jsonl)". That Bash call is the participant appending to its
own `transcript.md` with a heredoc that quotes the tool's FAIL message above, which names
`plan.md`. The participant's tool calls were: read its briefing, run `--start`, write the
transcript, re-read its own briefing and transcript, run `--step` once (refused: no live session),
and append the follow-up. It never opened `plan.md` or any other file outside its folder. The
check matched a file name inside text being written; that is a false positive, not a leak. The
session is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer gives no number because
the program was never shown, and its least-sure moment is the start-up refusal with nothing on
screen. That follows from the failed run, not from the participant.

## Problems

- Severity 0, behavior (tool, not build): the round could not start because round-1 `plan.md`
  has no "Gate evidence" section (step 0, no screenshot). This is the study tool's gate, not a
  defect of the build under test.
- Severity 0, behavior (tool): `real.mjs --leaks` flags a file name quoted inside a heredoc the
  participant writes to its own transcript as an opened file (false positive, step 0).
