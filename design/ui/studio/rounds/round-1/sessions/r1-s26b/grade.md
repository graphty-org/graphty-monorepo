# Grade: r1-s26b (T9A, Ruth, Les Miserables)

**Result: VOID -- not gradable. Run it again.**

## What the folder holds

At 17:10 on 2026-10-06 the session folder holds only an empty `session.log`, created at 16:41.
There is no `session.json`, no screenshot, no transcript and no `downloads/` folder. No real.mjs
or browser process for this session is running. The session never reached the app: the tool did
not start a browser for it, so the participant never took a step.

The likely cause is the shared browser gate (`tool/with-browser.sh`, 4 slots): at 16:41 several
other re-run sessions (r1-s04b, r1-s08b, r1-s11b, r1-s16b, r1-s29b, r1-s30b) held or waited for
the slots, and this session ran out its 40-minute limit before it got one. This is the same
pattern the round plan records for the first-pass sessions that "never ran at all".

## Grading

- Task grade: none. Under criteria.md "Tool fault", a session where the tool failed to do what
  was asked is void and re-run; it is counted as void, not as a failure of T9A.
- Steps: 0. Wrong turns: 0. False "done": none (no claim was made).
- Problems found in the app: none -- there is no evidence about the app in this session.
- Build defect repro: not applicable; nothing to reproduce.

## What to do

Re-run T9A with Ruth on Les Miserables in a fresh folder (for example r1-s26c), starting it only
when a browser slot is free, or waiting for the slot in the foreground rather than letting the
session timer run while queued.
