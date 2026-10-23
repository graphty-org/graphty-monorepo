# Grade: r1-s05 (task T39 A, persona Sam)

Grade: VOID
False done: no
Wrong turns: 0
Steps: 0

Participant model: claude-opus-5-5 (every model line in the participant log says Opus; not Sonnet).
Build: 758b8e8081 (the start command named REAL_DIST=.study-builds/tier3-r1d2-758b8e8081), keyboard (`--keys`).

## Why VOID: the run failed before the app opened

The session never reached the program. Its only files are in
`tmp/studio-sessions/tier3/rounds/round-1/sessions/r1-s05/` (`briefing.md`, `session.log`,
`transcript.md`); there is no screenshot, `session.json`, `styles.json`, `key.json` or download,
and nothing was ever written to this folder.

- The participant ran `real.mjs --start <session> empty --keys`. All four machine-wide browser
  slots were taken, so the command printed `waiting for a free browser slot ...` and ran past the
  shell's 120 s limit, which moved it to the background.
- The participant then armed a watch for the start to finish, wrote the first transcript step
  ("Waited for a free browser slot.") and ended its turn. Ending the turn terminates the agent's
  background commands, so the waiting `--start` was killed: `session.log` holds only
  `Terminated`.
- So no browser was opened, no step was taken and `--end` never ran (hence no `leaks.json`).

The mechanism is the run, not the build: a participant that ends its turn while `--start` is
still queued for a browser slot loses the session. Nothing about T39 A can be judged from it; the
session needs to run again.

## Leak check

`leaks.json` is missing because `--end` never ran. `real.mjs --leaks` on the session read the
participant's log: 7 tool calls, none opened a file outside the session folder, and the briefing
holds no answer-key fact. No leak; the VOID is for the failed run only.

## Problems

| Severity | Kind | Problem | Evidence |
| -------- | ---- | ------- | -------- |
| 4 | behavior | The run produced no session: the queued `--start` was terminated when the participant ended its turn while waiting for a browser slot | `session.log` = `Terminated`; transcript stops at step 1 "Waited for a free browser slot."; no screenshots |
