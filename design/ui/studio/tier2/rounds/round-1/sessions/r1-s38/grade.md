# Grade: session r1-s38 -- Ruth, back with the football coach's two spreadsheets, joins players and passes into one network (players.csv + passes.csv)

**Grade: S** (success). Both files are in one drawn network, the counts are stated and right for
the choice she made, and the row that did not fit is named exactly: line 17 of passes.csv, Dina
Moss (s04) passing 3 times to s11, who is not in players.csv. She chose "Add", so the load made 11
nodes and 18 edges; the answer key accepts either Add or Leave out when the participant says
which row did not fit ("With 'Add': 11 and 18").

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every step's screenshot matches its command; the
one ambiguous click (step 20, "s11" matched both the node and the edge) took the node, which is
what she wanted. The session is not void.

## What the last screen shows (`25.png`)

- The graph "players and passes" drawn, with name labels on ten dots (Hope Ward, June Kaur, Bea
  Lund, Eve Grant, Iris Chen, Gia Russo, Ana Torres, Dina Moss, Fay Osei, Cleo Park) and one
  unlabeled dot, s11, still ringed in yellow from her earlier selection. Eleven dots in all.
- The inspector shows Everything > Style: Label "Above / name", "10 labels", "Show all labels"
  ticked. Two pairs of labels overlap ("Bea Lund" over "Eve Grant", "Dina Moss" into "Fay Osei").
- The counts are on the earlier Overview (`15.png`): Nodes 11, Edges 18, Directed, Loaded weight
  "passes (closer)", Density 0.1636, Components 1, Edges per node 1 to 4, mean 3.273. The import
  page before Load said "10 node rows and 18 edge rows read; the load makes 11 nodes and 18
  edges" (`09.png`), and the unmatched row was shown as line 17, s04, s11 (no node row), 3
  (`07.png`).

## Measures

- **Steps:** 24 after the start (`02.png` to `25.png`). The graded end state (both files loaded,
  counts stated, the unmatched row named) is reached at step 15 (`15.png`); the success path is
  about 9 steps. Steps 10 to 14 (setting Direction and the weight) and 20 to 25 (putting names on
  the dots) were outside the task.
- **Wrong turns: 0.** She went straight to "New from data...", found the bare "+" beside Tables
  on the first try, and read the unmatched row before deciding. The extra steps were deliberate
  choices, not detours that failed:
    - Steps 10 to 14 (`10.png` to `14.png`): changed Direction from "As the file says" to Directed
      (no effect on the result: a CSV opened as the file says is already directed) and set passes
      as the weight with "Closer". The answer key asks graders to record a participant who stops to
      set the weight: she did.
    - Steps 21 to 25 (`21.png` to `25.png`): added a name label to every node. The answer key asks
      graders to record a participant who stops to put names on: she did.
- **False "done": none.** Her claim "11 players and 18 passes ... every one of the 18 pass rows
  arrived, because I chose 'Add'" matches the screen (`09.png`, `15.png`). She did not say every
  player was on the squad list: she named s11 as the one that did not fit and said the coach must
  identify him. Her spot check of Ana Torres's passes (s02 11, s03 9, s04 5, `18.png`) agrees
  with the file as far as she checked it. truth-on-screen: no wrong claim. Her phrase "11 players"
  counts s11 as a player, which she qualified in the same answer.
- **Self-rating** (5 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 2 (confirmed with r1-s34 and r1-s36, same task, same dot) -- s11, a guest with one
   pass, is drawn as the biggest dot in the middle of the team, and nothing on the drawing says
   why dots differ in size.** The session started empty and no size style was added (Everything's
   Size reads 1, `22.png`), so the size is the 3D view's perspective: s11 sits nearer the camera.
   She found that out only by opening Style and reading "Why this look: Node defaults" on s11
   (`21.png`), and said she would not hand the picture to anyone without a word on that dot. No
   wrong conclusion was drawn, so not a 4. Evidence: `15.png`, `20.png`, `21.png`, step 20 remark.
2. **Severity 2 (confirmed with r1-s34, r1-s35, r1-s36, r1-s37) -- no names on the dots after
   loading, and every list that names a node uses its id** (find results "s01", the Degree list
   "s02, s03, s04", the inspector title "s01"), although the name column came in. Outside the task
   per the answer key, but it cost her six steps and she called the unlabeled first look "not an
   answer for me". Evidence: `15.png`, `16.png`, `18.png`, `23.png`, `24.png`, debrief.
3. **Severity 2 (confirmed with r1-s33 to r1-s37) -- a whole-number column named "passes" comes in
   as an Attribute with "Weight: none (each edge counts 1)", and nothing on the import page says
   how to make it the weight.** She found it by opening the column's role list on a hunch. Once
   chosen, the "Higher means" explanation was clear to her, though its example is about emails.
   Evidence: `11.png`, `12.png`, `13.png`, `14.png`, debrief.
4. **Severity 2 -- after "Add", nothing on the loaded graph records that s11 was made from an
   unmatched pass row.** The import page's warning and the "1 left out" note disappear once Add
   is chosen (both tables show green ticks, `09.png`), s11 shows only "id s11, Degree 1"
   (`20.png`), and the drawing does not mark it. She knew only because she read the import page.
   Evidence: `09.png`, `20.png`, `25.png`, step 20 and step 25 remarks.
5. **Severity 1 -- "Direction: As the file says" is not explained.** The list offers As the file
   says, Directed and Undirected with no word on what a CSV "says"; she picked Directed to be sure.
   The default would have given the same result. Evidence: `10.png`, debrief.
6. **Severity 1 -- with "Show all labels" ticked, labels overlap** ("Bea Lund" covers the start of
   "Eve Grant"; "Dina Moss" runs into "Fay Osei"), so two names read as "...ve Grant" and "Dina
   Mossy Osei". Before ticking it, two labels were hidden with only "10 labels, 2 hidden" to say
   so. Outside the task. Evidence: `24.png`, `25.png`.
7. **Severity 1 (opinion) -- the "Closer" explanation's example is about emails** ("such as more
   emails between two people") on a passes file. Evidence: `14.png`.

Not seen in this session: she hovered "Add" and got "Make a node for each missing name"
(`08.png`), so the unlabeled Add / Leave out choice did not trip her; she read which was chosen
from the Tables list's "1 left out".
