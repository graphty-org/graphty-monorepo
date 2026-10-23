# Grade: session r4-s20 -- Elena (tier 1 graduate, returning), Florentine families (T18), shortest chain from the Strozzi to the Pazzi

**Grade: VOID** (the run failed before the participant saw the app). The session never got a
browser, so there is no screenshot, no saved file and no answer to grade.

What exists, in the session's working folder
(`tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s20/` of the studio worktree):

- `briefing.md`, the participant's briefing.
- `transcript.md` (copied here), which stops after the start command with "Waited for a free
  browser slot (all four machine-wide browsers busy)."
- `session.log`, empty.

There is no `session.json`, no `setup.log`, no `work.json`, no `leaks.json` and no numbered
screenshot: the start step (`tool/real.mjs --start ... setup:florentine-ranked.txt`) never ran
past the browser queue, and no process for this session is still running. The participant's
agent ended while waiting for a slot, before the app loaded, so nothing about the app or the
build is shown by this session. No false "done" claim, no wrong turn and no app problem can be
recorded.

Mechanism: the session's agent stopped while queued for one of the four machine-wide browser
slots and was not resumed; the start step therefore produced no build stamp and no first
screenshot. That is a fault of the run, not of the app.

Per the criteria (a tool fault voids the session, which is re-run and counted), this session is
re-run with the same task, persona and start.
