# Grade: r1-s02 (T70, setup B: river gauges, Tom)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from the participant's own log; both of its log files
  name only that model).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:gauges-clean.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant said plainly it never started).

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

The round's `plan.md` still holds no "Gate evidence" section. No browser opened and no screenshot
was taken. The participant folder (`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s02/`)
holds only `briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no
screenshots, `downloads/`, `data.json` or `leaks.json` until this file. The T70 success definition
in `answers.md` (section "T70. A simple choice, twice") cannot be checked against a screen that
never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It printed three
VOID lines, all from one Write call: the participant writing its own `transcript.md`, whose text
quotes the tool's FAIL message above (which names `plan.md` and the round folder). The
participant's tool calls were: Read of its own `briefing.md`, the `--start` command, that Write,
reads of its own `briefing.md` and `transcript.md`, one `--step` (exit 2, no live session) and an
append to its own `transcript.md`. It never opened a file outside its own folder. The flagged
lines are a false positive of the check (a file name inside text being written), not a leak. The
session is void because the run failed.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer declines to rate: the app
was never shown, so there is no number, no least-sure moment in the app and no account of the
drawing while choosing the orange gauges.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | The round's sessions were launched before the round gate passed; the tool refused the start | transcript.md step 0 (start exit 1, no screenshot) |
| 2 | 2 | behavior | No usable follow-up answer (ease 1-7, least-sure moment, the drawing while choosing orange gauges) | transcript.md "Follow-up" |
| 3 | 1 | behavior | The leak check flags file names quoted in text the participant writes to its own transcript as opened files | `--leaks` output, Write into its own transcript.md |

## Next

Run `real.mjs --gate` on `tier5/rounds/round-1` until it exits 0, then rerun r1-s02 from a fresh
participant folder.
