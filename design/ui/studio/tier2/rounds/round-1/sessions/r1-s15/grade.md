# Grade: session r1-s15 -- Nadia, back again, keeps only the running pairs with 4 or more runs (friends.csv)

**Grade: S** (success). Both answers are right and the whole club is back on the last screen. With
the filter "weight is at least 4" on, she reported 19 people (12 of 41 pairs), which matches the
answer key's 19 of 20 nodes and 12 ties. On the follow-up, "at least 5", she reported 10 people
(5 pairs), which matches the key's 10 of 20 nodes and 5 of 41 edges. Each time she brought everyone
back by unticking the filter, one of the three ways the key accepts. She took the "Filters +" door,
which the key also accepts, and made no wrong turns.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build the criteria name. Setup `friends-ranked.txt` reached its end state (the
graph ranked, colored and sized by PageRank, `01.png`). Every step changed the screen as its command
asked, and nothing was done that a person could not do, so the session is not void.

## What the last screen shows (`12.png`)

- No count chip in the top bar: it reads "friends ... Local only".
- Filters row: "weight is at least 5" over "off", with its checkbox unticked.
- Graph Overview: Nodes 20, Edges 41, with no "showing" rows.
- The drawing shows all 20 people and all their ties, the same as the start (`01.png`).

The answers were read from screens that show them:

- `07.png`: chip "19 of 20 nodes"; Filters row "weight is at least 4 / 20 to 19 nodes", ticked;
  Overview "Nodes showing 19 of 20", "Edges showing 12 of 41".
- `11.png`: chip "10 of 20 nodes"; row "weight is at least 5 / 20 to 10 nodes", ticked; Overview
  "Nodes showing 10 of 20", "Edges showing 5 of 41".

## Measures

- **Steps:** 11 after the start (`02.png` to `12.png`): 7 for the first answer and the restore
  (`02` to `08`), 4 for the follow-up (`09` to `12`). The key's path has 6 and 4.
- **Wrong turns: 0.**
- **The trap the key names** (editing a step that is off, pressing "Save and turn on", then ticking
  the box expecting to turn it on, which turns it off): avoided. She read the button, saw the box
  ticked and the chip at "10 of 20 nodes" after saving (`11.png`), and ticked once only to bring
  the club back.
- **False "done": none.** "Everyone's back" at steps 8 and 12 matches `08.png` and `12.png`: no
  chip, row "off", Nodes 20, Edges 41. The 19 and the 10 are on screen in three places each.
  truth-on-screen: no wrong claim.
- **Dot count:** at 5 or more she said she could count the five pairs on the drawing. On this build
  all 10 dots and 5 ties are visible at 5 or more, so her count agrees. She did not count dots at 4
  or more, where an overlapping pair would have made the count come out short.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). Each problem below was seen in this session only, and none
changed the result.

1. **Severity 1 -- the "+" beside "Filters" is a small gray icon with no visible label.** She found
   it only because of the heading next to it, and said so. Evidence: `02.png`, `03.png` (the + at
   about 276,197), debrief.
2. **Severity 1 -- after the filter is on, the drawing's legend still shows the whole graph's
   PageRank range (0.03779 to 0.06394), with nothing saying whose range it is.** She wondered
   whether it described the whole club or only the people shown. She did not read it as a count.
   The key lists this as known on this build. Evidence: `07.png`, `11.png`, debrief.
3. **Severity 1 -- nothing on screen says which one person the filter dropped.** "19 of 20" surprised
   her for a filter meant to keep only the strong pairs, and the hint "Keeps edges that pass and the
   nodes at their ends" explained it only because she had read it. She could not have named the
   person (Theo) without searching. The task did not ask for the name. Evidence: `05.png`, `07.png`,
   debrief.
4. **Severity 1 (opinion, held one level down from 2) -- the column is called "weight", the file's
   own header, not "runs".** She knew it was the runs column only because it was the only number on
   the edges. Evidence: `04.png`, debrief.
5. **Severity 0 -- after "Add step" the right panel leaves the filter editor and shows the Graph
   Overview.** It surprised her, but it was useful because it shows the counts. The key lists this
   as known on this build. Evidence: `07.png`, debrief.

What worked: "Keep an attribute's value / weight / at least / 4" matched her own sentence, with "at
least" already chosen (`05.png`). The count appears in three places (`07.png`, `11.png`). "Save and
turn on" said what it would do, so the follow-up took four steps and avoided the checkbox trap
(`09.png` to `11.png`). Unticking a step kept it for later, which she said she wanted.

## What this says about the round

No build defect showed up: every control did what the answer key says it does, and no time went to
a broken control or an implementation fault. The participant said so herself ("Implementation
issues hit: none"), and the screens agree. The problems are small design findings about how
visible the filter's entry point is, the legend's scope while a filter is on, and the column's
name.
