# Session r2-s22 -- Elena, task T17 (Les Miserables), returning user

Started with: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ ./with-browser.sh node real.mjs --start ../tier2/rounds/round-2/sessions/r2-s22 setup:lesmis-ranked.txt` (run from design/ui/studio/tool)

## Step 1 -- 01.png
I see the Les Miserables network, dots in orange sized by PageRank, which I remember from last time (the "rank who matters most" thing). I need only pairs sharing 5+ chapters. I don't know where that lives. The ties are the lines... I'll look in Data on the left, since chapters is data.
Command: `node real.mjs --step $S --click "Data"`

## Step 2 -- 02.png
The Data side shows "Les Miserables 77 nodes, 254 edges", a "Filters" row with a plus, and under Edges a column "shared_chapters". That's the chapters count. "Filters" sounds like what I want -- like filtering a spreadsheet. I'll press the plus next to Filters.
Command: `node real.mjs --step $S --click-at 276,285`

## Step 3 -- 03.png
A "New filter step" form opened on the right: Keep "an attribute's value", then an empty Attribute box, and a greyed "Add step" button. I'll open Attribute and look for shared_chapters.
Command: `node real.mjs --step $S --click "Attribute"`

## Step 4 -- 04.png
The list shows Nodes (id, name) and Edges (shared_chapters). I pick shared_chapters.
Command: `node real.mjs --step $S --click-at 1270,319`

## Step 5 -- 05.png
Now it says: shared_chapters, Is "at least", Value (empty), and "Keeps edges that pass and the nodes at their ends." That's exactly my sentence. I'll type 5 in Value.
Command: `node real.mjs --step $S --click "Value" --type "5"`

## Step 6 -- 06.png
Value shows 5 and "Add step" turned blue. Drawing hasn't changed yet. I'll press Add step.
Command: `node real.mjs --step $S --click "Add step"`

## Step 7 -- 07.png
The drawing shrank. Top bar says "26 of 77 nodes", the right side says "Nodes showing 26 of 77, Edges showing 51 of 254", and the left lists "shared_chapters is at least 5 -- 77 to 26 nodes" with a ticked box. So 26 characters are still in it. Now to bring everyone back: the tick box looks like an on/off switch, so I'll untick it rather than delete it (in case I need it again).
Command: `node real.mjs --step $S --click-at 274,326`

## Step 8 -- 08.png
Everything is back: the full drawing, the top bar no longer says "26 of 77", the right side says Nodes 77, and the step on the left now says "off". Done with the prompt: **26 characters** share 5 or more chapters with someone.

## Follow-up given: "Now the same for pairs who share 8 or more chapters: how many characters are in the drawing then? Bring every character back when you are done."

I'd rather change my existing step than make a new one. I'll click on the step's words to see if it opens for editing.
Command: `node real.mjs --step $S --click-at 180,320`

## Step 9 -- 09.png
It opened my step on the right with the same form, Value 5, and a button "Save and turn on". Nice -- I'll change 5 to 8.
Command: `node real.mjs --step $S --click "Value" --key Control+a --type "8"`

## Step 10 -- 10.png
Value now reads 8. I'll press "Save and turn on".
Command: `node real.mjs --step $S --click "Save and turn on"`

## Step 11 -- 11.png
Top bar "17 of 77 nodes", right side "Nodes showing 17 of 77, Edges showing 19 of 254", step now reads "shared_chapters is at least 8 -- 77 to 17 nodes". So **17 characters**. (The panel still says "Components 1" while I can see two separate clumps, but the line above says those counts are for the whole graph, so fine.) Now untick it to bring everyone back.
Command: `node real.mjs --step $S --click-at 274,326`

## Step 12 -- 12.png
All 77 characters are back, the step reads "off", and the top bar no longer shows a count. I'm done.
Command: `node real.mjs --end $S`

## Wrap-up (in character)

- **Did I finish?** Yes, both parts. 5 or more shared chapters: **26 characters** in the drawing. 8 or more: **17 characters**. Both times I brought every character back (77) by unticking the step.
- **Ease: 6 of 7.** I had never done this before, but Data -> Filters -> plus led straight to a form that read like a sentence ("Keep an attribute's value, shared_chapters, at least 5"), and the hint "Keeps edges that pass and the nodes at their ends" told me exactly what it would do. The count showed up in three places at once, so I was never unsure of the number. Changing 5 to 8 by clicking the step and pressing "Save and turn on" was easy.
- **What confused me:**
  - I had to guess that this lives under Data; nothing on the Graph side I started on pointed to it. I went there only because "chapters" felt like data.
  - The attribute is called "shared_chapters" with an underscore -- fine, but it is the file's name, not plain words.
  - The plus next to "Filters" is small and grey; I only tried it because it was the only thing near the word.
  - While only 17 were showing, the right panel still said "Components 1" though I could see two separate groups. A line said those counts are for the whole graph, so I let it go, but I had to read twice.
  - It wasn't obvious whether unticking the box would delete my step or just switch it off; it switched off (it says "off"), which is what I hoped.

## Session note
The first `--end` printed the follow-up request (8 or more chapters) word for word. I had already done that follow-up in steps 8-12, taking its wording from the task's follow-up line, so it was done before the tool handed it to me. The second `--end` closed the session.
Command: `node real.mjs --end $S` (run a second time)
