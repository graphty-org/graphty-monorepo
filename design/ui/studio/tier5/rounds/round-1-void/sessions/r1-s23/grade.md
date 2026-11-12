# Grade: r1-s23 (T75 A, setup A: graph researchers sample, researchers.txt, Alex)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:researchers.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant wrote "Finished the task: no").

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. A later `real.mjs --step` answered "No live
session ... start one with --start". The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s23/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. T75 A's success definition in answers.md
cannot be checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and the participant's two logs and printed two VOID lines: "the participant opened a
facilitator file, plan.md (Bash)", one per log. Both calls are the participant writing its own
`transcript.md` with a heredoc (`cat >` in the first log, `cat >>` in the second) whose text quotes
the tool's FAIL message, which names `plan.md`. The participant's tool calls were: read its
briefing, run `--start`, write the transcript, re-read its own folder, run `--step`, and append the
follow-up. It never opened `plan.md` or any other file outside its folder. The check matched a file
name inside text being written; that is a false positive, not a leak. The session is void because
the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer gives no number because
the program was never shown, and its least-sure moment is the start-up refusal with nothing on
screen. That follows from the failed run, not from the participant.

## Problems

None graded against the app. The tool failure is that the round plan lacks the "Gate evidence"
section `real.mjs --start` requires; `real.mjs --gate` must pass on the round before this session
is rerun. The leak check also flags a file name written inside the participant's own transcript as
an opened file.
