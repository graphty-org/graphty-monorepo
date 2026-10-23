# Grade: session r1-s34 -- Tom, lab manager, puts the football coach's two spreadsheets together (players.csv + passes.csv)

**Grade: S** (success). Both files are in one drawn network, the counts are stated and right for
the choice he made, and he named the row that did not fit: line 17 of passes.csv, Dina Moss (s04)
passing 3 times to s11, who is not on the squad list. He chose "Add", so the load made 11 nodes
and 18 edges; the answer key accepts either Add (11 and 18) or Leave out (10 and 17) when the
participant says which row did not fit. He read the import page's report before loading, with no
detour.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every step's screenshot matches its command. The
session is not void.

One caveat on the evidence: the transcript says the participant read the study tool's own file
list before starting, which says one pass names a player not on the squad. He says he tried not to
act on it. He still found the row through the app's own report ("Show the 1 unmatched row",
`06.png`, `07.png`), so the grade stands, but this session is weak evidence that a user would
notice the unmatched row unprompted.

## What the last screen shows (`14.png`)

- The Graph page of "players and passes": 11 dots and 18 arrows drawn, the tie s01 -> s02
  selected (blue band), its inspector reading From s01, To s02, passes 11.
- The counts are on screen four steps earlier: Overview Nodes 11, Edges 18, Directed, Density
  0.1636, Components 1, "Edges per node 1 to 4, mean 3.273", header "From 2 files" (`10.png`).
- s11 is in the network: the find box lists "Nodes 1: s11" and "Edges 1: s04 -> s11" (`11.png`);
  selecting it shows id s11, Degree 1 (`12.png`).
- The players' attributes arrived: s01 shows name Ana Torres, position Keeper (`13.png`).
- Before Load the import page read "players and passes: 11 nodes, 18 edges", "10 node rows and 18
  edge rows read; the load makes 11 nodes and 18 edges", with the unmatched row shown as line 17,
  s04, "s11 (no node row)", 3 (`09.png`).

## Measures

- **Steps:** 13 after the start (`02.png` to `14.png`). The graded end state is reached at step 10
  (Load); steps 11 to 14 were his own checks that s11, the names and the pass counts arrived.
- **Wrong turns: 0.** He took "New from data..." first, found the "+" beside Tables, read the
  report, showed the unmatched row, hovered Add to read its tooltip before pressing it, and loaded.
- **False "done": none.** His closing claim, "11 dots and 18 pass lines, with names and positions
  on the players and the pass counts on the lines", matches the screens (`10.png`, `13.png`,
  `14.png`). He did not claim s11 has a name or position; he said it has none. truth-on-screen:
  no wrong claim.
- **Wrong answers avoided:** he did not load with the default "Leave out" and say every pass
  arrived (`false-done`); he did not stop to set a weight or put names on the dots (the answer key
  records both as outside the task; he remarked on both and moved on).
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). "Confirmed" means seen in two or more participants on this
round's T4 sessions.

1. **Severity 3 (confirmed: this session, r1-s35) -- "Leave out" is the preselected choice for an
   edge row that names a missing node, and which of Add and Leave out is chosen is shown only by a
   thin outline, with no words.** A user asked to bring in every pass who presses Load without
   reading gets 17 of 18 and no message on the Graph page. Tom says he nearly missed it and only
   the red triangle and "1 left out" in the Tables list made him look. Evidence: `06.png`,
   `07.png`, debrief ("I nearly missed that one would be dropped").
2. **Severity 2 (confirmed: this session, r1-s33, r1-s35) -- "Weight: none (each edge counts 1)"
   reads as if the pass counts are being thrown away, and nothing on the import page says what it
   means or how to make passes the weight.** He checked by clicking a tie after loading (passes 11
   was still there). Evidence: `06.png`, `14.png`, step 6 and step 13 remarks.
3. **Severity 2 -- the dot for s11, a guest with a single pass, is drawn as the biggest dot in the
   middle of the team, and nothing on screen says whether size means anything.** The session
   started empty and no style was added, so the size is most likely the 3D view's perspective
   (s11 nearer the camera); the participant could not tell
   that, and said he would not show the coach the picture without knowing. Opinion-led and no
   wrong conclusion was drawn, so held at 2. Evidence: `10.png`, `12.png`, step 12 remark.
4. **Severity 2 (confirmed: this session, r1-s33, r1-s35) -- no names on the dots by default**,
   so who is who, and which dot is the stranger, is found only by clicking or by the find box.
   Outside the task per the answer key, but it cost him three of his four checking steps.
   Evidence: `10.png`, `12.png`, `13.png`.
5. **Severity 1 -- after "Add" is pressed, the shown unmatched row still has the red warning sign
   and "s11 (no node row)"**, which made him doubt that Add had worked; the counts above it said
   it had. Evidence: `09.png`, step 9 remark.
6. **Severity 1 -- "Key", "Attribute" and "Direction: As the file says" are not explained**; he
   left them alone because he did not know what changing them would do. The defaults were right
   for this task. Evidence: `04.png`, `09.png`, debrief.
7. **Severity 1 -- a tie's inspector names its ends by id only ("s01 -> s02", From s01, To s02),
   not by the players' names**, so he had to remember who s01 and s02 were. Evidence: `14.png`.
8. **Severity 1 -- typing in the find box changes nothing on the drawing until a result is
   clicked.** Evidence: `11.png`, `12.png`.

What worked: the import page's running count ("the load makes 11 nodes and 18 edges"), the
"Show the 1 unmatched row" link that names the line, the sender, the missing node and the number,
and Add's tooltip "Make a node for each missing name" let a cautious first-time user of two-table
import decide knowingly. He called the count "what I always want".

## What this says about the round

No build defect showed up: every control did what the answer key says it does, and no step was
spent on a broken control or an implementation fault. The problems are design findings about the
preselected "Leave out", the unexplained weight line, and reading a 3D drawing with no labels.
