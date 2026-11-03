# Grade: r1-s27 (T79 A, setup A: research office staff, 50,000 people, Alex)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:staff-50k.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant wrote "Finished: no").

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s27/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. A later `--step` answered "no live
session". T79 A's success definition in answers.md (a style layer whose selection is dept Grants,
filled orange, with the count 1,076 of 50,000 reported) cannot be checked against a screen that
never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and the participant's two logs and printed three VOID lines: a studio file
`design/ui/studio/tier5/rounds/round-1/plan.md`, the folder `design/ui/studio/tier5/rounds/round-1`,
and a facilitator file `plan.md`, all from one Bash call. That call is the participant writing its
own `transcript.md` with a heredoc that quotes the tool's FAIL message above (which names both
paths) and its "Facilitator action" line. The participant's tool calls were: read its briefing,
run `--start`, write the transcript, re-read its own briefing and transcript, run `--step` once
(refused: no live session), and append the follow-up. It never opened `plan.md` or anything else
outside its folder. The check matched path names inside text being written; that is a false
positive, not a leak. The session is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer. The answer gives no number for the
program because it was never shown (it offers a 2 for the start-up step only), and its least-sure
moment is the start-up refusal in the terminal with no app on screen. That follows from the failed
run, not from the participant.

## Problems

- Severity 0, behavior (tool, not build): the round could not start because round-1 `plan.md`
  has no "Gate evidence" section (step 0, no screenshot). This is the study tool's gate, not a
  defect of the build under test.
- Severity 0, behavior (tool): `real.mjs --leaks` flags path names quoted inside a heredoc the
  participant writes to its own transcript as opened files (false positive, step 0).
