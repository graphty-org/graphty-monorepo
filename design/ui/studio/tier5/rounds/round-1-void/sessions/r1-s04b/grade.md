# Grade: r1-s04b (T70, setup B: river gauges, Maren)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:gauges-clean.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant said plainly it never started).

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. A later `--step` answered "No live session ...;
start one with --start". The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s04b/`) holds only `briefing.md` and
`transcript.md`; no `--end` ran, so this round folder had no screenshots, `downloads/`,
`data.json` or `leaks.json` until this file. The task's success definition cannot be checked
against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and both participant logs and printed two VOID lines: "opened a facilitator file, plan.md
(Bash)", one per log. Each flagged call is the participant writing its own `transcript.md` with a
heredoc that quotes the tool's FAIL message above, which names `plan.md`; neither log reads,
lists or opens that file (every other call reads the briefing or the transcript, or runs
`real.mjs --start` / `--step` on its own folder). The leak is a false positive of the check, not a
real leak. The session is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer is a refusal to rate:
the app was never shown, so no number, no least-sure moment and no account of the drawing during
the orange choice.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior (tool) | The round was launched before `real.mjs --gate` wrote the "Gate evidence" section into the round's `plan.md`, so `--start` refused this session | transcript step 0, exit 1 |
| 2 | 0 | behavior (tool) | `real.mjs --leaks` flags a file name quoted inside a heredoc the participant writes to its own transcript as opening that file | both participant logs, the transcript-writing Bash calls |
| 3 | 1 | behavior | The follow-up has no rating, least-sure moment or account of the drawing (nothing was shown) | transcript, "Follow-up" |
