# Grade: r1-s19b (T78 A, setup: volunteers-shifts, Dana)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers-shifts.txt`.
- Steps: 0 of the 17-step success path. Wrong turns: 0. False "done": no (the participant wrote
  "Finished: no").

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s19b/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. A later `--step` answered "No live
session", exit 2. T78 A's success definition in answers.md (a style layer selecting Degree 3 or
more computed on just the ties with `shifts` 2 or more, filled orange, and the count 11 of 24
reported) cannot be checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run. It read the briefing and the
participant's two logs and printed three VOID lines naming `plan.md` and the round folder, all
attributed to a `Bash` call. Each one comes from text, not from opening a file: that call is the
heredoc that writes the participant's own `transcript.md`, which quotes the tool's FAIL message
above. The participant's tool calls were: read its briefing, run `--start`, write its transcript,
print and grep its own briefing and transcript, run `--step` once, and append the follow-up. It
never opened `plan.md` or any other file outside its folder. This is a false positive, not a leak;
the session is void because the run failed.

## Follow-up

The transcript holds the follow-up question and an answer. It gives no number for the program
("I can't give you a number for the program -- I never got into it"; it offers a 4 for the
morning, not the software), and its least-sure moment is the start-up refusal with only a FAIL
line in the terminal. That follows from the failed run, not from the participant.

## Problems

None graded against the app. The tool failure is that the round plan lacks the "Gate evidence"
section `real.mjs --start` requires; `real.mjs --gate` must pass on the round before this session
is rerun from a clean folder. The leak check also counts a file name quoted inside text the
participant writes to its own transcript as a file it opened.
