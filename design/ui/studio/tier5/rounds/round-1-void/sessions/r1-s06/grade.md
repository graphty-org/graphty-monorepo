# Grade: r1-s06 (T71, setup B: river gauges, gauges + flows tidied, Tom)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from the participant's own log; the transcript does not name it).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:gauges-clean.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant said plainly it never started).

## Why void

`real.mjs --start` exited 1 with:

    FAIL: design/ui/studio/tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no
    session of this round may start; run real.mjs --gate design/ui/studio/tier5/rounds/round-1
    until it exits 0

No browser opened and no screenshot was taken. A later `--step` printed "No live session in this
folder". The participant folder (`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s06/`)
holds only `briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no
screenshots, `downloads/`, `data.json` or `leaks.json` until this file. The task's success
definition cannot be checked against a screen that never existed. The round's `plan.md` still
has no "Gate evidence" section at grading time.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It printed one
VOID line: "opened a facilitator file, plan.md (Bash)". That call is the participant appending to
its own `transcript.md` with a shell heredoc whose text quotes the tool's FAIL message above,
which names `plan.md`. The participant's only tool calls were reading its own briefing and
transcript, `--start` and `--step` runs, and writing its own transcript; it never opened
`plan.md`. The flag is a false positive of the check (it matches a file name inside text being
written), not a real leak. The session is void because the run failed, not because of a leak.

## Follow-up

The transcript holds the follow-up question and an in-character answer, but the app was never
shown: the "4" rates the tool's error line, not the program; the least-sure moment is that error
line; and nothing besides the drawing was looked at because there was no drawing.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | The round's sessions were launched before the round gate passed; the tool refused every start | transcript.md step 0 (start exit 1, no screenshot) |
| 2 | 2 | behavior | No usable follow-up answer about the program (rating, least-sure moment, what besides the drawing helped or got in the way) | transcript.md "Follow-up" |
| 3 | 1 | behavior | The leak check flags a file name quoted in text the participant writes (a Bash heredoc) as an opened file | `--leaks` output, Bash append to its own transcript.md |

## Next

Run `real.mjs --gate` on `tier5/rounds/round-1` until it exits 0, then rerun r1-s06 from a fresh
participant folder.
