# Grade: r1-s20b (T78 B, setup B: river gauges, gauges-clean, Maren)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:gauges-clean.txt`.
- Steps: 0 (the path is 19). Wrong turns: 0. False "done": no (the participant wrote
  "Finished: no").

## Why void

`real.mjs --start` exited 1, twice (once from the session's own command, once from the worktree
root), with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s20b/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. A later `--step` answered "No live
session". T78 B's success definition in answers.md (a layer selecting Degree 2 or more on
stretches with `km` under 3, filled orange; 7 of 11 gauges) cannot be checked against a screen
that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and the participant's two logs and printed four VOID lines naming `plan.md` and the round
folder, attributed to a `Write` in the first log and a `Bash` call in the second. Both come from
text, not from opening a file: the `Write` is the participant's own `transcript.md`, and the
`Bash` call is a heredoc append to that same file; both quote the tool's FAIL message above,
which names `plan.md` and the round folder. The participant's tool calls were: read its briefing,
run `--start` twice, write its transcript, list and re-read its own folder, run `--step` once
(refused: no live session), and append the follow-up with a heredoc. It never opened `plan.md`
or any other file outside its folder, and never ran `--gate`. The check matched file names
inside text being written; that is a false positive, not a leak. The session is void because the
run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer gives no number ("I
can't give you a number for the program -- I never saw it"). Its least-sure moment is the start-up
refusal with only a terminal FAIL line on screen. That follows from the failed run, not from the
participant.

## Problems

None graded against the app. The tool failure is that the round plan lacks the "Gate evidence"
section `real.mjs --start` requires; `real.mjs --gate` must pass on the round before this session
is rerun from a clean folder. The leak check also reports a file name quoted inside a `Write` or
heredoc `Bash` write as a file the participant opened, which voids a clean session by mistake
whenever a tool error message is copied into a transcript.
