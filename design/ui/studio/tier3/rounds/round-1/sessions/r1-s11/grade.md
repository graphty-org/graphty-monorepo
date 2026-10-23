# r1-s11 grade: T40, Sam (keyboard only), Les Miserables

Grade: VOID -- the run failed before the participant saw the app.

Participant model: Opus (claude-opus-5-5), per the participant's transcript.

## What happened

- The participant read its briefing and ran `real.mjs --start <folder> empty --keys`. The start
  waited for a free browser slot (all four machine-wide slots were held) and never got one.
- The participant ended its turn while still waiting ("Waiting for the browser slot."). Its
  background start command ended with it: the session folder's `session.log` holds only
  "Terminated", the signal that stopped the waiting start.
- No screenshot was ever taken: the participant's folder
  (`tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s11/`) holds only `briefing.md`,
  `session.log` and a `transcript.md` that stops at the start command. There is no `01.png`, no
  `--end`, so nothing was copied here and no `leaks.json` was written by the tool.

## Leak check

`real.mjs --leaks` on this session: 9 tool calls in 1 participant transcript; none opened a file
outside the session folder, and the briefing holds no answer-key fact. The VOID is for the failed
run, not a leak.

## Scoring

No steps against the success path, no wrong turns, no "done" claim, no problems with the build:
the participant never reached the app. Per the round plan, a session that ends with no `01.png`
is re-run from a clean folder as `r1-s11b`, which takes this row.

The tool problem behind it: a participant whose `--start` is still queued for a browser slot can
end its turn, which kills the queued start; the session then ends with no screenshot instead of
starting late.
