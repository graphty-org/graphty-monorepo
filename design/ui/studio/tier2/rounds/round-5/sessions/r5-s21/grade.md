# Grade: session r5-s21

- Task: T18 (the chain from Chloe to Milo with the fewest people in between)
- Persona: Grace (tier 1 graduate, nonprofit operations analyst)
- Grade: VOID (the run failed; the session never started)
- False "done" claims: none (the participant reported "Finished: no")
- Wrong turns: 0 (the participant never saw the app)

## Why the session is void

`real.mjs --start` exited 1 before opening a browser:

    FAIL: .../tier2/rounds/round-5/plan.md holds no "Gate evidence" section,
    so no session of this round may start; run real.mjs --gate .../tier2/rounds/round-5
    until it exits 0

The round's start check had not been run, so the tool refuses every session of the round. The
round plan (`../../plan.md`, line 61) still has no "Gate evidence" section, so the cause has not
been fixed. The session folder holds only `transcript.md`, and the tool's session folder
(`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s21`) was never created. There are no
screenshots, downloads or ratings to grade.

This is a fault in how the run was set up, not something the app did. Run the round's gate until
it exits 0, then run the session again from a new, empty folder and count that run in its place.

## Problems found

None. The participant never reached the app, so nothing about the build can be judged from this
session.
