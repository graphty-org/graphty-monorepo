# Grade: r1-s08b (T71 B, setup B: river gauges, gauges + flows (tidied), Alex)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:gauges-clean.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant wrote "Finished: No").

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s08b/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. A later `--step` answered "No live
session", exit 2. T71 B's success definition in answers.md cannot be checked against a screen that
never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and the participant's two logs and printed three VOID lines naming `plan.md` and the round
folder, all attributed to a `Write`. Every one comes from text, not from opening a file: the
participant's `Write` of its own `transcript.md` quotes the tool's FAIL message above, which names
`plan.md` and the round folder. The participant's tool calls were: read its briefing, run
`--start`, write the transcript, re-read its own briefing and transcript, list its folder, run
`--step` once (refused: no live session), and append the follow-up with a heredoc. It never opened
`plan.md` or any other file outside its folder. The check matched a file name inside text being
written; that is a false positive, not a leak. The session is void because the run failed, not
because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer gives no number ("I
can't honestly give you a number. The program never opened for me"), its least-sure moment is the
start-up refusal with only a terminal FAIL line on screen, and it has nothing to say about the
drawing while deciding which gauges stay in the picture. That follows from the failed run, not from
the participant.

## Problems

None graded against the app. The tool failure is that the round plan lacks the "Gate evidence"
section `real.mjs --start` requires; `real.mjs --gate` must pass on the round before this session
is rerun from a clean folder. The leak check also reports a file name quoted inside a `Write` as a
file the participant opened, which voids a clean session by mistake whenever a tool error message
is copied into a transcript.
