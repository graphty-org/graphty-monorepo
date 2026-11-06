# r1-s30b grade (task T71 A, persona Sam, participant model opus)

Grade: VOID -- the study tool refused to start the session, so the app was never shown.

## Why

- `real.mjs --start` on the frozen build (tier5-r1d1-1e123d7d33) with `setup:volunteers.txt --keys`
  exited 1 with: "plan.md holds no 'Gate evidence' section, so no session of this round may start;
  run real.mjs --gate .../tier5/rounds/round-1 until it exits 0". At grading time the round's
  plan.md still has no "Gate evidence" section (0 matches). This is the same refusal that voided
  the other round-1 reruns.
- No screenshot, step file, download or leaks.json exists. The participant's only files are
  `briefing.md` and `transcript.md` in the staging folder
  `.worktrees/design-studio-tier5/tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s30b/`; this
  session folder did not exist until this grade. There is no last screen to hold against T71 A's
  success definition in answers.md (one filter card with an Or group: role board, or hours 30 or
  more -- 10 of 24 -- with the count reported).
- No false "done": the participant wrote "Did I finish: No". truth_on_screen does not apply.
- The follow-up question is in the transcript. The answer gives no number because the app never
  opened, and names the tool's start refusal as the least-sure moment. That follows from the
  failed run, not from the participant.
- Participant model: opus (both participant logs record claude-opus-5-5).

## Leak check

leaks.json was missing (no `--end` ran, since no session started), so `real.mjs --leaks` was run on
the staging folder. It found two participant logs and reported VOID for opening "plan.md" and the
round-1 folder (Bash, agent-ab0ca9fdd6b74c43a). Those are false matches: that log's Bash calls are
the `--start` command and a heredoc writing the participant's own transcript.md whose body quotes
the tool's error line, which names plan.md and the round folder. The other log only read its own
briefing.md and transcript.md and ran `--step`. No file outside the participant's own folder was
opened. The session is VOID for the tool failure, not for a leak.

## Problems

1. Tool/run failure (severity 4, behavior): the round's plan.md lacks the "Gate evidence" section,
   so every round-1 session refuses to start, and this rerun was started without the gate passing.
   Evidence: transcript step 0, start refused; plan.md has no "Gate evidence" heading. Fix: run
   `real.mjs --gate` on round 1 until it exits 0, then rerun this session.
2. Leak checker false positive (severity 2, behavior): `--leaks` flags paths that appear only inside
   quoted text of a command (a heredoc body), not files that were opened. Evidence: the
   `cat > $S/transcript.md <<'EOF'` call in agent-ab0ca9fdd6b74c43a.jsonl.
3. Session folder location (severity 1, behavior): the participant was pointed at a staging folder
   under `tmp/studio-sessions/` rather than this folder, so this folder was missing at grading time.

Steps: 0. Wrong turns: 0.
