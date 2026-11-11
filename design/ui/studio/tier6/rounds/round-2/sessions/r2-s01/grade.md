Grade: SD
False done: no
Wrong turns: 1
Model calls: 13
Failure: met, recovered
Way out: Settings (Send again count 1)
Failure read: key
Disclosure: 3
Participant model: claude-opus-5-5 (from the model field of both participant logs; not sonnet)
Steps: 17 before the first report, against about 15 on the success path

# Session r2-s01: T90 A, Grace, volunteers

**Result.** The Assistant works on the Google key, and the reader reported what the reply on screen
gave: call Hannah Weiss first (555-0109), then James Carter (555-0102). The last screens show it
(`18.png`, `19.png`: "v09 is Hannah Weiss and v02 is James Carter"). Both match the file, and they are
the key's top two by closeness; `16.png` shows 0.02273, #1 of 24, for v09.

**Why SD and not S.** The reader pressed Send again once (`10.png`), which the key counts as a wrong
turn, and took the longer of the offered routes. The 17 steps are the path's 14 actions (the key's
15 less the step of reading the failure), plus Send again, plus Settings then AI provider where the
model label takes one click, plus a second question to turn ids into names. That question is no wrong
turn: the first reply gave ids alone, and the reader went after the names the task asks for.

**False done.** No. "Did I finish? Yes" is true of the screen and the records: 24 nodes and 63 edges
in `data.json`, a real reply, and Sends to Google in the status bar. The reader's count of four asks
(two failed, two answered) is also right.

**Failure.** The turn read "Could not reach OpenAI: the connection failed. Nothing changed." (`09.png`)
and again after Send again (`10.png`). The reader then found Settings unaided and the next message
got a real reply, so the way out is one the screen offered. The cause stated is `key` under the key's
rule: "I can't say whether the key is at fault"; Google working on the same computer made the reader
doubt the internet was the cause. No wrong cause was stated. One limit on this reading: the tool
printed the browser's CORS console lines to the participant, which a person would not see. The reader
said so at the time, but those lines may have prompted "this program can't talk to OpenAI" as a
possible cause.

**Disclosure, 3 of 3.** What leaves: messages plus what the Assistant reads, "column names, ids, labels
and values", which the reader took to mean names and phone numbers. Where: straight to whichever
company is picked, here Google. Who pays: the key's owner, "Google charges your key". The reader also
caught that the grant covers the OpenAI key and not the Google key that was used, and named that as a
question for the IT volunteer. The notice was read at setup (step 5, on `04.png`) and read again for
the follow-up (`19.png`).

**What the reader would load.** Not as it is. The reader would delete the phone column, use ids in
place of names and keep the names in their own sheet, would put no donors in at all, and would want the
director's OK first. The reason given: the volunteers gave their numbers for shifts, not to go to
Google.

**Leak check.** `leaks.json` read two participant logs, 48 calls, and lists no leak. Both logs were
read: they touch only files in the session's own folder and `real.mjs`.

**Follow-up.** The transcript holds the question word for word and an answer to every part.

**Run notes, none of which changes the grade.** The follow-up came from a second agent, started by
the workflow, which took up the same persona from `briefing.md` and `transcript.md`. It opened
Settings for `19.png` at 06:49:51 UTC and answered before `session.json`'s follow-up time of 06:50:27,
so the "first report" is the "At the end" block written by the first agent, and nothing before it was
affected. The first agent's prompt called the participant a returning user while the briefing says
first time; the behavior was a first meeting, so the wrong word had no visible effect, but the
workflow's prompt should be corrected.

**Counts (bar 11).** "Computed Reach for 24 nodes", "Selected 1 node", 2 nodes selected, Degree 7 to 8
and the one edge joining v02 and v09 all agree with the file. The second reply says it updated the
selection, but whether it has a change line cannot be read from this session: the end of that reply is
below the fold in `18.png` and `19.png`, and the reader never scrolled. The screenshot audit should
treat that line as not seen.

## Measures

- First move toward the Assistant: the rail's word, named at once ("Assistant button on the left looks
  like the AI", step 3).
- Starters: seen and ignored ("an ask box and suggestions", step 8); the reader typed the question.
- Messages: 4, of which 2 failed and 2 were answered. Model calls: 13, all on Google, in the 2 answered
  messages (4 and 7 steps shown).

## Problems

Severity is 0 to 4. A 3 needs a reader blocked or left with a wrong belief, so problem 1 is rated for
what it cost here, under the 3 the key gives it across the study.

1. **Severity 2, build-defect. A failed key reads as a connection failure, and Send again cannot
   help.** `09.png`, `10.png`, steps 10 and 11. "No word on whether the key is bad or the internet is";
   one Send again wasted. The reader was not blocked and kept no wrong belief, but says only the IT
   volunteer's note about the Google key got them past it. Already kept in `answers.md` for after the
   round. Repro: `../../repro/r2-s01/run.sh`, `walk/05.png`.
2. **Severity 2, build-defect. The failure offers no way to the provider section.** `10.png`, `11.png`,
   steps 11 and 12. With a key saved the panel has no AI provider... button, the row offers only Send
   again, and Settings opens on General, so the reader "had to remember the Settings gear". Repro:
   `walk/05.png`.
3. **Severity 2, build-defect. A long conversation draws two scrollbars and leaves the end of the
   reply below the fold.** `18.png`, step 19: "highlight both of them" is cut in half, and what follows
   it was never seen. The panel narrows by about 15 px. The reader noticed and stopped there. Repro:
   `walk/10.png` shows the same on a different reply; `walk/11.png`, after a wheel, shows a chip row and
   Show in table were hidden below the fold. `../../../../backlog.md` already carries the two
   scrollbars at severity 1 and 2.
4. **Severity 2, wording. One measure has two names.** `17.png`, `18.png`: "Computed Reach for 24 nodes"
   beside "Color: Closeness" and "closeness centrality". The reader asks "are those the same thing?"
   and calls them words they "cannot put on a slide". Also on `walk/10.png`.
5. **Severity 2, behavior, the model's. The first reply gave ids and phone numbers, not names.**
   `16.png`, step 17: "call v09 first at 555-0109". It cost a second message, 7 steps, to get James
   Carter's name. The key expects both on A, and neither changes the grade. The inspector's title also
   reads v09 here, so the screen did not lead with the name either.
6. **Severity 2, behavior. A question repainted the network and selected nodes unasked.** `15.png`
   onward: the look changes from 80259fe7edae to 9ccde90e53b1 and v09 is selected. "I did not expect
   it", though the reader saw Undo. The second message then went out under Selection 1 (`16.png`) while
   asking about v02, outside it; the reply was still right. Already kept in `answers.md`.
7. **Severity 2, opinion. No way the reader saw to hold back a column.** Follow-up: "Nothing in the
   program let me pick which columns go", and "I also never saw what was actually sent". The reader
   did not look in Data or open the folded steps, so this is what the reader believed, not a tested
   absence. It decided what they would load.
8. **Severity 1, behavior. The drawing moved partly out of view during the reply.** `15.png` to
   `17.png`: the left cluster crosses the panel's edge and the bottom one goes under the toolbar;
   `18.png` is back in view. The reader remarked on it. It is not on the repro's last screen,
   `walk/10.png`, where no
   node was selected. The mechanism is not traced.
9. **Severity 0, behavior. The run's prompt said "returning user" for a first-time task.** See the run
   notes. It is a defect in the study, not the build.

The repro walked frozen build 3b2a7f0649 through the browser gate and made 13 model calls. Its replies
differ from this session's, as the model's do from run to run.
