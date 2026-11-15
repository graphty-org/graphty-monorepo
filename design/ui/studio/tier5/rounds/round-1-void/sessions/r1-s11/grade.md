# Grade: r1-s11 (T73 A, setup A: volunteers, volunteers.graphml, Dana)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers.txt`.
- Steps: 0. Wrong turns: 0. False "done": no (the participant wrote "Finished: no").

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s11/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. T73 A's success definition in answers.md
(find James Carter, id `v02`) cannot be checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It read the
briefing and the participant's two logs and printed three VOID lines, all from one call: a Write of
the participant's own `transcript.md` whose text quotes the tool's FAIL message above, which names
`plan.md` and the round folder. The participant's only other calls read its own `briefing.md` and
`transcript.md`, ran `--start` and `--step`, and appended the follow-up to its own transcript; it
never opened a file outside its folder. The flags are a false positive of the check (a path matched
inside text being written), not a leak. The session is void because the run failed.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer declines to give a number
because the app never opened, and its least-sure moment is the terminal error, not a screen of the
app. That follows from the failed run, not from the participant.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | The round's sessions were launched before the round gate passed; the tool refused the start | transcript.md step 0 (start exit 1, no screenshot) |
| 2 | 2 | behavior | No follow-up rating of the program (1-7) and no least-sure moment on an app screen | transcript.md "Follow-up" |
| 3 | 1 | behavior | The leak check flags paths quoted in text the participant writes to its own transcript as opened files | `--leaks` output, Write of its own transcript.md |

## Next

Run `real.mjs --gate` on `tier5/rounds/round-1` until it exits 0, then rerun r1-s11 from a fresh
participant folder with `setup:volunteers.txt`.
