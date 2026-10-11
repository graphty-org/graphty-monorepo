# Grade: session r5-s02b -- Ruth (tier 1 graduate), Les Miserables (T22 B), ties of 10 or more shared chapters

**Grade: VOID** (the run failed after the start; re-run and count it)

## Why

The session started correctly and then nobody acted in it. `real.mjs --start` ran the
`lesmis-ranked.txt` setup at 09:58 and took the start screenshot (`01.png`), but no `--step` ever
reached the session: the folder holds only `01.png`, there is no transcript, no `--end` and no
`work.json`. After 15 minutes with no step the session server closed itself; `session.log` reads:

    No step for 900 seconds; closing the session

So the participant agent stopped (or was never handed the session) before its first step. The
sessions started beside it in the same minute ran to the end (r5-s01b ended at 09:59 with 4
screenshots, r5-s03b with 21), so the build, the browser cap and the tool were working; the fault
is in the participant's run, not in the app. With no step taken there is no end state to grade
against T22 B's success definition (13 ties marked, all 77 characters drawn, the count read), and
the start screen alone is not an attempt. This is a run failure, so the grade is VOID and the
session must be re-run under a new id.

## What the start record shows

- Build `8c015b806086 graphty@0.8.65` (`session.json`), the frozen build named at the top of the
  criteria, at 1440 x 900. Tool commit `a5de4b445f59`, recorded with uncommitted changes in the
  tool's checkout.
- `01.png`: Les Miserables open, PageRank run (row 77), nodes sized and colored by PageRank, the
  PageRank layer's Style tab in the inspector, Selection row empty. This is the expected start for
  T22 B; the setup did not fail (`setup.log` is empty).
- `work-start.json`: one run (PageRank, labeled Influence), three layers, no notes, no filter steps,
  one source.

## Counts

- False "done" claims: 0 (the participant never acted)
- Wrong turns: 0
- Steps: 0 after the start
- Problems found in the app: none (nothing was observed)

## Problems

| Severity | Problem | Evidence |
|---|---|---|
| 0 (run, not app) | The participant never took a step; the session server timed out after 900 seconds idle, leaving no transcript and no end state | `session.log` ("No step for 900 seconds; closing the session"); only `01.png` in the folder; no `transcript.md`, no `work.json` |
