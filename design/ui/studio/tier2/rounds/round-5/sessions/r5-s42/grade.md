# Grade: session r5-s42

Task T21 (replace friends.csv with friends-v2.csv, rerun the ranking, report who was first before
and now). Persona: Ruth (tier 1 graduate).

## Grade: VOID

The run failed before the app was shown. `real.mjs --start` exited 1 with:

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no
    session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5
    until it exits 0

The round's `plan.md` has no "Gate evidence" section (the phrase appears only in the text that
describes the gate), so the tool refused every session of this round. No browser was opened, no
screenshot was taken and no file was saved: the session folder holds only `transcript.md`, and the
session's tmp folder holds only `briefing.md`. Nothing about the app was observed, so there is
nothing to grade against the T21 success definition.

## Counts

- False "done" claims: 0 (the participant said the session never started).
- Wrong turns: 0 (no step in the app was taken).

## Problems

None in the app. Run problem only: the round's start gate has not been run, so `--start` refuses.
Fix: run `real.mjs --gate` on round 5 until it exits 0, then re-run this session; the re-run is the
one that counts.
