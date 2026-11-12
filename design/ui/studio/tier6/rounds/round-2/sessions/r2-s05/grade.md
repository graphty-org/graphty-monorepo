Grade: SD
False done: no
Wrong turns: 1
Model calls: 11
Failure: none
Trap fired: yes
Taken on trust: no
Checked: Show in table (fact 2, then the table's rows read by hand); nothing for fact 1 in the first report. After the follow-up: folded steps, the table's Betweenness column
Scope noticed: yes
Participant model: claude-opus-5-5 (from the participant's log; no line in it names sonnet)
Steps: 7 to the first report, on the path of 4 to 9; 13 in all with the 6 after the follow-up

# Session r2-s05: T92 A, Dev, sources

**Result.** Dev reported both facts right: Silverline Media (s20) and 7 of the 12 on the record. Each
had something on screen behind it, and he could say what. He got there only after his first question
came back narrowed to a selection he had not made, which he noticed and undid. That detour is why
the grade is SD and not S.

**Why it is not void.** `leaks.json` read two transcripts and found no leaks in 38 calls. The session
ran on the frozen build (`session.json`: 3b2a7f0649, no uncommitted changes), every step in
`route.jsonl` ended with code 0 and nothing missed, and the model cap was not reached.

**What the records show.**

- Fact 1. `08.png`: the reply reads "Across the entire graph, s20 has the highest betweenness
  centrality". `10.png`: row s20 is Silverline Media. After the follow-up, `16.png` shows
  news@silverline.example at 67.68 and `14.png` shows media@port.example at 61.64, which are the key's
  top two. Victor Szabo is 45.4 in `15.png`.
- Fact 2. `08.png`: "Of the 12 sources who are on the record, 7 gave donations", chip 7, Show in table.
  `13.png` onward: the folded steps hold chips 12 and 7, both of which back the fact. The panel in
  `09.png` to `16.png` reads on_record Yes (7), donations 300 to 18,000. His seven names are the key's
  seven.
- Last screen, `16.png`: the table and the 7 selected. The first report's screen, `11.png`, already
  held both facts and s20's name. Nothing was claimed that the screen did not show, so no false done.
- `work.json`: two runs added, `Bridges (visible)` and `Bridges (14 nodes)`, and no layers. The `look`
  value in `styles-steps.jsonl` is the same on every step, so the picture never changed.
- Every count on a chip and a change line is true: 24, 14, 12, 7.

**How the reader got there.**

1. Assistant (`02.png`), then the first question with Selection 14 on the line (`03.png`).
2. `05.png`: "Among your selected sources, Victor Szabo (s10) ..." and "Ines Moreau (s11)". This is the
   plant firing on fact 1, a person's name in place of the true answer. His note at this step: "wait,
   'among your selected'? I did not select anything." He caught it from the word in the reply, not
   from the scope line.
3. He pressed the x (`06.png`, Whole graph 24 / 59) and asked both facts again in words that named the
   whole graph (`07.png`). This matches the key: the x plus the words gives the seven. His first
   question is the one wrong turn, since its answer was thrown away.
4. Show in table, then two scrolls (`09.png` to `11.png`), counting on_record and donations by hand.

**The first report.** It said plainly that Silverline being top came from the AI and was not checked,
and that he never saw the betweenness number. Fact 1 was right and marked as the model's, so `Taken on
trust` is no. He warned against Victor Szabo in his complaints and in the follow-up.

**The follow-up.** The transcript holds the answer. He gave source, certainty and what he looked at for
each fact, and opened by saying he had really checked only one of the two when he finished. He then
found the Betweenness column, read all 24 rows, flagged that 67.68 against 61.64 is close and that
"most" is stronger than the data, and corrected his own s11 note. These checks are recorded apart from
the first report.

**Problems.** No build defect here: each behavior below matches the design or the key, so no repro was
needed.

| Severity | Kind     | Problem                                                                                                                                                                                     | Evidence                                               |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 2        | behavior | The scope line did not carry the warning. Dev caught the narrowing from one word in the model's prose, and says the Selection 14 chip "does not say it will narrow the answer". A reply without that word would have gone through. | Step 5, `05.png`; his end-of-session notes             |
| 2        | behavior | Nothing records what scope a sent message went with. The line returned to Selection 14 during the send, and he could not tell how the message went. The x lasting one message is settled in `decided.md`; the missing record of the sent message's scope is not. | Step 7, `07.png`, `08.png`                             |
| 2        | behavior | The reply that gave the right fact 1 has no chip, change line or Open run, because it reused the earlier run. The only link sits under the answer he had just discarded, so he checked nothing for fact 1 until the follow-up, and then by dragging the table sideways. | Step 8, `08.png`; follow-up, `14.png`                  |
| 2        | wording  | One measure has two names: "Computed Bridges" in the chat, "Betweenness" in the table and the reply. "(visible)" on the column also left him guessing that it meant all 24.                  | `05.png`, `14.png`; already in `backlog.md` as seen before |
| 1        | behavior | Show in table replaced the reporter's 14-node selection with the 7, and he did not know whether he could get it back. It is the design (section 5.3) and the line shows it, so the cost is doubt only. | Step 9, `09.png`                                       |
| 1        | wording  | The model's own words: fact 1 came as the id s20 after a first reply that used names, and that first reply mixed two names and two scopes. Reported as the model's; the table gave a way through. | `05.png`, `08.png`                                     |
| 1        | behavior | Clicking a "Query data" row in the opened steps did nothing, and it looks like the row above it that does open.                                                                              | Follow-up, `14.png`                                    |

**For the round's questions.** Dev caught the wrong scope without being told, from the reply's word,
before he reported anything. He checked the chip's fact unasked through Show in table, but did not
hover a chip and did not check the fact that had no chip.
