# r1-s25b grade (task T77 A, persona Grace, participant model opus)

Grade: VOID -- the study tool refused to start the session, so the app was never shown.

## Why

- `real.mjs --start` on the frozen build (tier5-r1d1-1e123d7d33) with `setup:volunteers-thanks.txt`
  exited with: "plan.md holds no 'Gate evidence' section, so no session of this round may start;
  run real.mjs --gate .../tier5/rounds/round-1 until it exits 0". At grading time the round's
  plan.md still has no "Gate evidence" section (0 matches). This is the same refusal that voided
  the other round-1 reruns.
- No screenshot, step file, download or leaks.json exists. The participant's only files are
  `briefing.md` and `transcript.md` in the staging folder
  `.worktrees/design-studio-tier5/tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s25b/`; this
  session folder did not exist until this grade. There is no last screen to hold against T77 A's
  success definition in answers.md (the existing filter card edited to hours 20 or more and an Or
  group of hours 30 or more added to the Staff layer -- 10 of 24 in the picture, 6 in orange --
  with both counts reported).
- No false "done": the participant wrote "Finished: no". truth_on_screen does not apply.
- The follow-up question is in the transcript. The answer gives no number because the app never
  opened, and names the tool's refusal at start as the least-sure moment. That follows from the
  failed run, not from the participant.
- Participant model: opus (both participant logs record claude-opus-5-5).

## Leak check

leaks.json was missing (no `--end` ran), so `real.mjs --leaks` was run on the staging folder. It
found two participant logs and reported VOID for opening "plan.md" (Bash, agent-a2cf3114964e3f7fb).
That is a false match: the participant's tool calls were reading its own briefing.md and
transcript.md, the `--start` command, and heredocs writing its own transcript.md whose body quotes
the tool's error line, which names plan.md. No file outside the participant's own folder was
opened. The session is VOID for the tool failure, not for a leak.

## Problems

1. Tool/run failure (severity 4, behavior): the round's plan.md lacks the "Gate evidence" section,
   so every round-1 session refuses to start, and this rerun was started without the gate passing.
   Evidence: transcript step 0, start refused; plan.md has no "Gate evidence" heading. Fix: run
   `real.mjs --gate` on round 1 until it exits 0, then rerun this session.
2. Leak checker false positive (severity 2, behavior): `--leaks` flags a file name that appears only
   inside quoted text of a command (a heredoc body), not a file that was opened. Evidence: the
   `cat > $S/transcript.md <<'EOF'` call in agent-a2cf3114964e3f7fb.jsonl.
3. Session folder location (severity 1, behavior): the participant was pointed at a staging folder
   under `tmp/studio-sessions/` rather than this folder, so this folder was missing at grading time.

Steps: 0. Wrong turns: 0.
