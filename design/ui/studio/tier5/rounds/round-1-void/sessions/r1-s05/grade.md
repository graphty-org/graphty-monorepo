# Grade: r1-s05 (T71, setup A: volunteers, Grace)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from the participant's own log; the transcript does not name it).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant said plainly it never started).

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. A later `--step` printed "No live session". The
participant folder (`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s05/`) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, `data.json` or `leaks.json` until this file. The task's success definition cannot be
checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It printed one
VOID line: "opened a facilitator file, plan.md (Write)". That call is the participant writing its
own `transcript.md`, whose text quotes the tool's FAIL message above, which names `plan.md`. The
participant's only tool calls were reading its own briefing, two `--start`/`--step` runs and
writing its own transcript; it never opened `plan.md`. The flag is a false positive of the check
(it matches a file name inside text being written), not a real leak. The session is void because
the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer is a refusal to rate:
the app was never shown, so no number, no least-sure moment and no account of what besides the
drawing was looked at while choosing who stays in the picture.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | The round's sessions were launched before the round gate passed; the tool refused every start | transcript.md step 0 (start exit 1, no screenshot) |
| 2 | 2 | behavior | No usable follow-up answer (ease 1-7, least-sure moment, what besides the drawing helped or got in the way) | transcript.md "Follow-up" |
| 3 | 1 | behavior | The leak check flags a file name quoted in text the participant writes as an opened file | `--leaks` output, Write of its own transcript.md |

## Next

Run `real.mjs --gate` on `tier5/rounds/round-1` until it exits 0, then rerun r1-s05 from a fresh
participant folder.
