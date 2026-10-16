# Grade: session r1-s51 -- Ruth, back at the paper, reads one tie on the running club map and makes its two runners stand out (friends.csv)

**Grade: S** (success). The number is right and read from the screen: the edge inspector for the
line she clicked reads "Gus -> Ivan", From Gus, To Ivan, weight 1, and she answered 1 run
(`03.png`). At the end, Gus and Ivan, and nobody else, stand out on the drawing (`09.png`). She
reached the answer key's success path in full -- one click on the line, "Edge actions", "Select
endpoints", with exactly the two ends selected (`05.png`) -- and then went one step further: she
gave the two a color of their own through the selection's Style tab, then cleared the selection.

The end state is therefore a color, not a selection. The answer key's S names a selection, but
it also says other routes are graded by the end state, and its `not-marked` code counts the
elements as marked when they are selected or carry "a color that separates them". The last screen
shows a style layer "2 nodes" that paints exactly Gus and Ivan blue-purple (6366F1) while every
other person keeps the PageRank orange-brown, and the legend reads "Color: 2 nodes". That
separates exactly the two, and it survives a click elsewhere, which a selection does not. The
extra steps were not a detour: she had already met S at `05.png` and chose to make the mark
lasting. No missed click, no wrong tie opened.

Build seen: `946256efb876 graphty@0.8.56` (session.json), at 1440 x 900, no uncommitted changes.
This is the frozen build named in the criteria. Every step's screenshot matches its command, and
the setup ended on the Everything inspector as the answer key says. The session is not void.

## What the last screen shows (`09.png`)

- Gus and Ivan drawn blue-purple; every other node in the PageRank shading. Ivan's sphere is half
  hidden behind Hana's label and ball, but the purple shows above the label.
- Left list: Selection (no count), "2 nodes", PageRank 20, Everything.
- Legend: "Color: 2 nodes" with a purple square, above the two PageRank scales.
- Right panel back on the graph Overview: Nodes 20, Edges 41, Directed, Loaded weight "weight".
- No selection, no filter step; all 20 people still drawn.

## Measures

- **Clicked the line itself: yes, on the first try** (`--click-at 757,583`, the tool printed
  `edge with id "13"`, the same edge the answer key names). She hovered it once first (`02.png`)
  to check it was the Gus-Ivan line and not Gus-Hana, because the line seems to end at Hana's
  label.
- **Steps:** 8 after the start (`02.png` to `09.png`). The success path is 3 actions; steps 6 to 9
  are her extra color.
- **Wrong turns: 0.**
- **How she got from "the two on this tie" to "Select endpoints":** she read the menu and reasoned
  that the end points of a tie can only be its two people; she called the word jargon but guessed
  right (`04.png`, step 4).
- **Read Gus to Hana:** no. The inspector title "Gus -> Ivan" settled it for her.
- **False "done": none.** Her claims at step 9 and in the debrief (weight 1 read as 1 run; Gus and
  Ivan, and nobody else, colored purple; the color stays) all match `03.png` and `09.png`.
  truth-on-screen: no wrong claim. At step 8 she saw the drawing disagree with the legend and did
  not claim done until she had checked it (`08.png`, `09.png`).
- **Earlier work kept:** the PageRank run, its size and color, and the label line on Everything
  are all still there; the one new layer is her own.
- **Self-rating** (6 of 7) was not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen).

1. **Severity 2 (confirmed: this session and r1-s52, both on T24) -- right after a color is added
   to a selection, the selected nodes are drawn in the selection's own tint, not the new color, so
   the drawing disagrees with the swatch and the legend.** The swatch shows 6366F1 purple and the
   legend reads "Color: 2 nodes" with a purple square, while Gus and Ivan are drawn a dull
   gray-beige inside their yellow rings. Only after the selection is cleared do they show the
   purple. Ruth: "For a moment the picture disagreed with the legend, which is exactly what makes
   me distrust a tool." Both participants guessed the cause and cleared the selection to check; a
   reader who did not would leave believing the color had not taken. Evidence: `08.png`,
   `09.png`; r1-s52 transcript, the step after choosing Color.
2. **Severity 2 -- hovering a line gives a hand pointer but nothing else: the line does not change
   and no tooltip names the tie.** On this drawing the Gus-Ivan line appears to end at Hana's
   label box (a known overlap on the A drawing), and a second line out of Gus runs to Hana just
   below it, so she could not confirm from the hover which tie she was on. The inspector title
   resolved it after the click. Evidence: `02.png` (tool: `cursor: pointer, tooltip: null`), step
   2 remark.
3. **Severity 1 -- the new style layer is named "2 nodes", not after what it holds.** She said
   that with several of these she would lose track of which is which. Evidence: `08.png`,
   `09.png`, debrief. (Opinion, held one level down.)
4. **Severity 1 -- the tie's number is labeled "weight", the name of the file's column, with
   nothing saying what it counts.** She accepted it because it is her own sheet and said a
   colleague's sheet would leave her asking "weight of what?". Evidence: `03.png`, step 3 remark,
   debrief.
5. **Severity 1 -- "Select endpoints" is not a reporter's word.** She guessed it right from
   context. Evidence: `04.png`, step 4 remark, debrief.
6. **Severity 1 -- the "->" in "Gus -> Ivan" reads as a direction for a partnership that has
   none.** She explained it to herself as the sheet's column order. Evidence: `03.png`, step 3
   remark. (Known on this build.)
7. **Severity 1 -- labels and spheres overlap on the A drawing:** Hana's label covers the lower
   half of Ivan's sphere (and, after the color, half the purple), Chloe's label is over Farah's,
   and Eli's is mostly under Dev's. It did not mislead her here. Evidence: `01.png`, `09.png`.

What worked: a single click on a thin line hit it on the first try; the inspector named both
ends and the number at once; the "Edge actions" menu's "Select endpoints" did exactly what she
guessed; and the selection's Style tab let her turn a passing selection into a lasting, legended
color in two clicks.

## What this says about the round

No build defect blocked the task: every control on the success path did what the answer key
says. The one finding that touches the implementation is the first problem, the selection tint
covering a newly added color; it is how the drawing is composed (the selection look is drawn over
the layer's color), and it made two of the T24 participants doubt a result that was in fact
right. The rest are wording and labeling findings.
