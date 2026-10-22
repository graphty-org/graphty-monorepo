# Grade: session r5-s37

- Task: T21 (replace friends.csv with friends-v2.csv without losing work, redo the ranking, name
  who was first before and who is first now)
- Persona: Grace (tier 1 graduate)
- Grade: VOID
- False "done" claims: none (the participant said the session never started)
- Wrong turns: 0 (no step was taken in the app)

## Why VOID

The tool refused to start the session, so the app was never used. `real.mjs --start` exited 1
with: "plan.md holds no "Gate evidence" section, so no session of this round may start". The
round-5 `plan.md` still has no "Gate evidence" section (only the sentence describing the rule),
so every session of this round is refused the same way until `real.mjs --gate` is run on the
round and exits 0.

There is nothing to grade: the session folder holds only `transcript.md`, with no screenshot, no
`session.json` and no saved file. The only output was the briefing, written to the scratch
folder `tmp/studio-sessions/.../r5-s37/briefing.md`. This is a run failure, not a result about
the app. The session must be re-run after the round's gate passes, and the re-run is the one
that counts.

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (not about the app) | The round's start gate was never passed, so the tool refused to start the session | transcript.md, "Start": exit 1, "holds no "Gate evidence" section"; round-5/plan.md has no such section |
