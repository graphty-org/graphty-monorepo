# Grade: session r4-s28 -- Nadia (tier 1 graduate), Les Miserables (T17 B)

**Grade: VOID** (the run failed; nothing of the app was seen).

The participant never took a step. Its screenshot folder,
`tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s28/` in the studio worktree, holds only
`briefing.md` (written 03:20:13 on 2026-10-11) and an empty `session.log` (created 03:20:24, 0
bytes). There is no `session.json`, no screenshot, no download, and no `transcript.md` in this
folder. No `real.mjs` process for this session was running afterwards, while the sessions started
beside it (r4-s27, r4-s29, r4-s30) had their own `real.mjs` processes and, for r4-s27, screenshots
and a transcript. So `real.mjs --start` was never called for this session: the participant agent
ended before its first command, which is a fault of the run, not of the app or the build.

Under the criteria ("API errors": a session that ends on a model failure is a tool fault, voided
and run again), this session is voided and must be re-run from a new, empty folder with the same
persona (Nadia), task half (T17 B, Les Miserables) and start (`setup:lesmis-ranked.txt`) on the
frozen build named at the top of `../../../../criteria.md`. It is not scored on any bar.

- False "done" claims: none (no claims were made).
- Wrong turns: none recorded (no steps were taken).
- Problems: none attributable to the app.
