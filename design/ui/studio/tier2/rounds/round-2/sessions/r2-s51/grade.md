# Grade: session r2-s51 -- Alex (returning regular analyst) reads one tie on the running club drawing and makes its two runners stand out (T24 A, friends.csv)

**Grade: S** (success).

- **The number is right and was read from the screen.** One click on the line opened the edge
  inspector "Gus -> Ivan" (subtitle "Edge"), Summary From Gus, To Ivan, weight 1, Selection row 1,
  the line drawn with a blue band (`03.png`). Alex answered "ran together once (weight 1)", the
  answer key's value.
- **Exactly Gus and Ivan stand out at the end.** He took the key's success path in full -- the
  line, "Edge actions", "Select endpoints" -- and reached exactly the two ends selected ("2 nodes
  selected", Nodes 2, "Edges joining these nodes 1", Selection 2, yellow halos on Gus and Ivan
  only, `05.png`). He then gave the selection a Fill color, which made a style layer "2 nodes"
  (6366F1) painting only those two, and clicked empty canvas to clear the selection (`09.png`).
- **Why a color counts.** The key's S line names a selection, but it also grades other routes "by
  the end state", and its `not-marked` code counts the elements as marked unless "nothing selected,
  or a color that does not separate them". On `09.png` Gus and Ivan are the only blue-purple nodes;
  every other runner keeps the PageRank orange-brown, and the key reads "Color: 2 nodes" with a
  purple square. That separates exactly the two, and it lasts past a click elsewhere. This follows
  the grades of the same end state in round 1 (`../../../round-1/sessions/r1-s51/grade.md`,
  `r1-s52/grade.md`). He had already met the selection form of S at `05.png`; the extra steps were
  a choice, not a detour.

Run: build `8f0d5a6f7791 graphty@0.8.61` (`session.json`), the frozen build the criteria name, no
uncommitted changes, 1440 x 900. The setup `friends-ranked-names.txt` ran to its end (the start,
`01.png`, shows the PageRank key 0.03779 to 0.06394 and every name drawn, as the key says). Every
step's screenshot matches its command. Not void.

## What the last screen shows (`09.png`)

- Gus and Ivan drawn blue-purple; all other 18 runners in the PageRank shading. Ivan's sphere is
  half covered by Hana's label box, but its purple shows above the label.
- Left list: Selection (no count), "2 nodes", PageRank 20, Everything.
- Key (top left): "Color: 2 nodes" with a purple square, above "Size: PageRank" and "Color:
  PageRank", both 0.03779 to 0.06394.
- Right panel on the graph Overview: Nodes 20, Edges 41, Directed, Loaded weight "weight".
- No filter step; all 20 runners drawn. `work.json`: the PageRank run and every starting layer are
  still there, plus the one new layer "2 nodes"; nothing gone.

## Measures

- **Clicked the line itself: yes, first try** (`--click-at 757,582`, `03.png`). He hovered it once
  first (`02.png`) hoping for a tooltip.
- **Steps:** 8 after the start (`02.png` to `09.png`). The success path is 3 actions after the
  read; steps 6 to 9 are his own color.
- **Wrong turns: 0.**
- **How he got from "the two on this tie" to "Select endpoints":** he opened the "..." menu to see
  what was there and read "Select endpoints" as "that's Gus and Ivan" (step 4).
- **Read the tie as Gus to Hana:** no; the inspector title "Gus -> Ivan" settled which tie it was.
- **False "done": none.** His claims -- weight 1 is one run together; Gus and Ivan, and nobody
  else, are blue; the color stays after the selection goes -- all match `03.png` and `09.png`. No
  `truth-on-screen` claim.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down.

1. **Severity 2 -- hovering a line gives a hand pointer and nothing else: no tooltip names the tie
   or its number, and the line does not change.** He had to click to learn which tie it was and
   its value. On this drawing that matters more than usual: the Gus-Ivan line stops at Hana's label
   box and a second Gus line runs to Hana just below it, so the hover cannot confirm the tie.
   Evidence: `02.png` (tool: pointer cursor, no tooltip), step 2 remark, debrief. Also seen in
   round 1 (r1-s51), so confirmed.
2. **Severity 2 -- selecting the two ends gives only a faint yellow halo, and making them "stand
   out" for real takes five more actions in a different place (Style tab, Fill +, Color).** Nothing
   in the selection's Values view points to coloring it. Against the orange PageRank fill the halo
   is easy to miss (`05.png`), and it disappears on the next click elsewhere. He knew the Style tab
   from Everything; a user who did not would stop at the halo. Evidence: `05.png` to `08.png`, step
   5 remark, debrief ("Five clicks for 'highlight these two' is more than I'd like if I did it
   weekly").
3. **Severity 1 -- the new style layer is named "2 nodes", which says nothing about which two.**
   It appears so in the left list and in the drawing's key, which is what a reader of the picture
   sees. Evidence: `08.png`, `09.png`, step 8 remark, debrief. (Opinion; also raised in round 1.)
4. **Severity 1 -- "Select endpoints" sits only in the "..." menu.** He found it because he was
   looking for it; he called it the obvious next step after reading a tie. Evidence: `04.png`,
   debrief. (Opinion.)
5. **Severity 1 -- the tie's number is labeled "weight", the column's name, with nothing saying
   what it counts.** He knew it meant runs together; he said a colleague reading "weight 1" would
   not. Evidence: `03.png`, step 3 remark, debrief. (Opinion; also raised in round 1.)
6. **Severity 1 -- labels overlap spheres and each other on the A drawing:** Hana's label box
   covers the lower half of Ivan's sphere (and of its purple at the end), Chloe's label is over
   Farah's, and only the "E" of Eli's shows under Dev's. It did not mislead him here. Evidence:
   `01.png`, `09.png`. (Known on this build.)
7. **Severity 0 -- the color was chosen for him (6366F1) with no prompt to pick one.** It happened
   to separate the two well from orange; he only remarked on it. Evidence: `08.png`, debrief.

The round 1 finding that a newly added color was hidden under the selection's own tint until the
selection was cleared does not appear on this build: right after Color, Gus and Ivan show the
purple inside their yellow halos, matching the swatch and the key (`08.png`).

## Implementation issues hit

None. Every control on the path did what the answer key says, with no error, no missed click and
no control that failed to respond. Every problem above is about wording, discoverability or how the
drawing is composed, not a defect that blocked or misled him.
