# Session r1-s23 -- Analyst Alex

Task: in the Graph researchers network, take everyone with fewer than 10 co-authorship ties out of the picture, then keep only the one big tangle (drop stranded people and small bunches). Nothing deleted. Report how many people remain.

## Step 1 (start)
Command: REAL_DIST=... REAL_TIER=5 node .../real.mjs --start <session> setup:researchers.txt
Screenshot 01.png. Alex: "Right, Graph researchers, 549 nodes, 2,084 edges, one component. There's a '369 repeated edges' line -- hm, does that count as ties? Degree goes up to 111. There's a funnel-looking icon in the bottom toolbar; that's where I'd expect filters. Let me try it."

## Step 2
Command: --step <session> --click-at 832,391  (the "Filters" button)
Screenshot 02.png. Alex: "OK, it jumped me to Data with a 'New filter' and a picker open: Node id, name, Degree, then Betweenness etc. Degree is what 'co-authorship ties' means. Picking Degree."

## Step 3
Command: --step <session> --click "Degree"
Screenshot 03.png. Alex: "Degree filter with a histogram and a range 1 to 111. Cursor's in the 'from' box. I'll set it to 10 -- fewer than 10 goes out, so 10 and up stays."

## Step 4
Command: --step <session> --click-at 1203,298 --key Control+a --type "10" --key Enter
Screenshot 04.png. Alex: "Good: top bar says 112 of 549 nodes, 896 of 2,084 edges. 437 'No match'. The rest are faded, not deleted. Now the big-tangle part. In Gephi that's the Giant Component filter chained under this one. I see 'Condition...' and 'Or...' up top -- I don't want Or. I'll finish this filter with Done and look for a way to add a second one to the chain."

## Step 5
Command: --step <session> --hover "Condition..."
Screenshot 05.png. Tooltip: none. Alex: "No hover hint. Fine, I'll just click 'Condition...' -- maybe it adds an AND condition."

## Step 6
Command: --step <session> --click "Condition..."
Screenshot 06.png. Alex: "It added a second line under 'Degree min 10' with a value picker. I'll type 'component' in the search instead of scrolling."

## Step 7
Command: --step <session> --click "Find attributes, results" --type "component"
Screenshot 07.png. Alex: "Three hits: 'Connected components: Piece', '...: Piece size' and, under Structure, 'Largest component'. That last one is Gephi's Giant Component. Picking it."

## Step 8
Command: --step <session> --click "Largest component"
Screenshot 08.png. Alex: "Hm. Still 112 of 549. Nothing changed. But I can see green dots down in that bottom clump and in the little bunch on the right -- those look stranded from the main tangle once the low-degree people are gone. My guess: it's taking the largest component of the WHOLE graph, which is everyone (Components: 1). In Gephi you'd drag Giant Component as a sub-filter so it runs on what's left. Let me Done this and try adding a second filter card with the + next to Filters."

## Step 9
Command: --step <session> --click "Done"
Screenshot 09.png. Alex: "Now the picture only shows the 112. And yes -- there's a little triangle bunch off to the right and a lone dot near it, separate from the main tangle. So 'Largest component' did nothing; 112 still includes stragglers. The card says 'Degree min 10 / Largest component' as if both are applied, which is misleading. Let me try a separate filter with the + next to Filters, hoping a second card runs on what the first one left."

## Step 10
Command: --step <session> --hover-at 276,397
Tooltip "Add filter". Alex: "Add filter. Clicking it."

## Step 11
Command: --step <session> --click "Add filter"
Screenshot 11.png. Alex: "Second card 'New filter'. But its header says 549 of 549 and the preview shows everyone again -- so it doesn't look like it starts from the first filter's 112. Also the first card now just says 'Degree min 10', the Largest component line isn't shown. Let me try Largest component here anyway and watch the top-bar count."

## Step 12
Command: --step <session> --click "Find attributes, results" --type "largest" --click "Largest component"
Screenshot 12.png. Alex: "Second card: Largest component, 549 of 549. Overall still 112 of 549. So it really is the largest component of the full graph, which is everybody. That's not what I want. Let me check the '...' menu on this filter for something like 'apply to the filtered graph'."

## Step 13
Command: --step <session> --click-at 1411,100  ("More for Largest component")
Screenshot 13.png. Alex: "Select 549, Duplicate, Delete. Nothing about running on what's left. OK, I'll close this, keep the cards, and try running Connected components myself from the flask (Analyze) button -- maybe it can run on just the people showing."

