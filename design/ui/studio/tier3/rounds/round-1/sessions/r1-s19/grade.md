# Grade: r1-s19 (task T48, persona Sam)

Grade: VOID -- the run failed before the participant ever saw the program.

Participant model: claude-opus-5-5 (the participant log records Opus, not Sonnet).

## What happened

- The participant read its briefing and started the session (`real.mjs --start <folder> empty
  --keys`). The tool printed "waiting for a free browser slot ..." and nothing else; the command
  was moved to the background when the 120-second tool limit ran out.
- The participant set a background watch for the first screenshot, checked the output a few more
  times (still waiting for a slot), and ended its turn. Ending the turn terminated the background
  start before it got a browser. The session folder's `session.log` holds only "Terminated", and no
  screenshot, `transcript.md`, `session.json`, `work.json` or download exists.

So there is no last screenshot to grade against T48's success definition: no steps, no wrong
turns, no claim of done (true or false), and no problem with the program can be read from this
session.

## Leak check

No `leaks.json` was written (the session never reached `--end`, so the tool never copied the
folder here; the participant's files are in `tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s19/`).
`node real.mjs --leaks <that folder>` found the participant's log and read 13 tool calls: the only
file read was its own `briefing.md`, nothing was opened outside the session folder, and the
briefing holds no answer-key fact. The VOID is for the failed run, not for a leak.

## Problem with the run (not the program)

- Mechanism: the session start waits for one of the four machine-wide browser slots; the
  participant ended its turn while it waited, and the end of the participant's turn killed the
  background command. A participant must not end its turn until `--start` has returned its first
  screenshot. Rerun this session under a new id.
