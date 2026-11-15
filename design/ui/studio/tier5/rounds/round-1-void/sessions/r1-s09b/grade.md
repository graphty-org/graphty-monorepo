# Grade: session r1-s09b (task T73A, Grace, returning)

Grade: VOID
Participant model: opus (claude-opus-5-5, from both of the participant's logs; not sonnet)
Steps: 0 in the app (two start attempts, both refused). Wrong turns: 0. False "done": no (the
participant wrote "Did I finish: no").

## Why VOID

The study tool refused to start the session. Both start commands,
`real.mjs --start <folder> setup:volunteers.txt` on build 1e123d7d33, exited 1 with:

    FAIL: .../design/ui/studio/tier5/rounds/round-1/plan.md holds no "Gate evidence"
    section, so no session of this round may start; run real.mjs --gate
    .../design/ui/studio/tier5/rounds/round-1 until it exits 0

The round's plan.md still has no "Gate evidence" section. No browser opened, no screenshot was
taken and nothing was downloaded, so there is no last screen to check against T73 A's success
definition in answers.md (find James Carter, id `v02`). The run failed before the app was shown;
it says nothing about the app. This is the same refusal that voided r1-s09: the rerun was started
before the round's gate was passed.

The session's files are not in this folder. They were written to
`tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s09b/` in this worktree and hold only
`briefing.md` and `transcript.md` (no `session.json`, no step screenshots, no `downloads/`, no
`leaks.json`).

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the session folder. It printed three
VOID lines, all from one Bash call: "opened a studio file .../round-1/plan.md", "opened a studio
file .../round-1" and "opened a facilitator file, plan.md". The participant's tool calls show
these are false matches: it read its own `briefing.md` and `transcript.md`, ran `real.mjs --start`
twice and `--step` once, and wrote its own `transcript.md` with heredocs. The flagged call is the
heredoc that copies the tool's FAIL message, which names plan.md and the round folder, into the
transcript. The participant never opened a file outside its own folder. The grade is VOID because
the run failed, not because of a leak.

## Follow-up answer

The transcript holds the follow-up question and the participant's answer. It gives no ease number
because the app never opened, and names the start refusal as the least-sure moment, with nothing
on the screen.

## Problems

1. Severity 4, behavior (study tool). The round's plan has no "Gate evidence" section, so the
   tool blocks every session in the round, reruns included. Evidence: step 0 output above.
   Fix: run `real.mjs --gate design/ui/studio/tier5/rounds/round-1` until it exits 0, then rerun.
2. Severity 2, behavior (study tool). The session wrote its files under `tmp/studio-sessions/...`
   and not under `design/ui/studio/tier5/rounds/round-1/sessions/r1-s09b/`, where grading looks
   for them; `--end` never ran, so no `leaks.json` exists.
3. Severity 1, behavior (leak checker). `--leaks` counts a path inside a heredoc that writes the
   participant's own transcript as an open of that file, so any session whose transcript quotes a
   tool error naming a studio file is voided wrongly.
