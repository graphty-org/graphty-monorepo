# Grade: r1-s21b (T72 A, setup A: sources, Ruth)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:sources.txt`.
- Steps: 0 (path A in answers.md lists 14 actions, from + > Layer to the final Enter). Wrong
  turns: 0. False "done": no (the participant wrote "Finished: no").

## Why void

`real.mjs --start` exited 1, twice (once from the session's own command, once from the worktree
root), with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s21b/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. Two later `--step` calls found no live
session. T72 A's success definition (a layer selecting kind company or agency, except on_record
Yes, filled orange; 7 of 24) cannot be checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and the participant's two logs and printed three VOID lines naming `plan.md` and the
round folder, all attributed to a `Bash` call in the first log. That call is the heredoc that
writes the participant's own `transcript.md`; the heredoc quotes the tool's FAIL message above,
which names `plan.md` and the round folder. The participant's tool calls were: read its briefing,
run `--start` twice, write its transcript with a heredoc, list and re-read its own folder, run
`--step` twice (no live session), and append the follow-up with a heredoc. It never opened
`plan.md` or any other file outside its folder, and never ran `--gate`. The check matched file
names inside text being written; that is a false positive, not a leak. The session is void
because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer gives no number ("No
number -- I can't honestly give one. The program never opened for me this time."). Its least-sure
moment is the start-up refusal with only a terminal FAIL line on screen. That follows from the
failed run, not from the participant.

## Problems

None graded against the app. The tool failure is that the round plan lacks the "Gate evidence"
section `real.mjs --start` requires; `real.mjs --gate` must pass on the round before this session
is rerun from a clean folder. The leak check also reports a file name quoted inside a heredoc
`Bash` write as a file the participant opened, which voids a clean session by mistake whenever a
tool error message is copied into a transcript.
