# Session r5-s14b -- Dev, returning

Task: keep only pairs who share 5 or more chapters, say how many characters remain, then bring every character back.

Every command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs <action> tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s14b <step>` (below, only the action and step are shown).

## 01.png (session started for me)

Okay, Les Miserables is open, colored and sized by PageRank from last time. I need to keep only the strong ties. In the tutorial that is "Filters". The bottom toolbar has an icon that looks like a funnel (three lines getting shorter). I'll try that.

## Step 1 -- `--step --hover-at 833,863` (02.png)
Tooltip says "Filters". That is exactly the tutorial word. Good.

## Step 2 -- `--step --click "Filters"` (03.png)
The Data panel opened on the left, with a Filters section, and on the right a "New filter step" form: Keep "an attribute's value", Attribute (empty), Add step (greyed). I'll pick the attribute.

## Step 3 -- `--step --click "Attribute"` (04.png)
List shows Nodes: id, name; Edges: shared_chapters. shared_chapters is the chapter count on each tie.

## Step 4 -- `--step --click "role=option:shared_chapters"` (05.png)
Now "Is: at least" and an empty Value box, with the line "Keeps edges that pass and the nodes at their ends." That is what I meant: ties with 5 or more, plus the people on them.

## Step 5 -- `--step --click "Value" --type "5"` (06.png)
Typed 5.

## Step 6 -- `--step --click "Add step"` (07.png)
Wait -- oh nice. The top bar says "26 of 77 nodes, 51 of 254 edges", the step in the Filters list reads "shared_chapters is at least 5 / 77 to 26 nodes, 254 to 51 edges", and the right panel says Nodes showing 26 of 77. The legend even says "PageRank, full graph", so the colors did not get recalculated. Answer: 26 characters.

## Step 7 -- `--step --click-at 274,335` (08.png)
Unticked the checkbox "Apply step: shared_chapters is at least 5". Everyone is back: 77 nodes, 254 edges, and the step stays in the list marked "off", so I can show it later.

## `--end` -- answered with a further request
"Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done."

## Step 8 -- `--step --click-at 180,320` (09.png)
Clicked my old step: it opens for editing with "Save and turn on". I could change 5 to 8, but I'd rather keep the 5 one as proof.

## Step 9 -- `--step --click-at 276,285` (10.png)
The + next to Filters is "Add filter step". Blank form again.

## Step 10 -- `--step --click "Attribute" --click "role=option:shared_chapters" --click "Value" --type "8"` (11.png)
shared_chapters, at least, 8. Add step is blue now.

## Step 11 -- `--step --click "Add step"` (12.png)
"17 of 77 nodes, 19 of 254 edges". The new step says "77 to 17 nodes, 254 to 19 edges". The 5 step is still off, so this is only the 8 rule. Answer: 17 characters.

## Step 12 -- `--step --click-at 274,379` (13.png)
Unticked the 8 step. Back to 77 nodes, 254 edges; both steps listed as "off".

## `--end` -- session ended.

## At the end, in character

Did I finish? Yes. At 5 or more shared chapters, 26 of the 77 characters are left (51 of 254 ties); at 8 or more, 17 characters (19 ties). Both times I brought all 77 back by unticking the step.

Essay sentence: "Keeping only pairs of characters who share at least 5 chapters leaves 26 of the 77 characters (51 of 254 ties); at 8 or more it leaves 17."

Ease: 7 out of 7. The funnel button was called Filters, the same word as my tutorial. The form spelled out what it does ("Keeps edges that pass and the nodes at their ends"), and the count showed up in three places at once.

What confused me: almost nothing. For a second I wondered whether to edit the old step or add a new one. Adding a new one kept both as proof, which I liked. I didn't check whether two steps that are both on combine with "and" or "or". Small worry: the legend still shows the PageRank range of the full graph, not of the 26 who are left. It does say "full graph", so I think that's intended.
