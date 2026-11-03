# Grade: r1-s05b (T71 A, setup A: volunteers, Grace, returning)

Grade: VOID -- the study tool refused to start the session, so there is nothing to grade.

- Participant model: opus (claude-opus-5-5, from both of the participant's logs; the transcript does not name it).
- Build: none shown. The start command named the frozen build
  `.study-builds/tier5-r1d1-1e123d7d33` with `setup:volunteers.txt`.
- Steps: 0 (success path: 9). Wrong turns: 0. False "done": no (the participant wrote "Finished: no").

## Why void

`real.mjs --start` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

The round's `plan.md` still holds no "Gate evidence" section, so this rerun of r1-s05 met the same
refusal as the first attempt. No browser opened and no screenshot was taken. The participant folder
(`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s05b/` in the studio worktree) holds only
`briefing.md` and `transcript.md`; no `--end` ran, so this round folder had no screenshots,
`downloads/`, step files or `leaks.json` until this file. T71 A's success definition in answers.md
(one filter card with an Or group, role board or hours 30 or more, 10 of 24 in the picture) cannot
be checked against a screen that never existed.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run (on this folder and on the participant
folder; both read the same briefing and two logs). It printed one VOID line: "opened a facilitator
file, plan.md (Bash, agent-af36a13b18aaf0fa2.jsonl)". That Bash call is the participant writing its
own `transcript.md` with a heredoc that quotes the tool's FAIL message above, which names `plan.md`.
The participant's tool calls were: read its briefing, run `--start`, write its transcript, then
(in the follow-up) read its briefing and transcript, read the harness's saved copy of that same
output, and append the follow-up to its transcript. It never opened `plan.md` or any other file
outside its folder. The flag is a false positive of the check (a file name inside text being
written), not a leak. The session is void because the run failed.

## Follow-up

The transcript holds the follow-up question and an answer, but the answer gives no number, no
least-sure moment in the app and no account of what besides the drawing was looked at while
deciding who stays in the picture, because the program was never shown.

## Problems

| # | Severity | Kind | What | Evidence |
|---|---|---|---|---|
| 1 | 4 | behavior | Sessions are still launched while the round gate has not passed; the tool refused the start again | transcript.md step 0 (start exit 1, no screenshot); plan.md has no "Gate evidence" |
| 2 | 2 | behavior | No usable follow-up answer (overwhelm 1-7, least-sure moment, what besides the drawing helped or got in the way) | transcript.md "Follow-up" |
| 3 | 1 | behavior | The leak check flags a file name quoted in text the participant writes as an opened file | `--leaks` output, the heredoc writing its own transcript.md |

## Next

Run `real.mjs --gate` on `tier5/rounds/round-1` until it exits 0 and records its gate evidence,
then rerun this session from a fresh participant folder.
