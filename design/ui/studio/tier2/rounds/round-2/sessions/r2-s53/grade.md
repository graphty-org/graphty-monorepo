# Grade: session r2-s53 -- Jordan (returning regular analyst) reads one tie on the running club drawing and makes its two runners stand out (T24 A, friends.csv)

**Grade: S** (success).

- **The number is right and was read from the screen.** One click at the middle of the line
  (755,585; the tool printed `edge with id "13"`) opened the edge inspector "Gus -> Ivan", subtitle
  "Edge", Summary From Gus, To Ivan, weight 1, Selection row 1, the line drawn with a blue band
  (`02.png`). Jordan answered "1 run", the answer key's value.
- **Exactly Gus and Ivan stand out at the end.** Jordan took the key's success path to the
  selection ("Edge actions", "Select endpoints"; `03.png`), which left exactly the two with yellow
  halos, "2 nodes selected", Nodes 2, "Edges joining these nodes 1", Selection row 2 (`04.png`).
  That already met S. Jordan then gave the selection a color of its own (selection Style tab, "Add
  to Fill", "Color"; `05.png` to `07.png`), which made a style layer "2 nodes" (6366F1) painting
  only those two, and clicked empty canvas to check that it held (`08.png`).
- **Why a color counts.** The key's S line names a selection, but it grades other routes by the
  end state, and its `not-marked` code treats the elements as marked unless "nothing selected, or a
  color that does not separate them". On `08.png` Gus and Ivan are the only blue-purple nodes;
  every other runner keeps the PageRank orange-brown, and the drawing's key reads "Color: 2 nodes"
  with a purple square. That separates exactly the two and lasts past a click elsewhere. This is
  graded the same way as the other sessions that ended on the same state (round 2 r2-s51 and
  r2-s54; round 1 r1-s51). The steps after `04.png` were a choice to make the mark last, not a
  detour: no missed click, no wrong tie opened, nothing undone.

Run: build `8f0d5a6f7791 graphty@0.8.61` (`session.json`), the frozen build the criteria name, no
uncommitted changes, 1440 x 900. The setup `friends-ranked-names.txt` ran to its end: the start
shows every name drawn and the key "Size: PageRank" and "Color: PageRank", both 0.03779 to 0.06394,
as the key says (`01.png`, `02.png`). Every step's screenshot matches its command. Not void.

## What the last screen shows (`08.png`)

- Gus and Ivan drawn blue-purple; the other 18 runners in the PageRank shading. Ivan's sphere is
  half covered by Hana's label box, but its purple shows above the label.
- Left list: Selection (no count), "2 nodes", PageRank 20, Everything.
- Key (top left): "Color: 2 nodes" with a purple square, above "Size: PageRank" and "Color:
  PageRank", both 0.03779 to 0.06394.
- Right panel on the graph Overview: Nodes 20, Edges 41, Directed, Loaded weight "weight".
- No filter step; all 20 runners drawn. `work.json`: the PageRank run and every starting layer are
  still there, plus the one new layer "2 nodes"; nothing gone.

## Measures

- **Clicked the line itself: yes, first try** (`--click-at 755,585`, `02.png`), with no hover
  first.
- **Steps:** 7 after the start (`02.png` to `08.png`). The success path is 3 actions after the
  read; steps 4 to 7 are Jordan's own color and check.
- **Wrong turns: 0.**
- **How Jordan got from "the two on this tie" to "Select endpoints":** opened the "..." at the top
  of the tie's panel to see what it offered, read "Select endpoints" as "the two people at the ends
  of this tie", and called the word "techy" (step 2).
- **Read the tie as Gus to Hana:** no; the inspector title "Gus -> Ivan" settled which tie it was.
- **False "done": none.** The claims -- weight 1 is one run together; Gus and Ivan, and nobody
  else, are purple; the color stays after the selection goes -- all match `02.png` and `08.png`. No
  `truth-on-screen` claim.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity 0-4 (Nielsen). Opinion-only findings are held one level down.

1. **Severity 2 -- selecting the two ends gives only a yellow halo that goes away on the next
   click; making them stand out for good takes four more actions in another tab (Style, Fill +,
   Color).** Nothing in the selection's Values view points to coloring it. Jordan knew the Style
   tab from coloring by group before; a user who did not would stop at the halo or lose it on the
   next click. Evidence: `04.png` to `07.png`, step 3 remark, debrief ("The glow goes away as soon
   as I click anywhere else"). Also seen in r2-s51 and r2-s54, so confirmed.
2. **Severity 1 -- the new style layer is named "2 nodes", which says nothing about which two, and
   Jordan found no way to rename it.** It reads so in the left list and in the drawing's key, which
   is what a reader of the slide sees. Evidence: `07.png`, `08.png`, step 6 remark, debrief.
   (Opinion; also raised in r2-s51 and round 1.)
3. **Severity 1 -- "Select endpoints" is engineering language, and it sits only in the "..."
   menu.** Jordan guessed right ("I guess it means the two people at the ends") and suggested
   "Select both people". Evidence: `03.png`, step 2 remark, debrief. (Opinion.)
4. **Severity 1 -- the tie's title "Gus -> Ivan" draws an arrow, so a shared activity reads as
   one-way.** Jordan noticed it ("as if one of them ran with the other and not both together") and
   let it go; it did not change the answer. The arrow is the file's column order (known on this
   build). Evidence: `02.png`, debrief. (Opinion.)
5. **Severity 1 -- the tie's number is labeled "weight", the column's name, with nothing saying
   what it counts.** Jordan knew it was runs together from the sheet. Evidence: `02.png`, debrief.
   (Opinion; also raised in r2-s51 and round 1.)
6. **Severity 1 -- labels overlap spheres and each other on this drawing:** Hana's label box
   covers the lower half of Ivan's sphere (and of its purple at the end), Chloe's label is over
   Farah's, and only the "E" of Eli's shows under Dev's. It did not mislead Jordan here. Evidence:
   `01.png`, `08.png`. (Known on this build.)
7. **Severity 0 -- the color was chosen for the participant (6366F1) with no prompt to pick
   one.** It separated the two well from orange. Evidence: `07.png`.

## Implementation issues hit

None. Every control on the path did what the answer key says, with no error, no missed click and
no control that failed to respond. Every problem above is about wording, discoverability or how
the drawing is composed, not a defect that blocked or misled the participant.
