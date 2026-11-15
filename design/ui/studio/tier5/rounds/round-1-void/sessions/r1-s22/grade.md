# Grade: r1-s22 (T72 B, setup B: river gauges, gauges + flows (tidied), Tom)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:gauges-clean.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant wrote "Finished the task: no").

## Why void

`real.mjs --start` exited 1 (run twice by the participant, the same both times) with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s22/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. T72 B's success definition in answers.md
(a style layer selecting telemetry yes gauges not installed in the 1990s, filled orange, with the
count of 5 of 11 reported) cannot be checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and the participant's two logs and printed three VOID lines, all from one call: the
participant writing its own `transcript.md` with a heredoc that quotes the tool's FAIL message
above, which names `plan.md` and the round folder. The participant's tool calls were: read its
briefing, run `--start` twice, write the transcript, re-read its own folder, run `--step` (which
reported no live session), and append the follow-up. It never opened `plan.md` or any other file
outside its folder. The check matched a file name inside text being written; that is a false
positive, not a leak. The session is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer gives no number because
the program was never shown, and its least-sure moment is the start-up refusal with nothing on
screen. That follows from the failed run, not from the participant.

## Problems

- The round's start gate refused every session (the plan had no gate evidence when the session
  was started), so the session must be re-run as r1-s22b once the gate passes. Tooling, not the
  product: no product finding.
- The leak check reports a path quoted inside text the participant wrote as an opened file. It
  should count only reads, not file names inside a write's content.
