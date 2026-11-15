Grade: VOID
False done: no
Wrong turns: 0
Model calls: 0
Failure: none
Trap fired: no (not reached: nothing was ever on screen)
Taken on trust: no (not reached)
Checked: none (not reached)
Scope noticed: no (not reached)
Participant model: claude-opus-5-5 (from the participant's two logs; the transcript names none)
Steps: 0 of the 4 to 9 on the success path

# Session r1-s05: T92 A, Dev, sources left selected

**Why it is void: the run failed, not the reader.** `real.mjs --start` refused the session with exit
1, so no browser opened and the participant never saw the app. The refusal read: `plan.md holds no
"Gate evidence" section, so no session of this round may start; run real.mjs --gate <round folder>
until it exits 0`. The round's `plan.md` still has no `## Gate evidence` heading, and its section
"Open before the first session" says the gate does not pass on this build. Nothing here says
anything about the Assistant or about build 3b2a7f0649.

**What the grade rests on.** There is no last screenshot, `session.log`, `styles.json`, `work.json`
or `downloads/`, because no session existed and `--end` never ran. This folder did not exist until
this grade was written. The only record is the participant's folder,
`tmp/studio-sessions/tier6/rounds/round-1/sessions/r1-s05/` under the worktree, with `briefing.md`
and `transcript.md`.

**Success definition.** Not reached: neither fact was reported. The transcript says "Finished: no.
The app was never seen, so neither fact was found", which is true, so there is no false "done". The
four T92 lines above read `no` or `none` only because nothing was tried. They are not measurements,
and this session must not count toward bar 5 or toward who noticed the selection.

**Follow-up.** The transcript holds an answer to "Someone will check these. Where did each fact come
from, how sure are you of each, and what did you look at to be sure?". The answer is that there are
no facts, no confidence and nothing looked at. The participant's log backs that up: its `--step` for
this question printed `no live session` and exit 2. The tool did not give this follow-up, because
`--end` never ran and no session existed. The words came in the prompt of a second participant agent.

**Leak check.** No `leaks.json` existed, so `real.mjs --leaks` was run on this folder and on the
participant's folder. It wrote no `leaks.json` in either one. It read two participant logs, exited
1, and printed three VOID lines: `plan.md` by full path, the `round-1` folder, and `plan.md` by name,
all as a Write in `agent-a6ac19486aedfc9ce.jsonl`. All three are false. That call wrote the
participant's own `transcript.md`, and the three names appear only because the transcript quotes the
tool's refusal. Across both logs there are eight tool calls, and every one read or wrote
`briefing.md` or `transcript.md` in the participant's folder or ran `tool/real.mjs`, which is
allowed. The grade is void for the failed run, not for a leak.

## Problems

Neither is a problem with the app, so both carry severity 0 for the product. Neither is a build
defect, so there is no repro.

1. **The session could not start** (severity 0, kind behavior; no step, no screenshot). The round
   was launched with its gate unpassed. Re-run as `r1-s05b` from a clean folder once `--gate` exits
   0. `plan.md` also says T92 A's reply has not been seen narrowed to the selection on this build,
   and that if it is not, this session starts from `setup:connected-sources.txt` instead, so that
   has to be settled before the re-run.
2. **The leak check reports a quoted path as an opened file** (severity 0, kind behavior; no step,
   no screenshot). It matches studio paths and facilitator file names anywhere in a tool call's
   input, including the content of a Write to the participant's own folder. Here the verdict did not
   change the grade; on a session that ran, it would void a valid session.
