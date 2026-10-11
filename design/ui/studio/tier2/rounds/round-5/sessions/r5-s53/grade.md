# Grade: session r5-s53 (task T4, Dana, regular analyst)

**Grade: VOID** -- the run failed before the session produced anything. Run it again and count the rerun.

## Why

The session left no record. Its folder in the study tree did not exist when this grade was
written, so there is no `transcript.md`, no screenshot and no saved file. Its working folder,
`tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s53/`, holds only `briefing.md`, the
participant's briefing (written 07:14): no `real.mjs` step ever ran in it.

Even had the participant started, the tool would have refused: `plan.md` for round 5 still has no
"Gate evidence" section, and `real.mjs --start` refuses every session of the round until the gate
passes (`plan.md` line 61). The neighboring sessions r5-s51, r5-s52 and r5-s54 were refused with
that exact message.

With no last screen there is nothing to grade against T4's success definition (two tables joined
into one network from an empty start). This is a fault in running the study, not something the
participant did, so the grade is VOID.

## Counts

- False "done" claims: 0 (no transcript, no claim)
- Wrong turns: 0 (the participant never acted)
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The session produced no transcript or screenshot; the run stopped after the briefing was written | Study folder absent; working folder holds only `briefing.md` |
| 0 (run, not app) | The round's start gate was never passed, so every round 5 session is refused at start | `plan.md` has no "Gate evidence" section; r5-s52 `transcript.md` shows the FAIL line |

## What has to happen

Run `real.mjs --gate` on the round 5 folder until it exits 0 and writes "Gate evidence" at the
end of `plan.md`. Then run r5-s53 again from a new, empty folder with the same persona, task,
dataset (office, people.csv + messages.csv) and an empty start.
