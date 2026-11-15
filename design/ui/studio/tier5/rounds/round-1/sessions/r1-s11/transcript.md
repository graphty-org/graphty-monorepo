# Session r1-s11 -- Dana Okafor (returning user)

Task: put everyone who worked a shift with James Carter, or with someone who did, in orange (James too); say how many are orange.

## Start
Command: REAL_DIST=... REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <session> setup:volunteers.txt
Screenshot 01: volunteers project open. 24 nodes, 63 edges, all colored orange-to-brown by PageRank already. No names on the dots. Left: search box "Find nodes, edges, values" and style layers. Note: everything is already orange-ish, which will make "put them in orange" confusing.

## Step 2
Thought: "Search box first, like always." 
Command: --step <s> --click "Find nodes, edges, values" --type "James Carter"
Screenshot 02: one match, node v02, name: James Carter. Also a "name is James Carter (1)" value line.

## Step 3
Thought: "Click him." Command: --step <s> --click-at 180,160
Screenshot 03: James (v02) selected, zoomed to him in the bottom cluster. Right panel: staff, 48 hours, Degree 8 with an arrow. Selected layer = 1.

## Step 4
Thought: "Right-click him for a 'select neighbors' kind of thing." Command: --step <s> --rclick-at 748,458
Screenshot 04: menu: Neighborhood (G), Path between..., Frame selection, New layer from selection, Add note, Motion off.

## Step 5
Thought: "Neighborhood sounds like who he worked with." Command: --step <s> --click "Neighborhood"
Screenshot 05: right panel "v02 and 8 connections", Hops 1/2/3, Filter to neighbors, list v01, v03-v09 (ids, not names -- annoying). Selected = 9.

## Step 6
Thought: "Two steps out = Hops 2." Command: --step <s> --click-at 1342,178
Screenshot 06: "v02 and 15 connections", Selected layer count 16, 16 dots ringed yellow.

## Step 7
Thought: "Right-click one of the ringed dots, use 'New layer from selection'." Command: --step <s> --rclick-at 731,551
Screenshot 07: panel says "16 nodes selected"; menu open again.

## Step 8
Command: --step <s> --click "New layer from selection"
Screenshot 08: toast "Made a layer for the 16 selected nodes". New layer "16 nodes" (Picked by hand: 16 nodes) above PageRank. Style tab with Shape, Visibility, Text, Fill, Shaders.

## Step 9
Command: --step <s> --click-at 1404,381  (button "Add to node fill")
Screenshot 09: Fill section now has a "Color" box, blank.

## Step 10
Command: --step <s> --click-at 1312,415 (input "Node color, not set")
Screenshot 10: just a text cursor in the color box, no palette opened.

## Step 11
Command: --step <s> --type "orange" --key Enter
Screenshot 11: color box now FFA500 with an orange swatch; the 16 ringed dots turned bright orange. Legend: "Color: 16 nodes, 16 of 24 nodes" over "Color: PageRank" and a line "16 nodes covered by 16 nodes" (no idea what that sentence means).

## Step 12
Thought: "Click empty space to drop the rings and look at it clean."
Command: --step <s> --click-at 1000,750
Screenshot 12: selection cleared. 16 dots bright orange, 8 left in the PageRank rust/brown shades (a few partly behind the legend box at top left). Layer "16 nodes" count 16.

## End (in character)
Finished: yes. 16 people are in orange -- James Carter plus 15 who are within two shifts of him (his 8 direct shift partners and 7 more who worked with one of them).

Ease: 6 of 7.

What went well: search found James by name at once; right-click on him gave "Neighborhood", and "Hops 1 / 2 / 3" was exactly "worked with him / worked with someone who worked with him". "New layer from selection" plus Fill took me straight to a color, and typing the word "orange" worked.

What confused me:
- The whole picture was already orange-to-brown from the PageRank coloring before I started, so "put them in orange" is ambiguous on screen. The 8 left out are still rust/brown, which I'd call dark orange on my laptop. I'd want to switch the PageRank coloring off for James's copy, but I wasn't asked.
- The neighbor list and the "Hops" panel show ids (v01, v03...) not names. James wants names to call.
- Clicking the color box gave only a text cursor, no swatches; I guessed that typing a word would work.
- Legend line "16 nodes covered by 16 nodes" -- I don't know what that means.
- The legend box sits on top of some dots at the top left.

## Follow-up
Question: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen."

Answer: 3. Mostly calm -- search, right-click, Neighborhood, Hops 2 each led to the next thing. The moment I was least sure was right after I clicked the empty color box in the Fill section of my new "16 nodes" layer (screenshot 10). I expected a palette or swatches to pop up, and all I got was a blinking text cursor in a box that said "Node color, not set". Nothing on the screen told me what to put in there -- a hex code, a name, something else -- so I sat there a second and guessed that typing the word "orange" might work. It did, but that was luck, not the screen telling me. Close second: the very first screen, where every dot was already orange-to-brown from the PageRank coloring, so I wasn't sure how I'd even tell "my" orange apart.
