# Grade: session r5-s52 (task T23, Nadia, tier 1 graduate)

**Grade: VOID** -- the run failed before the session started. Run it again and count the rerun.

## Why

The session never reached the app. Its start command
(`real.mjs --start ... setup:florentine-ranked.txt`, with `REAL_DIST` set to the round 5 build
`.study-builds/tier2-r5-8c015b806/`) exited 1 with:

    FAIL: design/ui/studio/tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate design/ui/studio/tier2/rounds/round-5 until it exits 0

The round's start gate had not been run to a pass, so `real.mjs --start` refuses every session of
the round by design (`plan.md` line 61), and `plan.md` still holds no "Gate evidence" section. No
browser opened and no step was taken. The session folder holds only `transcript.md`: there is no
screenshot and no saved file, so there is no last screen to grade against T23's success definition
(the Florentine families within two steps of the Medici: 11 besides the Medici, with Peruzzi,
Lamberteschi and Bischeri left out). This is a fault in running the study, not something the
participant did, so the grade is VOID. Other round 5 sessions (for example r5-s10 and r5-s11) were
graded VOID for the same refusal.

## Counts

- False "done" claims: 0 (the transcript says plainly that the session could not start)
- Wrong turns: 0 (the participant never acted)
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The round's start gate was never passed, so every round 5 session is refused at start | `transcript.md`, "Start": exit 1 and the FAIL line above; `plan.md` line 61, no "Gate evidence" section |
