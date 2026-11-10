# r1-s07 grade (task T71A, persona Dana, participant model opus)

Grade: VOID -- the run failed before the app was shown.

## Why

- The study tool refused to start the session. `real.mjs --start` on the frozen build
  (tier5-r1d1-1e123d7d33) exited 1 with: "plan.md holds no 'Gate evidence' section, so no session of
  this round may start". The round gate (`real.mjs --gate`) had not been run for round 1.
- No screenshot, no step file and no download exist. The only files are the briefing and the
  participant's transcript, staged in
  `.worktrees/design-studio-tier5/tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s07/`. Nothing
  was ever written to this folder, so there is no last screen to grade against the T71A success
  definition in answers.md.
- The participant did not claim done (it wrote "Finished: no"), so there is no false "done".
- The follow-up question is in the transcript, but the answer gives no rating because the app was
  never shown. That is a consequence of the failed run, not a participant problem.

## Leak check

There was no leaks.json, so `real.mjs --leaks` was run on this folder. It found the two participant
transcripts and reported "the participant opened a facilitator file, plan.md" in both. Both are
false matches: the participant never opened plan.md. One command wrote the transcript with a
heredoc that quotes the tool's error line (which names plan.md); the other ran `cat transcript.md`
on that same file. The leak checker matches the file name anywhere in a command's text, including
quoted output. This is not why the session is VOID; the tool failure is.

## Problems

1. Tool/run failure (severity 4, behavior): the round's plan.md lacks the "Gate evidence" section, so
   every round-1 session refuses to start. Fix: run `real.mjs --gate` on round 1 until it exits 0,
   then rerun r1-s07 with `setup:volunteers.txt`.
2. Leak checker false positive (severity 2, behavior): `--leaks` flags a facilitator file name that
   appears only inside quoted text in a command (a heredoc body, or a file being printed), not a
   file that was opened.
3. Session folder location (severity 1, behavior): the participant was pointed at a staging folder
   under `tmp/studio-sessions/` rather than this folder, so this folder was empty at grading time.

Steps: 0. Wrong turns: 0.
