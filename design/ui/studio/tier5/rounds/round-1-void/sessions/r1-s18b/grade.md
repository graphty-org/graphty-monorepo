# r1-s18b grade (task T78B, persona Tom, participant model opus)

Grade: VOID -- the run failed before the app was shown.

## Why

- The study tool refused to start the session. `real.mjs --start` on the frozen build
  (tier5-r1d1-1e123d7d33) with `setup:gauges-clean.txt` exited 1 with: "plan.md holds no 'Gate
  evidence' section, so no session of this round may start". At grading time the round's plan.md
  still has no "Gate evidence" section (0 matches), so the round gate (`real.mjs --gate`) has not
  passed for round 1. The same refusal voided r1-s18; this rerun was launched without the gate
  being fixed.
- No screenshot, no step file and no download exist. The only files are the briefing and the
  participant's transcript, in the staging folder
  `.worktrees/design-studio-tier5/tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s18b/`. This
  session folder did not exist until this grade was written, so there is no last screen to grade
  against the T78 B success definition in answers.md (a style layer whose selection is Degree 2 or
  more computed on just the ties with `km` under 3, filled orange, and the count 7 of 11 reported).
- The participant did not claim done (it wrote "Finished: no"), so there is no false "done".
- The follow-up question is in the transcript. The answer declines a rating because the app was
  never shown, and names the tool's refusal as the least-sure moment. That is a consequence of the
  failed run, not a participant problem.
- Participant model: opus (both participant logs record claude-opus-5-5).

## Leak check

There was no leaks.json, so `real.mjs --leaks` was run on the staging folder. It found two
participant logs and printed one VOID line: "the participant opened a facilitator file, plan.md".
That is a false match. The participant's tool calls were: read its own briefing, run `--start`,
write its own transcript.md with a heredoc, list and read its own folder, read its transcript, and
append the follow-up with a second heredoc. The heredoc body quotes the tool's FAIL line, which
names plan.md; the leak checker matches a path anywhere in a command's text. No file outside the
participant's folder was opened. This is not why the session is VOID; the tool failure is.

## Problems

1. Tool/run failure (severity 4, behavior): the round's plan.md lacks the "Gate evidence" section,
   so every round-1 session refuses to start, and this rerun was started without fixing it.
   Evidence: transcript step 0, exit 1; plan.md has no "Gate evidence" heading. Fix: run
   `real.mjs --gate` on round 1 until it exits 0, then rerun this session.
2. Leak checker false positive (severity 2, behavior): `--leaks` flags a file name that appears only
   inside quoted text in a command (a heredoc body), not a file that was opened. Evidence: the
   `cat > transcript.md <<'EOF'` call in agent-a1d37d036acba5c7c.jsonl.
3. Session folder location (severity 1, behavior): the participant was pointed at a staging folder
   under `tmp/studio-sessions/` rather than this folder, so this folder was missing at grading time.

Steps: 0. Wrong turns: 0.
