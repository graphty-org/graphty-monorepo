# Grade: session r2-s19 -- Alex (returning), running club (T17 A), only the pairs who ran together 4 or more times

**Grade: S** (success). The drawing narrowed to the strong pairs, the count came off the screen
and was right (19), and the whole club came back. `07.png`: header chip "19 of 20 nodes", Filters
row "weight is at least 4" over "20 to 19 nodes" with its checkbox ticked, Overview "Nodes showing
19 of 20", "Edges showing 12 of 41". Alex said "19 people are still in the drawing" and named all
three places. The last screen (`12.png`) has the whole club back: no chip, the row reads "weight
is at least 5" over "off" with its checkbox clear, Overview Nodes 20, Edges 41, the legend titles
back to plain "Size: PageRank" / "Color: PageRank". `work.json` agrees: the run and its three
layers kept, one step `step-1 off` (range on `data.weight`, min 5), nothing gone.

Build seen: `8f0d5a6f7791 graphty@0.8.61` (session.json), the frozen build named in the criteria,
at 1440 x 900. Start: setup `friends-ranked.txt`; `01.png` is the start the setup should leave
(friends.csv, PageRank run, sized and colored by it), so the start counts.

**Run deviation (does not change the grade, does limit the follow-up's evidence).** The follow-up
work (`09.png` to `12.png`, 03:07:02 to 03:07:30 UTC by file time) was done before the tool gave
the follow-up (`session.json`: "followUp": "given 2026-10-10T03:07:45"). The transcript files it
under "Follow-up (given word for word)" ahead of the first `--end`, and its closing note says the
request "had already been carried out above ... from the task text". The folder has no
`briefing.md`. So the participant had the follow-up's words before the tool released them, which
means it was briefed from something other than `--brief`'s output -- most likely `tasks.md`, which
holds the follow-ups and the avoided words. The main task is graded as normal: its prompt is the
one the participant would have had anyway, and nothing in the run suggests it saw the answer key
(it took the "+" door rather than the key's success path, and it said 19 "surprised me"). The
follow-up's outcome should not be counted as evidence about the "Save and turn on" trap, since
the participant planned the edit before it was asked. Whoever briefs the next participants should
use `real.mjs --brief` and nothing else.

## The answer against the key

- **Count (right).** 19 of 20, joined by 12 ties: chip, the Filters row's second line and the
  Overview "showing" rows all read so (`07.png`), and Alex quoted all three.
- **Not a wrong reading.** Alex saw "Components 1" and "Nodes 20" under the "showing" rows and
  read the line "The counts below are for the whole graph" correctly; never gave 20.
- **Back (right).** Unticked the step ("Apply step: weight is at least 4", `08.png`): Nodes 20,
  Edges 41, the row "off", chip gone. Repeated after the follow-up (`12.png`). Unticking is one of
  the key's accepted ways back.
- **Follow-up (right, see the deviation above).** Opened the step's row (`09.png`, editor with
  "Save and turn on"), changed 4 to 5 (`10.png`), pressed "Save and turn on" (`11.png`): chip "10
  of 20 nodes", row "20 to 10 nodes", Overview "Nodes showing 10 of 20", "Edges showing 5 of 41".
  Alex said 10, read from the chip and Overview, and counted ten dots ("three pairs plus a chain
  of four"), which matches; the near-overlap at about 717,745 / 735,744 did not make the dot count
  short here. Then one untick brought the club back. Did not fall into the trap (ticking after
  "Save and turn on").
- **Legend.** Read "PageRank on 20 nodes" as the scores still being the whole club's, which is
  what the key says it means; did not rerun PageRank, did not read 20 as the number drawn.

## Measures

- **Steps:** main task 7 `real.mjs` steps after the start (`02.png` to `08.png`) including the way
  back; the key's success path is 7 (Data, attribute row, Attribute actions, Filter to, Value,
  Add step, untick), so 1.0x. Follow-up 4 steps (`09.png` to `12.png`) against the key's 4, 1.0x.
- **Wrong turns:** 0. Every step moved the task forward.
- **Door:** the Filters "+" ("Add filter step"), then Attribute, Edges / weight, "at least", 4 --
  the other door the key accepts.
- **False "done":** none. Every "done" matched the screen at that moment.
- **First move:** the Data place, looking for the weight column; it led straight to Filters.

## Problems

| Severity | Problem | Evidence |
| -------- | ------- | -------- |
| 2 | While a step is on, the Overview lists "Components 1" (and Nodes 20, Edges 41, Density) for the whole graph just under "Nodes showing 19 of 20", over a drawing visibly in many pieces. Only the one line "The counts below are for the whole graph" stops the reader from taking it as the filtered view; Alex wanted the component count of what is showing and believed 19 only after three places agreed. | `07.png`; transcript step 7 and wrap-up |
| 1 | Nothing on the Graph place points to filtering; Alex had to guess that filters live under Data, and says the first place he looked was the bottom toolbar. Cost here: none counted (he went to Data in one step looking for the weight column). | `01.png`, `02.png`; wrap-up |
| 1 | The New filter step editor shows no count of what the step would keep before "Add step" (known on this build). | `06.png`; transcript step 6 |
| 1 | The step's checkbox at the far right of the row is small, and Alex was unsure whether it meant "on" or "selected" until the word "off" appeared on the row's second line. This is the same ambiguity the key's trap rests on. | `07.png`, `08.png`; wrap-up |
| 0 | Run deviation: the follow-up was in the participant's hands before the tool gave it (no `briefing.md`; follow-up steps time-stamped before "followUp: given"). A study-method problem, not a product one; see above. | file times of `09.png` to `12.png` against `session.json` |

## Tool events

None. Every click and keystroke landed where the transcript says; the setup left the expected
start; `work.json` recorded start and end. The first `--end` gave the follow-up and the second
closed the session, as the tool's README describes.
