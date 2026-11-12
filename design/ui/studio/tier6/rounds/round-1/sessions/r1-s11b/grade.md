Grade: VOID
False done: no
Wrong turns: 0
Model calls: 0
Failure: none
Trap fired: no
Taken on trust: no
Participant model: claude-opus-5-5 (from the model field of both participant logs; not sonnet)
Steps: 0 of the 3 on the success path

# Session r1-s11b: T95 A, Grace, volunteers

**Why it is void: the run failed, not the reader.** This is the re-run of r1-s11, and it stopped the
same way. `real.mjs --start` exited 1 and opened no browser, both times the participant ran it, so
the participant never saw the app. The refusal read: `plan.md holds no "Gate evidence" section, so
no session of this round may start; run real.mjs --gate <round folder> until it exits 0`. When this
grade was written, `plan.md` still had no such section: its only mention of the name is the line
saying never to write one by hand. The result says nothing about the Assistant or about build
3b2a7f0649.

**What the grade rests on.** There is no last screenshot, `session.log`, `styles.json`,
`styles-steps.jsonl`, `work.json` or `downloads/`, because no session existed and `--end` never ran.
This folder did not exist until this grade was written. The only records are `briefing.md` and
`transcript.md` in the participant's folder,
`tmp/studio-sessions/tier6/rounds/round-1/sessions/r1-s11b/` under the worktree, and the
participant's two logs.

**Success definition.** Not reached and not tested. Grace never saw the volunteers file, asked the
AI nothing and has no list for her director. `Failure: none`, `Trap fired: no` and `Taken on trust:
no` record that no message was sent and no claim was on screen. They are not measurements, and this
session must not count toward any bar, bar 5 and the round's question 3 included.

**False done.** No. The transcript says "Session did not begin" and "Finished: no (not started)",
and both are true.

**Follow-up.** The transcript holds the question word for word and a reply, but it is no answer
about any reply of the Assistant. `--step` printed `no live session` and exited 2, and the
participant said there is no "that" to rely on, that she made no list and that she would not guess
at names. That is true, and it measures nothing.

**Leak check.** No `leaks.json` existed, because `--end` never ran, so `real.mjs --leaks` was run on
this folder and on the participant's folder. Each read two participant logs, exited 1, wrote no
`leaks.json` and printed one line: `VOID: the participant opened a facilitator file, plan.md (Bash,
agent-a3681b902e8630085.jsonl)`. That line is false. Every tool call in both logs was read.
`agent-a3681b902e8630085.jsonl` holds a read of the participant's own `briefing.md` and two
`--start` commands, each with a heredoc appending to its own `transcript.md`; `plan.md` appears only
in the second heredoc, which quotes the tool's refusal. `agent-ae4ea251c2d7b6d77.jsonl`, the
follow-up, holds a listing and reads of the same two files, one `--step` and a heredoc appending to
`transcript.md`. Neither opened a file outside its own folder. The grade is void for the failed run,
not for a leak.

## Problems

None is a problem with the app, so all carry severity 0 for the product. No build defect can be
named or reproduced from a session that never reached the app, so there is no `repro/` folder.

1. **The session could not start** (severity 0, kind behavior; transcript step 1, no screenshot).
   The re-run was launched with the round's gate still unpassed, the same cause as r1-s11, so
   another re-run stops the same way until `--gate` exits 0.
2. **The follow-up has no usable answer** (severity 0, kind behavior; transcript, "Follow-up", no
   screenshot). "How far can she rely on that" has nothing to refer to, because of problem 1. A run
   that reaches the app must collect it.
3. **The leak check reports quoted text as an opened file** (severity 0, kind behavior; no step, no
   screenshot). It matches facilitator file names anywhere in a tool call's input, including the
   body of a heredoc writing to the participant's own folder, and on that verdict it leaves no
   `leaks.json`. Here the verdict did not change the grade; on a session that ran, it would void a
   valid session whose transcript quotes such a name.
