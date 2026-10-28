# Grade: r1-s13 (task T47, persona Grace)

Grade: VOID -- the run failed before the participant ever saw the program.

Participant model: claude-opus-5-5 (the participant log records Opus, not Sonnet).

## What happened

- The participant read its briefing and started the session (`real.mjs --start <folder> empty`
  on build 758b8e8081). The tool printed "waiting for a free browser slot ..." and nothing else;
  the command was moved to the background when its 120-second limit ran out.
- The participant set a watch on that output, appended "(the start command is waiting for a free
  browser slot)" to its `transcript.md`, and ended its turn. Ending the turn terminated the
  background start before it got a browser: the folder's `session.log` reads only "Terminated",
  and no screenshot, `session.json`, `work.json`, `styles.json` or download exists.

So there is no last screenshot to grade against T47's success definition: no steps, no wrong
turns, no claim of done (true or false), and no problem with the program can be read from this
session.

## Leak check

No `leaks.json` was written (the session never reached `--end`, so the tool never copied the
folder here; the participant's files are in `tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s13/`).
`node real.mjs --leaks` on that folder read the participant's log: 10 tool calls, the only
project file read was its own `briefing.md` (plus the tool's own background output file),
nothing opened outside the session folder, and the briefing holds no answer-key fact. The VOID
is for the failed run, not for a leak.

## Problem with the run (not the program)

- Mechanism: the session start waits for one of the four machine-wide browser slots; the
  participant ended its turn while it waited, and the end of the participant's turn killed the
  background command. A participant must not end its turn until `--start` has returned its first
  screenshot. Rerun this session under a new id.
