# Grade: r1-s34b (T5 "A file that will not read", Tom)

**Result: VOID -- not gradable. Run it again.**

## What the folder holds

At 17:40 on 2026-10-06 the session folder holds only an empty `session.log`, created at 17:25.
There is no `session.json`, no screenshot, no transcript and no `downloads/` folder. No real.mjs
or browser process for this session is running. The session never reached the app: the tool did
not start a browser for it, so the participant never took a step.

The likely cause is the shared browser gate (`tool/with-browser.sh`, 4 slots). Between 17:20 and
17:40 more than a dozen other re-run sessions and grader repros (r1-s04b, r1-s07b, r1-s08b,
r1-s09b, r1-s15b, r1-s27b, r1-s29b, r1-s31b, r1-s35b to r1-s37b, a repro for r1-s10b) held or
waited for the four slots, and this session ended before it got one. The earlier attempt of the
same session, r1-s34, left the same empty folder (log created 15:25).

## Grading

- Task grade: none. Under criteria.md "Tool fault", a session where the tool failed to do what
  was asked is void and re-run; it is counted as void, not as a failure of T5.
- Steps: 0. Wrong turns: 0. False "done": none (no claim was made).
- Problems found in the app: none -- there is no evidence about the app in this session.
- Build defect repro: not applicable; nothing to reproduce.

## What to do

Re-run T5 with Tom in a fresh folder (for example r1-s34c), starting it only when a browser slot
is free, or waiting for the slot in the foreground rather than letting the session timer run
while queued. This is the second void attempt for this session, so the queueing problem itself
should be fixed before a third.
