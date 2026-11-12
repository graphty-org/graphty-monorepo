# Session r1-s19 transcript (Dana Okafor)

Task: pairs with more than one shared shift count as worked together; color orange everyone who worked with more than two different people; report the count.

## Step 1 (start)
Command: real.mjs --start <folder> setup:volunteers-shifts.txt
Saw: the volunteer shifts file is already open, 24 people, 63 links. Last month I filtered in the Data place, so I'll go there to drop the one-shift pairs first.

## Step 2
Command: --step --click "Data"
Saw: Data place with Data sources, Attributes and a Filters row with a plus. That's where I filtered last month.

## Step 3
Command: --step --click-at 276,397 (plus next to Filters)
Saw: a filter editor opened, with Nodes and Edges tabs and a list of node columns. The shifts are about pairs, so they should be under Edges.

## Step 4
Command: --step --click "Edges"
Saw: Edges tab, 63 of 63, table shows a "shifts" column. Good. I'll open the Value... dropdown and pick shifts.

## Step 5
Command: --step --click-at 1280,124
Saw: list shows "shifts 1 to 5" under Data. Picking it.

## Step 6
Command: --step --click-at 1186,220
Saw: a range 1 to 5 with the low box focused. More than one shift means 2 and up, so I set the low end to 2.

## Step 7
Command: --step --key Control+a --type "2" --key Enter
Saw: "shifts min 2", 31 of 63 links kept, 32 one-shift pairs out. Top bar says 24 nodes, 31 of 63 edges. Clicking Done.

## Step 8
Command: --step --click "Done"
Saw: the picture now has only 31 links; the Degree box on the right went to 1 to 5, so it seems to count only the kept links. Now I need to paint people with 3 or more in orange. Never done that; I'll try the Graph place's Style layers plus.

## Step 9
Command: --step --click "Graph" (left rail)
Saw: Style layers list with a plus. Clicking it to add a layer.

## Step 10
Command: --step --click-at 276,122
Saw: menu with Layer, Folder, Hover highlight, Analyze. Layer sounds like "paint some of them".

## Step 11
Command: --step --click "Layer"
Saw: "Layer 1" made, "Which nodes: All nodes, 24 of 24" on the right. I need to narrow it to people with 3+ partners. Clicking "Which nodes".

## Step 12
Command: --step --click "Which nodes"
Saw: same kind of picker as the filter. "Degree" is there - the number of people each person is tied to, I think. Picking it.

## Step 13
Command: --step --click-at 950,340
Saw: Degree range 1 to 5 - same as the right panel after my filter, so it counts only the 2+ shift pairs. "More than two" means 3 and up; setting low end to 3.

## Step 14
Command: --step --key Control+a --type "3" --key Enter
Saw: "Degree min 3", 11 of 24 match, 13 no match. I count 11 green dots too. Clicking Done, then I'll give them a fill color.

## Step 15
Command: --step --click "Done"
Saw: Layer 1 now covers 11 people. Nothing changed color yet. Clicking the plus next to Fill.

## Step 16
Command: --step --click-at 1404,401
Saw: a Color box appeared under Fill, empty and highlighted. I'll click it and see if it gives me swatches.

## Step 17
Command: --step --click-at 1312,435
Saw: just a text cursor, no swatches. I'll type "orange" like in Excel and press Enter.

## Step 18
Command: --step --type "orange" --key Enter
Saw: it took "orange" and turned it into FFA500. Eleven dots went orange, and a key at top left says "Color: Layer 1, 11 of 24 nodes". I counted 11 orange dots on the picture myself. Done; not ending the session (facilitator ends it).

## Wrap-up (in character, Dana)
- Did I finish? Yes. Answer: 11 people are in orange.
- How I did it: Data place -> Add filter -> Edges -> shifts, minimum 2 (31 of 63 pairs kept). Then Graph place -> Style layers plus -> Layer -> Which nodes -> Degree, minimum 3 (11 of 24) -> Fill plus -> typed "orange".
- Ease: 6 out of 7.
- What confused me or slowed me down:
  - "Degree" is a word I don't use. I guessed it meant "how many people they're tied to". I only trusted it counted the filtered pairs because the range dropped to 1-5, matching the Values panel after my filter. Nothing on screen says "counted on the 31 links showing, not all 63" - if I hadn't noticed that, I'd be guessing.
  - The color box opened with no swatches, just a blank text field. Typing "orange" worked, but I only tried it because I had nothing else to try.
  - "Which nodes", "nodes", "edges" - the tool's words, not mine, but the counts next to them (11 of 24) made it clear enough.
  - The slider minimums are "at least", so "more than one shift" = 2 and "more than two people" = 3; I had to do that translation in my head. A "more than" option would help.
- Would I trust it for my supplier work? The filter-then-count flow is something I'd use (suppliers with 3+ parts that have >1 source). Still want to know if I can get this list out to Excel.

## Follow-up
Question: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Answer (Dana): 2. Mostly calm - the filter was where I left it last month, and the counts next to everything (31 of 63, 11 of 24) told me I was on track. The moment I was least sure was right after I clicked the plus next to Fill on Layer 1. A "Color" box showed up under Fill, empty and highlighted, and when I clicked into it I got just a blinking text cursor - no swatches, no palette, nothing to pick from. The picture behind it still had all 24 dots in their old colors, so nothing told me what the box wanted. I typed "orange" because that's what I'd do in Excel and I had nothing else to try; it turned it into FFA500 and the eleven went orange. If that hadn't worked I'd have been stuck, because I didn't know whether it wanted a name, a code, or something else. A smaller wobble was step 8: after the filter I had to guess that "paint some people" lived in the Graph place under Style layers - I'd never done it, and nothing in the Data place pointed me there.
