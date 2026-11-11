Grade: S
False done: no
Wrong turns: 0
Model calls: 11
Failure: none
Card: read (card)
Participant model: claude-opus-5-5 (from the participant's log; no line in it names sonnet)
Steps: 7 to the report, against a path of 5 or 6 with the model's question; the 2 extra are checks in the table

# Session r2-s07: T93 A, Dev, the student

**Result.** Dev took all seven people out of the network and reported it truly: 7 people, not the
three Marisol remembered, 17 nodes and 31 edges left, and all seven names right. He did not stop to
ask her first, and said so. The task accepts either decision, so the grade rests on the report
agreeing with the network, and it does.

**Why it is not void.** `leaks.json` read two transcripts and found no leaks in 25 calls. The session
ran on the frozen build (`session.json`: 3b2a7f0649, no uncommitted changes), every step in
`route.jsonl` ended with code 0 and nothing missed, and the model cap was not reached.

**What the records show.**

- Last screen, `09.png`: inspector Nodes 17, Edges 31; the turn ends "Removed 7 nodes and 32 edges"
  with Undo; scope line 17 and 31; the table reads 17 nodes.
- `data.json`: total and visible are both 17 nodes and 31 edges, so this is a removal and not a
  filter. `filters` is empty. These are the key's "if removed" numbers.
- `work.json`: no runs or layers added. The `look` value is the same on every step.
- His seven names are the key's seven. The hours and roles he quotes were on screen before he
  reported: Aisha 22 and Diego 27 in `06.png`, Julia 25 and Zara staff 38 in `07.png`.
- The follow-up is answered in the transcript: 7 people against about three, "more than double",
  and the rule and the number do not agree. The first report already said 7 and not three.

**How the reader got there.**

1. Assistant (`02.png`), then the request, with "about three" in the message (`03.png`).
2. `05.png`: the model asks a question, as the key expects when the remembered number is in the
   message: all 7, only the 3 untrained, or cancel. This is the first place he saw 7, so his first
   sight of the count came from the question's words, not the request.
3. Show in table and one scroll (`06.png`, `07.png`). He read the seven rows and found a staff member
   at 38 hours. These are checks, not wrong turns: nothing was undone and they fed his report.
4. He picked all 7, reasoning that the rule was Marisol's and the training filter was the model's
   idea, and pressed Answer.
5. `08.png`: the request, "Remove 7 nodes and 32 edges? Undo can bring them back." His note at this
   step quotes it word for word and adds "Nothing changed yet". He pressed Remove.

**Why these marks.**

- S and not SD: he made no wrong turn and needed no recovery. The two extra steps are reading the
  table the reply offered.
- `Card: read (card)`: the note at the answering step names the count and takes it from the request.
  That is the key's test, so it holds. It is the weaker kind of pass, though. He already knew 7 from
  the question, so this session does not show that the request alone would have caught the difference.
  What the request added was the 32 edges, which he then checked against 63 and 31.
- Bar 6 for this half: holds. The report agrees with the network and names the difference.
- Approval by reflex (the round's question 6): no. He read the request, but the decision had already
  been made at the question, so the request worked as a confirmation.

**Problems.**

1. Severity 2, behavior. `05.png`, step 6. The model offers "Delete only the 3 untrained people", a
   filter nobody asked for that happens to match the remembered number. Dev called it tempting and
   turned it down. Cost here was none; a reader who took it would leave four people in place.
2. Severity 2, accessibility. `05.png`. While the question waits, its words appear only as the small
   gray label over the radios; the turn in the chat holds just "7 steps" and a chip. Dev: "tiny gray
   text". Source: `QuestionCard` in `graphty/src/workspace/assistant/Waiting.tsx` passes the question
   as the radio group's `label`. The words reach the chat at full size only after he answers
   (`08.png`).
3. Severity 2, behavior. `09.png`. After Remove, "so nothing has been changed yet." sits directly
   above "deleted those 7 nodes" in one block with no break. Dev had to read it twice. The last line
   settled it, so no wrong belief.
4. Severity 1, build-defect. `06.png`, `07.png`. Show in table leaves the table in loaded order, so
   four of the seven rows start out of view and he had to scroll for them. Same defect as
   `rounds/round-2/repro/r2-s06/run.sh`.
5. Severity 1, wording. `09.png`. "Not in this graph" stands alone under the earlier reply. This is
   the designed text for a chip whose elements are gone (`design.md`, section 5.3), but out of context
   Dev could only guess at it.
6. Severity 1, wording. `08.png`, `09.png`. He asked for "for good" and was told Undo can bring them
   back; he could not tell when that stops. He flagged it in both answers, so no wrong belief.
7. Severity 1, behavior. `06.png` to `09.png`. With the table open, the lower cluster runs under the
   toolbar and the table, so some of the network is out of sight. Dev did not remark on it.

**Repro.** `rounds/round-2/repro/r2-s07/run.sh` was run once on the frozen build and did not bring
back problems 1 to 3. The model put its question in an ordinary reply that named the seven, so no
question card or request appeared (`walk/04.png`). Those three stay tied to this session's model
path. That reply's chip read 5 beside "7 people", which this session did not meet.
