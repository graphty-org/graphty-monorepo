# Grade: session r5-s12 (task T17, Alex, regular analyst)

**Grade: VOID** -- the session produced no record of any kind. Run it again and count the rerun.

## Why

T17 on dataset B (Les Miserables, start `setup:lesmis-ranked.txt`) is graded from the last
screenshot and any saved files. This session has none:

- The round's session folder `sessions/r5-s12/` did not exist before this grade was written: no
  `transcript.md`, no screenshots, no `saved/` or `downloads/`.
- The tool's own session folder, `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s12/`,
  holds only `briefing.md` (written 07:09 by `real.mjs --brief`). No step was recorded, so no
  browser ever opened for this session and `--end` never copied anything back.
- Even had the participant tried to start, `real.mjs --start` would have refused it: the round's
  `plan.md` still has no "Gate evidence" section (see its line 61), the same refusal that voided
  r5-s01, r5-s02, r5-s04, r5-s06 to r5-s09 and r5-s11.

With no last screen there is nothing to grade against T17's success definition. The failure is in
running the study (the participant run ended with no transcript, and the round's start gate was
never passed), not in anything the participant or the app did, so the grade is VOID.

## Counts

- False "done" claims: 0 (no transcript, no claims)
- Wrong turns: 0 (the participant never acted)
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (study, not app) | The session left no transcript and no screenshots; only the briefing exists | `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s12/` holds only `briefing.md` |
| 0 (study, not app) | The round's start gate has not passed, so every round 5 session start is refused | `rounds/round-5/plan.md` has no "Gate evidence" section |

## To rerun

Run `real.mjs --gate design/ui/studio/tier2/rounds/round-5` until it exits 0, then run r5-s12
again from its briefing and grade the rerun.
