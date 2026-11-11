Grade: VOID
False done: no
Wrong turns: 0
Model calls: 0
Failure: none
Trap fired: no
Taken on trust: no
Participant model: claude-opus-5-5 (from the participant's logs; the transcript names none)
Steps: 0 of the 3 on the success path

# Session r1-s11: T95 A, Grace, volunteers

**Why it is void: the run failed, not the reader.** `real.mjs --start` exited before any browser
opened, both times the participant ran it. The refusal read: `plan.md holds no "Gate evidence"
section, so no session of this round may start; run real.mjs --gate <round folder> until it exits
0`. The round's `plan.md` still has no `## Gate evidence` heading. Nothing here says anything about
the Assistant or about build 3b2a7f0649.

**What the grade rests on.** There is no last screenshot, `session.log`, `styles.json`,
`styles-steps.jsonl`, `work.json` or `downloads/`, because no session existed and `--end` never
ran. This folder did not exist until this grade was written. The only record is the participant's
folder, `tmp/studio-sessions/tier6/rounds/round-1/sessions/r1-s11/` under the worktree, with
`briefing.md` and `transcript.md`.

**Success definition.** Not reached: Grace never saw the volunteers file, asked the AI nothing and
has no list for her director. The transcript says "Session did not run", which is true, so there is
no false "done". `Failure: none`, `Trap fired: no` and `Taken on trust: no` record that no message
was sent and no claim was on screen. They are not measurements, and this session must not count
toward any bar, bar 5 and the round's question 3 included.

**Leak check.** No `leaks.json` existed, so `real.mjs --leaks` was run, on this folder and on the
participant's folder. Each wrote no `leaks.json`, read two participant logs, exited 1 and printed
one line: `VOID: the participant opened a facilitator file, plan.md (Bash,
agent-afa6a5e2d462c19f7.jsonl)`. That line is false. That log has four tool calls: a read of the
participant's own `briefing.md`, the two `--start` commands, and a heredoc appending to its own
`transcript.md`. Only the heredoc contains `plan.md`, because the transcript quotes the tool's
refusal. The other log, `agent-a8066c18f6a3a5830.jsonl`, is the follow-up: reads of the same
`briefing.md` and `transcript.md`, one `--step` that answered "no live session" (exit 2), and a
heredoc appending to `transcript.md`. Neither opened a file outside its own folder. The grade is
void for the failed run, not for a leak.

**The follow-up.** The transcript holds a reply to "How far can she rely on that, and what makes
you say so?", and the reply is that there is no "that": no list exists, so she can rely on nothing,
and it should not count as participant data. That is true, and it is no answer about any reply of
the Assistant.

## Problems

None is a problem with the app, so all carry severity 0 for the product. None is a build defect, so
there is no repro.

1. **The session could not start** (severity 0, kind behavior; no step, no screenshot). The round
   was launched with its gate unpassed. Re-run as a new session from a clean folder once `--gate`
   exits 0.
2. **The follow-up has no usable answer** (severity 0, kind behavior; transcript, "Follow-up"). The
   question has nothing to refer to, because of problem 1. The re-run must collect it.
3. **The leak check reports a quoted path as an opened file** (severity 0, kind behavior; no step,
   no screenshot). It matches facilitator file names anywhere in a tool call's input, including the
   body of a heredoc writing to the participant's own folder, and on a VOID verdict it leaves no
   `leaks.json`. Here the verdict did not change the grade, but on a real session it would void a
   clean run whose transcript quotes such a name.
