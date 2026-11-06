# Grade: r1-s23b (T75 A, a big network made readable: graph researchers, Alex)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:researchers.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant said plainly it never started).

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s23b/`) holds only `briefing.md` and
`transcript.md`; no `--end` ran, so this round folder had no screenshots, `downloads/`,
`data.json` or `leaks.json` until this file. The task's success definition cannot be checked
against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and both participant logs and printed four VOID lines naming `plan.md` and the round
folder. Every flagged call is the participant writing its own `transcript.md` (one heredoc append,
one Write) whose text quotes the tool's FAIL message above, which names `plan.md` and the round
folder. Neither log reads, lists or opens those paths: the only other calls read the briefing and
run `real.mjs --start` on its own folder. The leaks are false positives of the check, not real
leaks. The session is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer is a refusal to rate:
the app was never shown, so there is no number and no least-sure moment in the program.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior (tool) | The round was launched before `real.mjs --gate` wrote the "Gate evidence" section into the round's `plan.md`, so `--start` refused this session | transcript step 0, exit 1 |
| 2 | 0 | behavior (tool) | `real.mjs --leaks` flags a path quoted inside text the participant writes to its own transcript as opening that path | both participant logs, the transcript-writing calls |
| 3 | 1 | behavior | The follow-up has no rating and no least-sure moment (nothing was shown) | transcript, "Follow-up" |
