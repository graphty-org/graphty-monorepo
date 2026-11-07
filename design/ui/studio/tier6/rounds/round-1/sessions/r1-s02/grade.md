Grade: VOID
False done: no
Wrong turns: 0
Model calls: 0
Failure: none
Disclosure: 0 of 3 (not reached: the program showed nothing)
Participant model: claude-opus-5-5 (from the participant's two logs; the transcript names none)
Steps: 0 of the roughly 15 on the success path

# Session r1-s02: T90 B, Sam, sources, keyboard only

**Why it is void: the run failed, not the reader.** `real.mjs --start` refused the session, so no
browser opened and the participant never saw the app. The refusal read: `plan.md holds no "Gate
evidence" section, so no session of this round may start; run real.mjs --gate <round folder> until
it exits 0`. The round's `plan.md` still has no `## Gate evidence` heading. Nothing here says
anything about the Assistant or about build 3b2a7f0649.

**What the grade rests on.** There is no last screenshot, `session.log`, `styles.json`, `work.json`
or `downloads/`, because no session existed and `--end` never copied anything into this folder. The
only record is the participant's folder:
`tmp/studio-sessions/tier6/rounds/round-1/sessions/r1-s02/` under the worktree, with `briefing.md`
and `transcript.md`.

**Success definition.** Not reached: no file was opened, no key entered, no reply received and no
names reported. The transcript says "Finished: no, the session could not start", so the participant
made no false "done".

**Follow-up.** The transcript holds an answer to the follow-up, so that record is not missing, but
it carries no evidence. On what leaves, where it goes and who pays, Sam says "I do not know"; on the
first key, "I never entered it". His "no" on loading the real list is stated as his own judgment,
"not something the program told me". An answer counts only when it was on screen first, so
`Disclosure` is 0 and `Failure read` does not apply. The round's question on whether readers
understand what is sent to the provider gets nothing from this session.

**Leak check.** No `leaks.json` existed, so `real.mjs --leaks` was run on the participant's folder.
It read two participant logs and exited 1 with one line: `VOID: the participant opened a facilitator
file, plan.md (Bash, agent-aa60b7f83920385d4.jsonl)`. That line is false. The matching call is a
`cat >>` heredoc writing the transcript, and `plan.md` appears only in the tool's refusal, which the
participant quoted. The two logs show only reads of its own `briefing.md` and `transcript.md`, and
runs of `tool/real.mjs` with `--start` and `--step`. The grade is void for the failed run, not for a
leak.

## Problems

Neither is a problem with the app, so both carry severity 0 for the product. Neither is a build
defect: the build was never reached, so there is no repro.

1. **The session could not start** (severity 0, kind behavior; step 0, no screenshot). The round was
   launched with its gate unpassed. Re-run as `r1-s02b` from a clean folder once `--gate` exits 0.
   Until then T90 B counts for no bar, including the keyboard bar and the state list rows only T90
   reaches.
2. **The leak check reports a quoted file name as an opened file** (severity 0, kind behavior; step
   0, no screenshot). It matches facilitator file names anywhere in a Bash command, so a participant
   who writes the tool's own refusal into `transcript.md` is marked as having opened `plan.md`. Here
   the verdict did not change the grade; on a session that ran, it would void a valid session.
