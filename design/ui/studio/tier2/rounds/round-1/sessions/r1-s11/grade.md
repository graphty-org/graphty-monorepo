# Grade: session r1-s11 -- Jordan, a returning marketing analyst, keeps only the running club's strong pairs (friends.csv)

**Grade: S** (success). Both counts are right and the whole club is back on the last screen. At 4
or more runs together he reported 19 people (12 pairs); at 5 or more, 10 people (5 pairs). Both
match the answer key. Each time he brought everyone back by unticking the step, and the last
screen shows the full graph with the step kept and off.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. The setup (`friends-ranked.txt`) reached its end
state and every screenshot matches its command. The session is not void.

## What the last screen shows (`14.png`)

- No "N of 20 nodes" chip in the header; the drawing shows all 20 runners and all their ties.
- The Filters row reads "weight is at least 5" over "off", checkbox unticked.
- The Overview reads Nodes 20, Edges 41, with no "showing" rows.
- The answers were read two screens earlier, with the step on: chip "19 of 20 nodes", row "20 to
  19 nodes", Overview "Nodes showing 19 of 20", "Edges showing 12 of 41" (`09.png`); and chip "10
  of 20 nodes", row "20 to 10 nodes", Overview "Nodes showing 10 of 20", "Edges showing 5 of 41"
  (`13.png`).

## Measures

- **Steps:** 13 after the start (`02.png` to `14.png`). The success path is 7 steps for the first
  part and 4 for the follow-up, 11 in all.
- **Wrong turns: 1.** Step 5 (`05.png`): with the Attribute list open (`04.png`), the click meant
  for its "weight" option landed on "weight" in the left Attributes list. The driver aimed at the
  second "weight" on screen and got the wrong one; the participant did not choose the left row.
  The app then replaced the half-filled "New filter step" form with the attribute's Summary and
  discarded the form without asking. He reopened the form on the next step and lost nothing else.
- **The follow-up trap:** avoided. After "Save and turn on" (`13.png`, checkbox ticked) he read
  the count first and ticked only once, which brought everyone back (`14.png`). He never ticked
  to "turn it on" after saving.
- **False "done": none.** Every claim matches the screen beside it: 19 and 12 (`09.png`), the
  whole club back (`10.png`), 10 and 5 (`13.png`), all 20 back (`14.png`). He noticed that two
  dots overlap at the bottom and that a count by eye would come out at 9, and he took the panel's 10. truth-on-screen: no wrong claim.
- **Earlier work kept:** the PageRank run and its size and color layers are still on the drawing
  at the end (legend "Size: PageRank", "Color: PageRank", `14.png`). The filter step is kept,
  switched off by his choice.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). An opinion-only finding is held one level down. "Confirmed"
means two participants met it; the other running club session graded so far (r1-s09, same task,
same half) met the first three.

1. **Severity 2 (confirmed with r1-s09) -- the step names nobody it removed.** At 4 or more one
   runner drops, and the screen gives only the count. He said that for the flyer he would want the
   list of people left, or the one who is not, to copy. (The answer key: Theo.) Evidence:
   `09.png`, step 9 remark, debrief.
2. **Severity 1 (confirmed with r1-s09) -- overlapping dots make a count by eye come out short.**
   At 5 or more the two large dots at the bottom (about 717,745 and 735,744) read as one, so his
   own count was 9; he trusted the panel's 10, so no wrong answer followed. He added that on a
   slide the pair would read as one person. Evidence: `13.png`, step 13 remark, debrief.
3. **Severity 1 (opinion, confirmed with r1-s09) -- no preview of the result before "Add step".**
   He typed 4 with the drawing unchanged and had to commit before he could see how many people it
   left. Evidence: `08.png`, step 8 remark, debrief.
4. **Severity 1 -- clicking an attribute in the left list while the "New filter step" form is
   open discards the form without a word.** Here the click was a driver's mis-aim, not his
   choice, but the result is what the app does: the form and its chosen Keep are gone, the right
   panel shows the attribute's Summary, and nothing offers to keep or restore the step. On this
   short form it cost one step. Evidence: `04.png`, `05.png`, step 5 remark, debrief.

Not met in this session: the legend still shows the whole graph's PageRank range (0.03779 to
0.06394) while the filter hides nodes (`09.png`, `13.png`); he did not read it as a count, so it
is not recorded as a problem here.

What worked: the "Filters" heading with its "+" on the Data place was where he looked first
(`02.png`); "Is at least" was already chosen, and "Keeps edges that pass and the nodes at their
ends" answered in advance what happens to people (`07.png`); the count agreed in three places, so
he did not count dots (`09.png`); clicking the step's row reopened its editor with the old value,
an "Off" header and a "Save and turn on" button that said what it would do (`11.png`).

## What this says about the round

No build defect showed up: every control did what the answer key says, the counts on screen agree
with the answer key, and nothing in the session was spent on a broken control. The one detour came
from the driver's aim, not from the app's layout or wording. The findings repeat the other running
club session's: the result gives a count but not who was removed, and the drawing's overlapping
dots cannot be counted by eye.
