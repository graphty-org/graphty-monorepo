# Grade: session r5-s23 (task T18, Elena, tier 1 graduate)

**Grade: VOID** -- the tool refused to start the session, so the app was never opened.

## Why it is void

The first command, `real.mjs --start ... setup:friends-ranked.txt` on the frozen build
`tier2-r5-8c015b806`, exited with:

    FAIL: .../tier2/rounds/round-5/plan.md holds no "Gate evidence" section, so no session of
    this round may start; run real.mjs --gate .../tier2/rounds/round-5 until it exits 0

The round's start gate had not passed: `rounds/round-5/plan.md` mentions the gate but has no
"Gate evidence" section. The participant took no further step, and that was correct, because
running the gate is facilitator work. No browser was opened. No screenshot, `session.json`,
download or work-list snapshot exists. The session folder holds only `transcript.md`, and no
session folder was created under `tmp/studio-sessions/`.

This is a fault in the run setup, not in the app. Nothing about the app was observed, so
nothing can be scored. Run the round gate (`real.mjs --gate rounds/round-5`) until it exits 0,
then re-run the session from a new, empty folder with the same persona and prompt. The re-run
is the one that counts.

## Claims and path

- False "done" claims: none. The participant reported "Finished: no".
- Wrong turns: 0. The participant made no study steps.

## Problems

| Severity | Kind | Problem | Evidence |
| -------- | ---- | ------- | -------- |
| 0 | tool | The session never started because the round-5 start gate had not run. This is a setup fault, not an app finding | `transcript.md`, Step 0 output |

No bar is scored for this session.
