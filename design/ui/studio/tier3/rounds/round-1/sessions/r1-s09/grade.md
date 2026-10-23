# Grade: r1-s09 (task T40, half A: Les Miserables, persona Tom, setup `empty`)

Grade: VOID -- the run failed before the study began. No screen was ever shown to the participant.

Participant model: claude-opus-5-5 (from the participant transcript).

## What happened

- The participant read its briefing and ran `real.mjs --start ... empty` on the frozen build
  758b8e8081, as instructed.
- `--start` printed `waiting for a free browser slot ...` and waited: every one of the 4
  machine-wide browser slots was held by other sessions. The wait outlived the 120-second
  foreground command limit, so the command was moved to the background.
- The participant then started a watch for the first screenshot and ended its turn ("The session
  is starting; I am waiting for the first screen."). Ending the turn killed its background
  commands, so `--start` was killed while still queued (its output ends `[killed]`, and
  `session.log` holds only `Terminated`).
- The session folder holds only `briefing.md` and `session.log`: no screenshot, no saved file,
  no downloads. There is no last screenshot to grade.

## Leak check

`real.mjs --leaks` on the session folder: 8 tool calls in 1 participant transcript; none opened a
file outside the session folder, and the briefing holds no answer-key fact. No leak. The VOID is
for the failed run, not a leak.

## Counts

Steps: 0. Wrong turns: 0. False done: no (the participant never claimed done).

## Problems

None in the product: the participant never reached it.

Tool problem (not a product finding): a participant whose `--start` waits for a browser slot
longer than the foreground limit ends its turn and is killed in the queue. The session needs a
rerun (as r1-s09b) once a slot is free, or the start must keep the participant waiting until the
first screenshot exists.
