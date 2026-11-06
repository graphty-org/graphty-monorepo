# Grade: r1-s03 (T70, setup A: food bank volunteers, ranked, Dana)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from the participant's own log; the transcript does
  not name a model).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant said plainly it never started).

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. A later `--step` answered "no live session"
(exit 2). The participant folder (`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s03/`)
holds only `briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no
screenshots, `downloads/`, `data.json` or `leaks.json` until this file. The task's success
definition (staff in orange, the untrained volunteers set aside) cannot be checked against a
screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It printed four
VOID lines: "opened a studio file" for `tier5/rounds/round-1/plan.md` and for
`tier5/rounds/round-1`, "opened a facilitator file, plan.md", and "opened a path up out of its
folder, ..". The participant's log holds only these calls: `cat`/Read of its own `briefing.md` and
`transcript.md`, the `--start` command, an `ls` of its own folder plus `--step`, and two heredocs
(`cat >` and `cat >>`) writing its own `transcript.md`. Every flagged path occurs only inside that
heredoc text, which quotes the tool's FAIL message (naming `plan.md` and the round folder) and
abbreviates paths as `.../`. The participant never opened any of them. The flags are false
positives of the check (it matches path text inside content being written), not leaks. The session
is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer declines to rate: the app
was never shown, so no 1-7 number, no least-sure moment in the app and no account of what the
drawing did while choosing who goes in orange.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | The round's sessions were launched before the round gate passed; the tool refused the start | transcript.md step 0 (start exit 1, no screenshot) |
| 2 | 2 | behavior | No usable follow-up answer (calm 1-7, least-sure moment, the drawing while choosing orange) | transcript.md "Follow-up" |
| 3 | 1 | behavior | The leak check reports path text inside a heredoc the participant writes to its own transcript as an opened file, including `...` as `..` | `--leaks` output against the Bash heredocs in the participant log |

## Next

Run `real.mjs --gate` on `tier5/rounds/round-1` until it exits 0, then rerun r1-s03 from a fresh
participant folder.
