Grade: S
False done: no
Wrong turns: 0
Model calls: 6
Failure: none
Card: read (card)
Participant model: claude-opus-5-5 (from both of the participant's logs; no line in them or in transcript.md names sonnet)
Steps: 12 presses to the first report, all on the success path of 4 or 5 pointer steps (Assistant took 7 presses, the request 1, Remove 4); 1 wait step after the follow-up

# Session r2-s08: T93 B, Sam, keyboard only

**Result.** Sam asked the Assistant to delete every gene outside the largest connected component,
read the approval, checked its count against the Values panel, pressed Remove, and reported the
truth: 82 genes out, not the lab mate's twenty, 249 nodes and 298 edges left. Both numbers match the
answer key's "if removed" row. He took the success path with no detour, so the grade is S.

**Why it is not void.** `leaks.json` read two transcripts (the session and its follow-up) and found
no leaks in 35 calls. The session ran on the frozen build (`session.json`: 3b2a7f0649, no uncommitted
changes), every step in `route.jsonl` ended with code 0 and nothing missed, and the model cap was not
reached.

**What the records show.**

- `09.png`: the request reads "Remove 82 nodes and 63 edges?", "Undo can bring them back.", chip 82,
  with Remove, Change this and Keep them. The network still reads 331 nodes, 361 edges, 26 components,
  largest 249 nodes.
- `12.png`: right after Remove, the panel reads 249 nodes, 298 edges, 1 component.
- `14.png`, the last screen: the same counts, the chips above the composer read 249 and 298, and the
  log reads "Removed 82 nodes and 63 edges" with Open run and Undo.
- `data.json`: 249 nodes and 298 edges in total, all visible and all drawn, so the genes are gone and
  not hidden. No filter is set.
- `work.json`: one run added (Connected components, labeled Separate pieces), and the layers are as
  they started. The `look` value in `styles-steps.jsonl` is the same on every step.
- `session.log`: 6 model calls, none failed.

**How the reader got there.**

- Steps 1 to 6: five Tabs to the rail, ArrowDown to Assistant, Enter. Focus landed in the composer.
  These were one route walked forward, so none is a wrong turn.
- Step 7: he sent one request, without the remembered number in it.
- Step 8: the card appeared, and he read it.
- Steps 9 to 11: three Shift+Tabs to Remove, then Enter, with the ring checked at each stop
  (`10.png`, `11.png`).
- Step 12: he waited for the closing reply, then wrote his report.

**The card.** Read, from the card. His step 8 note, written before he answered, quotes the request's
title word for word, gets 82 by subtracting 249 from 331 on the Values panel, and says the lab mate's
"about twenty" was wrong. The same note also gives the model's reply, which states the same count, but
the quotation is the card's, so this is `read (card)`. It does not show an approval weighed against
fatigue: this was one card, seen once.

**The report.** It agrees with the network and names the difference before the follow-up was asked:
"The number of genes taken out was 82, not twenty." Each thing he said was on screen first. His claim
that Undo can still bring them back comes from the card; he did not try it.

**The follow-up.** The transcript holds the answer: 82 genes and 63 edges, "roughly four times that
guess, about 60 more". The true gap is 62, so that is right.

**What his complaints turned out to be.**

- Focus staying in the composer while the card waits is the design: `decided.md` says focus never
  jumps to the section and that Shift+Tab reaches it. Rated as friction only, and not raised again.
- He said no shortcut for Assistant was printed. Control+I exists, and session r2-s02 showed its tooltip
  appears within 2 seconds of focus, which can be later than this tool's screenshots.

**Problems.** No problem below blocked him or left him with a wrong belief. None was reproduced with
a scripted path, so none is marked as a build defect.

| Sev | Kind          | Problem                                                                                                                                                                 | Evidence                          |
| --- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | accessibility | From the composer, the walk back to the request meets Keep them, Change this, then Remove: 3 Shift+Tabs, with no key shown on Remove. This follows the settled tab order | Steps 9-10, 10.png, 11.png        |
| 1   | behavior      | The top bar's Undo lights while the graph has not changed, and the turn's Undo sits beside a line that only computed something. He could not tell what either would undo | Steps 7-8, 08.png, 09.png         |
| 1   | wording       | The reply says "please confirm if you would like me to proceed", which reads as a request to type, while the card wants a button. He used the button                     | Step 8, 09.png                    |
| 1   | wording       | The reply says "permanently", in the words of his own request, above "Undo can bring them back." He kept the card's meaning. Already in the backlog for T93 B            | Steps 8, 12; 09.png, 14.png       |
| 1   | behavior      | After Remove, the steps count falls from 3 to 1 and the computed line leaves, then 4 steps and both lines appear. Stop and "Sending to Google" stay on after the change  | Steps 11-12, 09.png, 12.png, 13.png |
| 1   | wording       | The first reply and the closing reply run together with no gap, so the closing report reads as part of the request for approval                                          | Step 12, 13.png, 14.png           |
| 1   | wording       | "Computed Separate pieces for 331 nodes" was not his word; he guessed it meant components                                                                                | Step 12, 13.png                   |
| 1   | accessibility | Five Tabs to the rail, past the disabled Undo and Redo. Already in the backlog                                                                                           | Steps 1-4, 04.png, 05.png         |

These are simulated sessions, and the model behind the Assistant varies from run to run. A pass here
is weak evidence until real people confirm it.
