# Grade: r1-s13 (T74, setup A: food bank volunteers, ranked, Grace)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's log files; not sonnet).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant said plainly it never started).

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

The round's `plan.md` still holds no "Gate evidence" section. No browser opened and no screenshot
was taken; a later `--step` answered "No live session in this folder". The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s13/`) holds only `briefing.md` and
`transcript.md`; no `--end` ran, so this round folder had no screenshots, `downloads/`,
`data.json` or `leaks.json` until this file. The task's success definition (the five ranked
volunteers kept in the picture) cannot be checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It printed one
VOID line: "opened a facilitator file, plan.md (Bash, agent-a02ca586d78bdb440.jsonl)". That Bash
call is a `cat > transcript.md` heredoc in which the participant writes its own transcript, whose
text quotes the tool's FAIL message naming `plan.md`. The participant's only tool calls were
reading its own briefing and transcript, two `--start` runs, one `--step` run and writing its own
transcript; it never opened `plan.md`. The flag is a false positive of the check (it matches a
file name inside text being written), not a real leak. The session is void because the run
failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer declines to rate the
program because it never opened ("call it a 4 ... about the setup, not the program"); the
least-sure moment it names is the tool's FAIL line, not an app screen.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | The round's sessions were launched before the round gate passed; the tool refused every start | transcript.md step 0 (start exit 1, no screenshot) |
| 2 | 2 | behavior | No usable follow-up answer about the app (no rating of the program, no least-sure moment on an app screen) | transcript.md "Follow-up" |
| 3 | 1 | behavior | The leak check flags a file name quoted in a heredoc the participant uses to write its own transcript as an opened file | `--leaks` output, Bash `cat > transcript.md` |

## Next

Run `real.mjs --gate` on `tier5/rounds/round-1` until it exits 0, then rerun r1-s13 from a fresh
participant folder.
