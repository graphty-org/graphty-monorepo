# Grade: r1-s03b (T70A, setup A: food bank volunteers, Dana)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from the participant's own logs; the transcript does
  not name a model).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the transcript says "Finished: no" and that the
  session never started).

## Why void

`real.mjs --start` exited 1, twice (once from the participant folder, once from the worktree
root), with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

`plan.md` still holds no "Gate evidence" section. No browser opened and no screenshot was taken;
a later `--step` answered that there is no live session. No `--end` ran, so this round folder had
no screenshots, `downloads/`, `data.json` or `leaks.json` until this file. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s03b/`) holds only `briefing.md` and
`transcript.md`. The task's success definition cannot be checked against a screen that never
existed. This is the same failure that voided r1-s03; the rerun was launched before the round
gate passed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It found two
participant logs and printed three VOID lines, all from one `Write` call: "opened a studio file"
for `tier5/rounds/round-1/plan.md` and for `tier5/rounds/round-1`, and "opened a facilitator file,
plan.md". That `Write` writes the participant's own `transcript.md`; the flagged paths occur only
in its content, which quotes the tool's FAIL message. The participants' other calls are a Read and
a `cat` of their own `briefing.md` and `transcript.md`, a `tail` of the harness's saved output of
that same `cat`, the `--start` and `--step` commands, and a `cat >>` heredoc appending to their own
`transcript.md`. Nothing outside the participant folder was opened. The flags are false positives
of the check (it treats path text inside content being written as an opened file), not leaks. The
session is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer declines to rate: the
app was never shown, so there is no 1-7 number, no least-sure moment in the app, and no account of
what the drawing did while choosing who goes in orange.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | The rerun was launched while the round gate still had not passed; the tool refused the start | transcript.md step 0 (start exit 1, no screenshot) |
| 2 | 2 | behavior | No usable follow-up answer (calm 1-7, least-sure moment, the drawing while choosing orange) | transcript.md "Follow-up" |
| 3 | 1 | behavior | The leak check reports path text inside content a participant writes to its own transcript as an opened file | `--leaks` output against the `Write` of transcript.md |

## Next

Run `real.mjs --gate` on `tier5/rounds/round-1` until it exits 0 and `plan.md` holds its "Gate
evidence" section, then rerun this session from a fresh participant folder.
