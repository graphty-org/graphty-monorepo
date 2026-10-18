# r5-s18 -- T18, Nadia (tier 1 graduate), data set B (Florentine families)

**Grade: VOID** -- the run failed, not the participant.

## Why

The session left nothing to grade. When grading began, this session folder did not exist: no
`session.json`, no transcript, no screenshots and no saved files. The session is listed in
`../../sessions.json` and `../../table.md` (start `setup:florentine-ranked.txt`), so it was
planned, but no `real.mjs` step ever wrote to its folder, and no copy of its output was found
elsewhere in the worktree. The neighboring sessions of the round (r5-s17, r5-s19) did write
their folders, so the tool itself was working; this one session's run did not start or did not
survive to its first step.

Per `../../../../criteria.md` ("Grades"), a tool or run fault voids the session, which is re-run
and counted. Nothing about the build or the task can be concluded from it.

## Counts

- False "done" claims: none recorded (no transcript).
- Wrong turns: none recorded (no transcript).
- Problems: none against the build. The run failure is recorded below for the studio.

| Problem | Severity | Evidence |
| --- | --- | --- |
| The session produced no output: its folder was missing at grading time | 0 (run fault, not a usability problem) | `ls` of `rounds/round-5/sessions/` lists r5-s17 and r5-s19 but no r5-s18 |

## Next step

Re-run r5-s18 on the frozen build named at the top of `../../../../criteria.md`, then grade it.
