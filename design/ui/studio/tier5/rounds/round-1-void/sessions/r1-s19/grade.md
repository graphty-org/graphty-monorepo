# Grade: r1-s19 (T78 A, setup A: volunteers with shifts, volunteers-shifts.graphml, Dana)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers-shifts.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant wrote "Finished: no").

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s19/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. T78 A's success definition in answers.md
(a count over just the ties of more than one shift) cannot be checked against a screen that never
existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and the participant's two logs and printed four VOID lines, naming `plan.md` and the round
folder. Every one comes from text, not from opening a file: the participant's `Write` of its own
`transcript.md` and its `cat >>` heredoc appending the follow-up both quote the tool's FAIL message
above, which names `plan.md` and the round folder. The participant's tool calls were: read its
briefing, run `--start`, write the transcript, re-read its own folder and briefing, run `--step`
twice (both reported no live session), and append the follow-up. It never opened `plan.md` or any
other file outside its folder. The check matched a file name inside text being written; that is a
false positive, not a leak. The session is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer gives no number for the
program because it was never shown (the participant offered "a 4" for the start-up error only), and
its least-sure moment is the start-up refusal with nothing on screen. That follows from the failed
run, not from the participant.

## Problems

None graded against the app. The tool failure is that the round plan lacks the "Gate evidence"
section `real.mjs --start` requires; `real.mjs --gate` must pass on the round before this session
is rerun from a clean folder.
