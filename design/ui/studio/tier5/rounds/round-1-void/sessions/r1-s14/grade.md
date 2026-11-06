# Grade: r1-s14 (task T74 B, persona Maren)

**Grade: VOID** -- the run failed before the app was shown.

- Participant model: opus (claude-opus-5-5, from the participant log); not sonnet.
- Build: 1e123d7d33 (`.study-builds/tier5-r1d1-1e123d7d33`), the frozen build criteria.md names.
- Steps: 0. Wrong turns: 0. False "done": no (the participant reported it never started).
- Truth on screen: no screen existed; no screenshot, no `session.json`, no downloads.

## Why VOID

`real.mjs --start ... setup:gauges-clean.txt` exited 1 with:

    FAIL: .../tier5/rounds/round-1/plan.md holds no "Gate evidence" section, so no session of this
    round may start; run real.mjs --gate .../tier5/rounds/round-1 until it exits 0

The round's start gate had not been run, so the tool refused every start. The participant tried
twice, then a `--step` that answered "no running session", and stopped. Nothing of the app was
seen, so neither the success definition in answers.md nor the criteria bars can be scored. The
session folder was never copied back to the round (no `--end` ran on a started session), so this
grade sits in a folder the tool did not create.

## Leak check

`leaks.json` was missing, so `real.mjs --leaks` was run on the participant folder. It reports
"VOID: the participant opened a facilitator file, plan.md (Bash, agent-a1cf799b0e6bbbcda.jsonl)".
That is a false positive: the participant's tool calls were a Read of its own `briefing.md`, two
`--start` commands, two `--step` commands and heredoc writes of its own `transcript.md`. The word
`plan.md` appears only inside the tool's own refusal message, which the participant quoted into
its transcript. No file outside its folder was opened. The grade is VOID for the tool refusal,
not for a leak.

## Follow-up answer

Present in the transcript, but without a number: the participant declined to rate because the
program never opened. Not a usable calm rating.

## Problems

| # | Severity | Kind | What | Evidence |
|---|----------|------|------|----------|
| 1 | 4 | behavior | The study tool refused `--start` because the round plan has no "Gate evidence" section; no session ran | transcript.md step 0, exit 1 |
| 2 | 1 | behavior | The leak check flags a path quoted from the tool's own error message as an opened facilitator file | `real.mjs --leaks` output on the participant folder |
| 3 | 1 | behavior | The follow-up holds no calm number (nothing was used) | transcript.md, Follow-up |

## Next

Run `real.mjs --gate design/ui/studio/tier5/rounds/round-1` until it exits 0, then re-run r1-s14
(T74 B, Maren, `setup:gauges-clean.txt`) with a fresh participant folder.
