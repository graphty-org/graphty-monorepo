Grade: VOID
False done: no
Wrong turns: 0
Model calls: 0
Failure: none
Participant model: claude-opus-5-5 (from the participant's log; the transcript names none)
Steps: 0 of the 3 or 4 on the success path

# Session r1-s04: T91 B, Maren, yeast genes

**Why it is void: the run failed, not the reader.** `real.mjs --start` refused the session twice,
with exit 1, so no browser opened and the participant never saw the app. The refusal read: `plan.md
holds no "Gate evidence" section, so no session of this round may start; run real.mjs --gate <round
folder> until it exits 0`. The round's `plan.md` has no such section, and its "Open before the first
session" says the gate does not pass on this build. Nothing here says anything about the Assistant
or about build 3b2a7f0649.

**What the grade rests on.** There is no last screenshot, `session.log`, `styles.json`, `work.json`
or `downloads/`, because no session existed and `--end` never copied anything into this folder. This
folder did not exist until this grade was written. The only record is the participant's folder,
`tmp/studio-sessions/tier6/rounds/round-1/sessions/r1-s04/` under the worktree, with `briefing.md`
and `transcript.md`.

**Success definition.** Not reached: no gene was painted, so the 9 genes with `gal4RGexp` below -1
do not look different, and the participant gave no number. Its transcript says "NOT RUN -- the
session never started" and "Finished: no", which is true, so there is no false "done".

**Leak check.** No `leaks.json` existed, so `real.mjs --leaks` was run. It read one participant log
and printed three VOID lines: `plan.md` by full path, the `round-1` folder, and `plan.md` by name,
all as Bash calls. All three are false. The participant made four tool calls: a Read of its own
`briefing.md`, two `real.mjs --start` commands, and a `cat >>` heredoc, in the same Bash call as the
second start, writing its own `transcript.md`. The three names appear only in the tool's refusal,
which the heredoc quotes. The participant said it opened neither `plan.md` nor `--gate`, and the log
agrees. The grade is void for the failed run, not for a leak.

## Problems

Neither is a problem with the app, so both carry severity 0 for the product. Neither is a build
defect, so there is no repro.

1. **The session could not start** (severity 0, kind behavior; no step, no screenshot). The round
   was launched with its gate unpassed. Re-run as `r1-s04b` from a clean folder once `--gate` exits
   0.
2. **The leak check reports a quoted path as an opened file** (severity 0, kind behavior; no step,
   no screenshot). It matches studio paths and facilitator file names anywhere in a Bash command, so
   a participant who writes the tool's own refusal into `transcript.md` is marked as having opened
   `plan.md` and the round folder. Here the verdict did not change the grade; on a session that ran,
   it would void a valid session.