## Step 14
Command: --step <session> --key Escape --click "Done"
Screenshot 14.png. Alex: "Two cards: 'Degree min 10 -- 112 of 549' and 'Largest compon...' with no count. Total still 112. The right panel tells me Components = 1 but only for the Full graph, not for what's showing -- that's the number I actually want. Trying the flask button."

## Step 15
Command: --step <session> --click-at 615,391  (Analyze)
Screenshot 15.png. Alex: "Analysis list with a search box. The Largest component card now reads 549 of 549, confirming it's the whole graph. Typing 'connected' to find Connected components."

## Step 16
Command: --step <session> --type "connected"
Screenshot 16.png. Alex: "'Connected components -- which parts of the graph are cut off from each other.' Clicking it to see if it asks whether to use just the showing nodes."

## Step 17
Command: --step <session> --click-at 530,494
Screenshot 17.png. Alex: "Only a 'Connected: Either direction' choice and 'Under a second'. Nothing saying whether it uses the 112 showing or everyone. I'll Run and see if it finds more than one piece."

## Step 18
Command: --step <session> --click "Run"
Screenshot 18.png. Alex: "Now we're talking: Group 1, Group 2, Group 3 and '12 more below' -- so 15 pieces among the 112, which means this one DID run on just the people showing (the full graph has 1 component). Main tangle is orange (Group 1), the right triangle is blue, a lone dot is teal. Orange/teal fine for me. Now I'll change the second filter card from 'Largest component' to keep only Group 1. Clicking that card."

## Step 19
Command: --step <session> --click-at 155,489
Screenshot 19.png. Alex: "Editing the card. The preview table now has a Connected components column: Group 1 for the kept people, blank for the ones the degree filter took out. Good, so it really is the result on the 112. I'll switch the value from 'Largest component' to that Connected components column."

## Step 20
Command: --step <session> --click-at 1280,154
Screenshot 20.png. Alex: "There's a 'Results' section now: 'Connected components -- 3 values' and 'Piece size -- 2 to 105'. So three pieces, the biggest 105. (The legend's '12 more below' must have been something else.) Picking Connected components."

## Step 21
Command: --step <session> --click-at 1235,363  (option "Connected components, 3 values")
Screenshot 21.png. Alex: "Wait. It now says 'Connected components: Piece' with just one checkbox, 'Group 1 -- 549'. That's everybody, the whole-graph version. The table now shows TWO columns: 'Connected components (visible)' and 'Connected components'. I picked the one that said 3 values and got the one with 1 value? I want the '(visible)' one. Opening the picker again."

## Step 22
Command: --step <session> --click-at 1280,154
Screenshot 22.png. Alex: "Now the list has TWO 'Connected components' (3 values / 1 value) and two 'Piece size' (2 to 105 / 549 to 549), same names, no '(visible)' tag like the table had. Picking the '3 values' one -- again."

## Step 23
Command: --step <session> --click-at 1235,363  (option "Connected components, 3 values")
Screenshot 23.png. Alex: "Same thing -- Group 1, 549. Picking the '3 values' one lands me on the whole-graph version every time. That's exactly the kind of thing that ends up in a report wrong. Let me try the 'Piece size 2 to 105' one instead and keep only the biggest piece by size."

## Step 24
Command: --step <session> --click-at 1280,154 --click-at 1197,387  (option "Piece size, 2 to 105")
Screenshot 24.png. Alex: "And again: 'Piece size' 549 to 549. Whichever one I click, it takes the whole-graph column. The two entries have the same name, so I can't even tell it apart except by the little '3 values' hint, and that hint lies. Let me peek at Advanced before I give up on this route."

## Step 25
Command: --step <session> --click "Advanced"
Screenshot 25.png. Alex: "There it is, hidden under Advanced: 'Computed on: Full graph / So far'. 'So far' must mean on what the earlier filter left. That's the Gephi sub-filter idea. Should've been up front -- I only opened Advanced because the basic path failed. Clicking 'So far'."

## Step 26
Command: --step <session> --click "So far"
Screenshot 26.png. Alex: "'So far' is selected, 'So far' even shows next to Advanced. But the range still reads 549 to 549 and the count is still 112. Is it doing anything? I'll give it a couple of seconds."

## Step 27
Command: --step <session> --wait 3000
Screenshot 27.png. Alex: "Nothing moved. Still 549 to 549, still 112. Maybe 'So far' only matters for the built-in 'Largest component'. Switching the value back to Largest component with So far still on."

## Step 28
Command: --step <session> --click-at 1280,154 --type "largest" --click "Largest component"
Screenshot 28.png. Alex: "Largest component has no Advanced at all, so no 'So far'. Still 112. One more go: Piece size again, make sure So far is on, and type a minimum myself -- say 50 -- in case the box just didn't refresh."

