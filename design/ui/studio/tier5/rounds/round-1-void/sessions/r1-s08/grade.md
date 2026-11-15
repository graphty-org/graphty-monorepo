# Grade: r1-s08 (T71 B, river gauges, Alex)

Grade: VOID -- the session never ran.

- Participant model: claude-opus-5-5 (from the participant's log; not a Sonnet re-run).
- Build: 1e123d7d33 (the frozen build named in criteria.md).
- Steps: 0. Wrong turns: 0. False "done": no (the participant said plainly that the app never
  opened). Screenshots: none. Downloads: none.

## Why VOID

The study tool refused to start the session. `real.mjs --start ... setup:gauges-clean.txt` exited 1
with:

    FAIL: .../design/ui/studio/tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no
    session of this round may start; run real.mjs --gate .../design/ui/studio/tier5/rounds/round-1
    until it exits 0

The round's plan.md has no "Gate evidence" section (checked: no such heading), so the round gate
had not been passed. No browser opened, there is no 01.png, and nothing about the app or the task
can be graded. Per the round plan, a session that ends with no 01.png is re-run from a clean folder
as r1-s08b once the gate passes.

## Leak check

The session folder had no leaks.json, so `real.mjs --leaks` was run on it. It reported two VOID
lines, "the participant opened a facilitator file, plan.md", one for the session log and one for
the follow-up log. Both are false positives: the participant's tool calls only read its own
briefing.md, ran `--start` and `--step`, and wrote its own transcript.md. The file name plan.md
appears only inside the tool's own FAIL message, which the participant quoted in a heredoc that
wrote transcript.md. No file outside the session folder was opened. The VOID verdict rests on the
failed start, not on a leak. The leak check also did not write leaks.json after reporting.

## Follow-up question

The transcript holds the follow-up question word for word and an answer, but the answer gives no
rating ("not rated") because there was no screen. This is a consequence of the failed start, not a
participant behavior problem.

## Problems

1. Severity 4, tool -- the round gate was not passed before sessions were launched, so the start
   refused this session (Step 0, transcript.md; no screenshot).
2. Severity 2, tool -- `real.mjs --leaks` counts a file name quoted inside a heredoc the participant
   wrote (the tool's own error text) as opening that file, and reports a leak that did not happen;
   it also leaves no leaks.json behind.
