# Grade: session r1-s09 -- Ruth, the returning reporter, keeps only the running club's strong pairs (friends.csv)

**Grade: S** (success). Both counts are right and the whole club is back on the last screen. At 4
or more runs together she reported 19 people joined by 12 pairs; at 5 or more (the follow-up), 10
people joined by 5 pairs. Both times she brought the whole club back by unticking the step's
checkbox, which the answer key accepts. She made no wrong turn, did not fall into the "tick after
Save and turn on" trap, and every claim she made matches the screen.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Setup `friends-ranked.txt` ran to its end state
(the PageRank run, sized and colored, `01.png`). Every step's screenshot matches its command; no
tool fault. The session is not void.

## What the last screen shows (`12.png`)

- The Filters row reads "weight is at least 5" with a second line "off", and its checkbox is
  unticked.
- The header has no "N of 20 nodes" chip; the Overview reads Nodes 20, Edges 41, Components 1.
- The drawing shows all 20 dots and the full set of ties, as in `01.png`.

The answers were on screen when she gave them:

- At 4 or more (`07.png`): chip "19 of 20 nodes", row "weight is at least 4 / 20 to 19 nodes"
  (ticked), Overview "Nodes showing 19 of 20", "Edges showing 12 of 41". The answer key: 19 of 20,
  12 ties.
- At 5 or more (`11.png`): chip "10 of 20 nodes", row "weight is at least 5 / 20 to 10 nodes"
  (ticked), Overview "Nodes showing 10 of 20", "Edges showing 5 of 41". The answer key: 10 of 20,
  5 ties.
- Whole club back after the first ask (`08.png`): row "off", chip gone, Nodes 20, Edges 41.

## Measures

- **Steps:** 11 after the start (`02.png` to `12.png`). The answer key's success path is 8 actions
  for the first ask and 4 for the follow-up, so she was at or under it. She came in by the Filters
  "+" ("Add filter step") door, which the key accepts.
- **Wrong turns: 0.** Every click moved her forward. Editing the existing step instead of adding a
  new one, and pressing "Save and turn on" once and then unticking once, is the key's follow-up
  path exactly.
- **False "done": none.** Each "done" (steps 8 and 12) was said on a screen that shows the whole
  club back. truth-on-screen: none.
- **One claim the screen does not fully support (not a false "done"):** at step 7 she said she
  counted 12 lines on the drawing herself. In `07.png` the tie between the two dots at about
  567,758 and 583,753 is hidden by their overlap, so about 11 lines can be seen (the answer key
  records this). Her stated count is the panel's and is right, so the grade does not change.
- **Trap avoided:** after "Save and turn on" she did not tick the checkbox to "switch it on"; she
  read the chip and row first, then unticked once to bring everyone back.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). An opinion-only finding is held one level down. None of these
is confirmed yet: this is the only prompt A session graded so far, and the confirmation count is
taken across sessions when the round is tallied.

1. **Severity 2 -- the step names nobody it removed.** With one runner dropped at 4 or more, the
   screen gives the count (19 of 20) but not who it was; for her flyer she would have to hunt
   through the dots. (The answer key: Theo.) Evidence: `07.png`, step 7 remark, debrief.
2. **Severity 1 -- two pairs of dots overlap on the drawing, so a count by eye comes out short.**
   At 4 or more the 567-583 tie is hidden; at 5 or more she could make "10" only by taking the
   bottom blob (about 717,745 / 735,744) as two. She trusted the panel, so no wrong answer
   followed. Evidence: `07.png`, `11.png`, step 11 remark.
3. **Severity 1 (opinion) -- the run-count column is called "weight" everywhere.** She inferred it
   was her runs only because it was the one numeric column; a file with two numeric columns would
   not give that clue. Evidence: `02.png`, `04.png`, debrief.
4. **Severity 1 (opinion) -- no preview of the result before "Add step".** She typed 4 with the
   drawing unchanged and committed "blind". Evidence: `06.png`, step 6 remark.
5. **Severity 1 (opinion) -- the "+" beside Filters has no visible words**; the heading "Filters"
   is what led her to it. Evidence: `02.png`, step 2 remark, debrief.

Not met in this session: the legend still shows the whole graph's PageRank range (0.03779 to
0.06394) while the filter hides nodes (`07.png`, `11.png`); she did not read it as a count, so it
is not recorded as a problem here.

What worked: "Keeps edges that pass and the nodes at their ends" told her in advance that a runner
with no strong pair would drop out (`05.png`); the three places that agree on the count (chip, the
row's "20 to 19 nodes", the Overview's "showing" rows) plus "The counts below are for the whole
graph." spared her a check (`07.png`); clicking the step's row reopened its editor with the old
value, and "Save and turn on" said what it would do (`09.png`, `10.png`).

## What this says about the round

No build defect showed up: every control did what the answer key says, and nothing in the session
was spent on a broken control. The filter path held up for a returning user who had never filtered
before. The findings are about what the result tells the user beyond the count: who was removed,
and a drawing whose overlapping dots cannot be counted by eye.
