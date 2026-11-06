# r1-s28b grade (task T79 B, persona Tom, participant model opus)

Grade: VOID -- the study tool refused to start the session, so the app was never shown.

## Why

- `real.mjs --start` on the frozen build (tier5-r1d1-1e123d7d33) with `setup:sensors-50k.txt`
  exited 1 with: "plan.md holds no 'Gate evidence' section, so no session of this round may start;
  run real.mjs --gate .../tier5/rounds/round-1 until it exits 0". At grading time the round's
  plan.md still has no "Gate evidence" section (0 matches).
- No screenshot, step file, download or leaks.json exists. The participant's only files are
  `briefing.md` and `transcript.md` in the staging folder
  `.worktrees/design-studio-tier5/tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s28b/`; this
  session folder did not exist until this grade. There is no last screen to hold against T79 B's
  success definition in answers.md (a style layer whose selection is basin Otter Creek, filled
  orange, with the count 1,050 of 50,000 reported).
- No false "done": the participant wrote "Finished: no". truth_on_screen does not apply.
- The follow-up question is in the transcript. The answer gives no number because the app never
  opened, and names the tool's start refusal as the only screen. That follows from the failed run,
  not from the participant.
- Participant model: opus (both participant logs record claude-opus-5-5).

## Leak check

leaks.json was missing (no `--end` ran), so `real.mjs --leaks` was run on the staging folder. It
found two participant logs and reported VOID four times, for "plan.md" and the round-1 folder (Bash
in agent-a509341e3d8623041, Write in agent-af9ac57c25c17146a). All four are false matches: the
participant's tool calls were reading its own briefing.md and transcript.md, the `--start` and
`--step` commands, a Write of its own transcript.md and a heredoc appending to it. Both of those
bodies quote the tool's error line, which names plan.md and the round folder. No file outside the
participant's own folder was opened. The session is VOID for the tool failure, not for a leak.

## Problems

1. Tool/run failure (severity 4, behavior): the round's plan.md lacks the "Gate evidence" section,
   so every round-1 session refuses to start, and this rerun was started without the gate passing.
   Evidence: transcript step 0, start refused (exit 1); `--step` afterwards returned "No live
   session" (exit 2); plan.md has no "Gate evidence" heading. Fix: run `real.mjs --gate` on round 1
   until it exits 0, then rerun this session.
2. Leak checker false positive (severity 2, behavior): `--leaks` flags a path that appears only in
   the text of a file the participant wrote (a Write body or a heredoc), not a file it opened.
   Evidence: the Write of transcript.md in agent-af9ac57c25c17146a.jsonl and the
   `cat >> .../transcript.md <<'EOF'` call in agent-a509341e3d8623041.jsonl.
3. Session folder location (severity 1, behavior): the participant was pointed at a staging folder
   under `tmp/studio-sessions/` rather than this folder, so this folder was missing at grading time.

Steps: 0. Wrong turns: 0.
