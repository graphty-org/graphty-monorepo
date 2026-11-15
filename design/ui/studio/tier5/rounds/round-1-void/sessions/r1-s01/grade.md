# Grade: session r1-s01 (task T70A, Grace)

Grade: VOID
Participant model: opus (claude-opus-5-5; not sonnet)
Steps: 1 (the start command only). Wrong turns: 0. False "done": no.

## Why VOID

The study tool refused to start the session. The participant's only start command,
`real.mjs --start <folder> setup:volunteers.txt` on build 1e123d7d33, printed:

    FAIL: .../design/ui/studio/tier5/rounds/round-1/plan.md holds no "Gate evidence"
    section, so no session of this round may start; run real.mjs --gate
    .../design/ui/studio/tier5/rounds/round-1 until it exits 0

No browser opened, no screenshot was taken and nothing was downloaded, so there is no last
screen to grade against the task's success definition. The run failed before the app was shown;
it says nothing about the app.

The session's files are not in this folder. They were written to
`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s01/` in this worktree, and hold only
`briefing.md` and `transcript.md` (no `session.json`, no `leaks.json`, no `downloads/`).

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the session folder. It reported
"VOID: the participant opened a facilitator file, plan.md (Bash)". The participant's tool calls
show that this is a false match: the participant never read plan.md. It ran a Bash heredoc that
appended the tool's error message to its own `transcript.md`, and that message contains the path
of plan.md. The leak checker scans the command text, so the path in the quoted error looked like
a file read. The participant opened only its own `briefing.md` and `transcript.md`. The grade
is VOID because the run failed, not because of a leak.

## Follow-up answer

The transcript records the follow-up question and the participant's answer. It gives no ease
number because the app never opened. It names the moment it was least sure what to do as the
terminal refusal, which was about a plan file and not about its volunteer list. It has nothing
to say about the drawing.

## Problems

1. Severity 4, behavior (study tool). The round's plan has no "Gate evidence" section, so the
   tool blocks every session in the round from starting. Evidence: step 1 output above. Fix:
   run `real.mjs --gate design/ui/studio/tier5/rounds/round-1` until it exits 0, then re-run
   r1-s01.
2. Severity 2, behavior (study tool). The session wrote its files under `tmp/studio-sessions/...`
   and not under `design/ui/studio/tier5/rounds/round-1/sessions/r1-s01/`, where grading looks
   for them. `--end` never ran, so no `leaks.json` exists.
3. Severity 1, behavior (leak checker). `--leaks` counts a file path inside a heredoc that writes
   to the participant's own transcript as an open of that file. If a real session's transcript
   quotes a tool error, that session would be voided wrongly.

No app build defect can be graded or reproduced from this session.