## Step 29
Command: --step <session> --click-at 1280,154 --click-at 1197,387  (Piece size, 2 to 105)
Screenshot 29.png. Alex: "Piece size, 549 to 549, 'So far' remembered next to Advanced. The boxes look greyed. Trying to type 50 in the 'from' box anyway."

## Step 30
Command: --step <session> --click-at 1203,212 --key Control+a --type "50" --key Enter
Screenshot 30.png. Alex: "Huh. The right side went blank except 'Condition... Or...'. On the left there's a sub-line 'Connect... m... So far', truncated. Still 112 in the top bar. Clicking that sub-line to see what it says."

## Step 31
Command: --step <session> --click-at 400,132
Screenshot 31.png. Row reads "Connected components: Piece size min 50, So far, 549 of 549 nodes so far". Alex: "Min 50, 'So far', and it still says 549 of 549 'so far'. So 'So far' is on and it STILL uses piece sizes from the whole graph, where there's one piece of 549. Top bar still 112. I've gone round this four times now. I'll hit Done and take stock."

## Step 32
Command: --step <session> --click "Done"
Screenshot 32.png. Alex: "Back on the graph: top bar still '112 of 549 nodes, 896 of 2,084 edges'. The blue triangle on the right and the lone teal dot are still in the picture. The table now has 'Connected components (visible)' and 'Connected components (whole graph)' as separate columns -- in the table they're named apart, in the filter picker they're not, and the filter keeps grabbing the whole-graph one. I'm stopping here; I've gone round the same loop four times."

## End of session (in character)

**Did I finish?** Half. The first part worked: degree 10 or more leaves 112 of 549 people (896 of 2,084 edges), nobody deleted, the rest just faded out. The second part I could NOT get into the picture. The stragglers (a little triangle bunch and a lone dot) are still showing. If you make me give a number, the filter picker hinted 'Piece size 2 to 105' for the pieces among the people showing, so the big tangle is probably 105 people. But the picture never showed me 105, so I wouldn't put that in a deck. What the screen shows is 112.

**How easy, 1 (very difficult) to 7 (very easy):** 2. The degree step was fine, under a minute. The big-tangle step ate the rest of the session and I didn't get it.

**What confused me:**
- 'Largest component' as a filter means the largest piece of the WHOLE graph, which here is everybody. So adding it does nothing, but the card still lists it under 'Degree min 10' as if it were doing something. In Gephi the Giant Component sub-filter runs on what's left -- that's what I expected.
- After I ran Connected components on the people showing, the filter picker had two entries both called 'Connected components' (3 values / 1 value) and two called 'Piece size' (2 to 105 / 549 to 549). Clicking the '3 values' one gave me the '1 value' one -- Group 1, 549 -- every time. Picking 'Piece size 2 to 105' gave me 549 to 549. The table names them '(visible)' and '(whole graph)'; the picker doesn't.
- 'Computed on: Full graph / So far' is buried under Advanced. I found it only because the basic path had failed. Even with 'So far' on, the piece-size filter still said '549 of 549 nodes so far' and the count stayed at 112. 'Largest component' has no Advanced at all, so no 'So far' for it.
- Nothing told me the component condition hadn't changed anything. I only spotted it because I could see stray dots on the picture.
- The right-hand Values panel shows Components = 1 only for the full graph. The number I actually wanted was how many pieces are left in what's showing.
- The second filter card, when I added it, started from 549 of 549, not from the first card's 112. So I couldn't tell whether cards stack on each other.

## Follow-up

**Facilitator:** "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

**Alex:** "5. The degree part was calm -- maybe a 2 on its own. It climbed once I got to the big-tangle part, and by the end I did want to walk away; I stopped because I'd gone round the same loop four times.

The moment I was least sure was right after I picked 'Connected components -- 3 values' in the filter's value picker (steps 21 to 23). On screen: the filter editor on the right said 'Connected components: Piece' with one checkbox, 'Group 1 -- 549'. The preview table under it had just grown two columns, 'Connected components (visible)' and 'Connected components'. When I opened the picker again there were two entries both called 'Connected components' (3 values / 1 value) and two called 'Piece size' (2 to 105 / 549 to 549), with no '(visible)' tag. I clicked the '3 values' one and got the 549 one again. That's where I stopped knowing where to look: the table said one thing, the picker another, the top bar stayed at 112, and the picture still had the stray triangle and the lone dot. I couldn't tell whether I'd picked wrong, whether it hadn't refreshed, or whether the program just couldn't do it. 'So far' under Advanced only made it worse, because it said 'So far' and still '549 of 549 nodes so far'."
