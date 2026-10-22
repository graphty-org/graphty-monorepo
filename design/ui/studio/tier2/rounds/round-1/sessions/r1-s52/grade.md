# Grade: session r1-s52 -- Dev reads the Station-Stadium bus link and makes its two stops stand out (bus stops)

**Grade: S** (success). Dev answered 4 minutes, which is the answer key's value. He read it from
the screen: the edge inspector "Station -> Stadium" shows From Station, To Stadium, minutes 4
(`02.png`). He then made Station and Stadium, and no other stop, stand out. He used "Select
endpoints" to select exactly those two (`04.png`: "2 nodes selected", Nodes 2, "Edges joining
these nodes 1", Selection 2). Then he put a Fill color on that selection, which made a style layer
named "2 nodes" (color 6366F1). On the last screen (`08.png`), Station and Stadium are drawn
blue-purple and the other eight stops are still orange.

**A note on the answer key.** The key's S line for this task says "exactly the two ends selected at
the end". The final Escape cleared the selection, so a literal reading gives zero selected. The
grade is still S, for three reasons:

- The tier 2 failure code `not-marked` defines failure as "not distinguishable from the rest at
  the end (nothing selected, or a color that does not separate them)". A color that separates
  exactly the two stops is the opposite of that failure.
- T22, the other "stand out" task, accepts such a color as marking.
- The key grades other routes "by the end state". This route chose exactly the two stops through
  "Select endpoints" and made them stand out in a way that lasts.

The key's S line for T24 should name a color on exactly the two ends as S, so that graders agree.

Build seen: `946256efb876 graphty@0.8.56` (session.json), 1440 x 900, no uncommitted changes. That
is the frozen build the criteria name. The setup `bus-stops-ranked-names.txt` ran to its
documented end state: PageRank run, sizes and colors set by it, every name shown. The file chooser
line in setup.log is the setup's own upload step. Every step's screenshot matches its command. The
session is not void.

## What the last screen shows (`08.png`)

- Station and Stadium are filled blue-purple. All other stops keep their PageRank orange or brown.
  No selection ring is drawn.
- Left panel: Selection (no count), the "2 nodes" layer, PageRank 10, Everything.
- The legend on the canvas lists "Color: 2 nodes" with a purple swatch above Size: PageRank and
  Color: PageRank. It now covers the top of the "Depot" label, so only "epot" can be read.
- A toast reads "Selection cleared: 2 nodes". The inspector is back on Graph, Values.

## Measures

- **Clicked the line itself:** yes, on the first try (`--click-at 760,150`; the tool printed
  edge id 15, the key's edge). Dev's history says he had only ever clicked dots, so he guessed
  that a line could be clicked.
- **Steps:** 7 after the start. The success path takes 3 (line, Edge actions, Select endpoints).
  The other 4 (Style tab, add Fill, Color, Escape) are his own choice of a mark that lasts, not
  a detour.
- **Wrong turns: 0.**
- **False "done": none.** He claimed "Station and Stadium are now blue-purple and no other stop
  is". `08.png` shows exactly that. truth-on-screen: no wrong claim.
- **How he got from "the two on this tie" to "Select endpoints":** he looked in the inspector's
  "..." menu and guessed that "endpoints" meant the two stops at the ends of the line. The guess
  was right, but he called it a guess.
- **Self-rating** (6 of 7): not used in grading.

## Problems

Severity runs from 0 to 4 (Nielsen). Items 1 and 2 come from how the build draws things, not from
the words used, so they are the problems a dry run is meant to catch before a study.

1. **Severity 2 -- while the two stops are selected, a new color does not show as itself.** Right
   after Color was picked, Station and Stadium were drawn grayish-tan inside their yellow rings,
   not the 6366F1 purple shown in the swatch and the legend (`07.png`). The purple appeared only
   after Escape cleared the selection (`08.png`). The selection highlight blends with the fill, so
   the user cannot check the color they just chose on the elements they chose it for. Dev said:
   "For a second I thought the color hadn't worked." Someone less curious would undo it or pick
   another color. Build behavior: a scripted repro of select, then Fill Color, would confirm it.
2. **Severity 2 -- the canvas legend grows over a node label.** Adding the "Color: 2 nodes" entry
   made the legend taller. It now covers the top of the "Depot" label, which reads "epot"
   (`07.png`, `08.png`; the label was whole in `02.png` and `04.png`). Dev wants this figure for an
   essay, and he noticed the problem himself.
3. **Severity 1 -- the layer and its legend entry are named "2 nodes", not after what they hold.**
   The legend tells a reader of the figure only "2 nodes", not which two. Dev would rename it to
   "Station and Stadium" but did not know how (`07.png`, `08.png`, debrief).
4. **Severity 1 -- "Select endpoints" is not the user's word.** Dev had to guess that "endpoints"
   meant the two stops ("Select Station and Stadium" would have told him). The answer key expects
   this word gap (`05.png` of the pilot; this session's step 03 remark).
5. **Severity 1 -- nothing says whether a selection is enough to make things stand out.** The
   yellow rings already made the two stops stand out. Dev was unsure whether that counted, and he
   added a color only because "a selection goes away when you click elsewhere". This did not hurt
   the result (step 04 remark, debrief).
6. **Severity 0 -- the arrow in "Station -> Stadium" made him wonder whether the link runs one
   way.** The arrow is the file's column order. He wondered whether the other direction takes a
   different time, and moved on because the question did not ask (step 02 remark, debrief). The
   key records that the arrow is not a fact about the bus.

What worked: the line could be clicked on the first try. The inspector showed the file's own
column name ("minutes") with the value. "Select endpoints" selected exactly the two stops. A Fill
color on a selection made a lasting layer that touched only those two.

## What this says about the round

The task itself was done on the success path with no wrong turns. Two of the six problems are
rendering defects on the build, not wording or understanding: the selection tint hides a new fill
color, and the legend grows over a label. They are the kind of implementation flaw a pre-study
dry run is meant to clear. Here they cost a moment of doubt and a flawed figure, not the task. The
answer key's S line for T24 names only a selection, and it should also name a color on exactly
the two ends. As a returning user, Dev was helped by his history: he had colored things from a
Style tab before, which led him to add the color that lasts.
