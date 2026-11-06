# Session r1-s09 -- Grace, returning

Task: put everyone who worked a shift with James Carter, or with someone who did, in orange (James too); say how many.

## Step 0 -- start
Command: REAL_DIST=... REAL_TIER=5 node design/ui/studio/tool/real.mjs --start <folder> setup:volunteers.txt
Screenshot 01.png: the volunteers project is open, 24 nodes, 63 edges. Everyone is already colored orange-to-brown by PageRank. Hmm, everybody is sort of orange already -- that will make "in orange" confusing. First I need to find James. I'll type his name in the "Find nodes, edges, values" box.

## Step 1
Command: --step --click "Find nodes, edges, values" --type "James Carter"
02.png: one node found, "v02, name: James Carter". Good. I'll click the result to select him and look at the right-hand panel.

## Step 2
Command: --step --click "v02"
03.png: James is selected (yellow ring), right panel shows his details, Degree 8. Now I need everyone within two steps of him. I'll try the "..." menu at the top of the right panel for something like "select neighbors".

## Step 3
Command: --step --click-at 1404,74 (Node actions)
04.png: menu with Neighborhood (G), Path between..., Frame selection, New layer from selection, Add note. "Neighborhood" is what I want. Clicking it.

## Step 4
Command: --step --click "Neighborhood"
05.png: "v02 and 8 connections", Hops 1 / 2 / 3, Selected layer now 9. "Hops" is a funny word but I get it: two steps out = his partners' partners. Clicking 2.

## Step 5
Command: --step --click-at 1342,178 (Hops 2)
06.png: "v02 and 15 connections", Selected layer says 16. So 16 people with James. But this is the "volunteers" project from volunteers.graphml -- the newer copy is the one that records shifts worked together. Before coloring, I want to know what the lines here mean. Going to the Data place.

## Step 6
Command: --step --click "Data"
07.png: Data place: one source volunteers.graphml, 24 people, 63 lines. Attributes section is empty-ish. Nothing says what a line means. I'll click the "63" lines chip to see.

## Step 7
Command: --step --click-at 233,150 (source chip)
08.png: right panel shows the source: Loaded 24 nodes, 63 edges. No columns on the lines. This project doesn't say anything about shifts. The newer copy of the list is the one that counts shifts per pair. I'll open the main menu to see Recent projects.

## Step 8
Command: --step --click "Main menu"
09.png: menu: Back to start, New project, Open project or file, Open sample, Save... No recent list here. Autosave says saved, so I'll go Back to start to see Recent projects.

## Step 9
Command: --step --click "Back to start"
10.png: "Discard unsaved changes? volunteers has changes that are not saved." Confusing: the status bar says "Autosave: saved". All I did was search and select, so I'll Discard.

## Step 10
Command: --step --click "Discard"
11.png: start screen. No Recent projects in view; there's a scrollbar, so I'll scroll down.

## Step 11
Command: --step --wheel 300,700,800
12.png: nothing scrolled (only the demo picture moved). Trying the End key.

## Step 12
Command: --step --key End
13.png: bottom of the start page: sample graphs and a usage-data box. No Recent projects here. Going back to the top and down one page at a time.

## Step 13
Command: --step --key Home --key PageDown
14.png: Sample library. Still no Recent projects anywhere. Odd -- that's where I always reopened my project. I'll try "Open a file" at the top in case recents are in there.

## Step 14
Command: --step --key Home --click "Open a file"
A computer file chooser opened, no recent list. Escaping it.

## Step 15
Command: --step --key Escape
16.png: back at the top of the start page. There is no Recent projects list at all -- surprising, I always reopened from there. The newer shifts copy isn't reachable from here. I'll stop hunting and reopen volunteers.graphml (the same file the project showed), since the task is in that list's people.

## Step 16
Command: --step --click "Open a file" --upload volunteers.graphml
17.png: 24 nodes, 63 edges, same as before, all blue now (my PageRank coloring is gone, but for this task blue-with-orange is clearer anyway). Redoing: search James, click him, Neighborhood, 2 hops.

## Step 17
Command: --step --click "Find nodes, edges, values" --type "James Carter" --click "v02" --click "Node actions" --click "Neighborhood" --expect "Hops"
18.png: Neighborhood panel open, hops 1 (8 connections).

## Step 18
Command: --step --click-at 1342,178 (Hops 2)
19.png: "v02 and 15 connections", Selected 16 -- same as the first time, good, consistent. Now I'll use Node actions > "New layer from selection" to give them a color.

## Step 19
Command: --step --click-at 1404,74 (Neighborhood actions)
20.png: menu: Frame selection, New layer from selection. Clicking "New layer from selection".

## Step 20
Command: --step --click "New layer from selection"
21.png: "Made a layer for the 16 selected nodes". New layer "16 nodes", "Picked by hand: 16 nodes". Sections Shape, Visibility, Text, Fill... I'll click the + next to Fill.

## Step 21
Command: --step --click-at 1404,381 (Add to node fill)
22.png: a Color box appeared under Fill, empty. I'll click into it and type "orange".

## Step 22
Command: --step --click-at 1318,415 (Node color, not set)
23.png: cursor in the color box, no picker popped up. I'll type "orange" and press Enter.

## Step 23
Command: --step --type "orange" --key Enter
24.png: it took "orange" and turned it into FFA500. The 16 people are orange, the key at the top says "Color: 16 nodes, 16 of 24 nodes". Let me count the blue ones left: 8 (six in the top-left group, two at the far top-right). 24 - 8 = 16. Matches. James is in it (it was "v02 and 15 connections"). Done.

## End (in character)

Did I finish? Yes. 16 people are in orange: James Carter plus the 15 people within two steps of him (the people who worked a shift with him and the people who worked with them).

How easy, 1 (very difficult) to 7 (very easy): 5.

The core path was quick once I found it: search box -> click James -> "..." -> Neighborhood -> Hops 2 -> "..." -> New layer from selection -> Fill + -> type orange. The toast "Made a layer for the 16 selected nodes" and the key "16 of 24 nodes" let me check my count, which I like.

What confused me:
- The project opened already colored orange-to-brown by my old PageRank ranking, so "put them in orange" was murky -- everybody was orange-ish already. I ended up starting fresh from the file, which threw away my PageRank coloring.
- Nothing in this project says the lines are shifts worked together; the lines have no columns. I wasn't sure whether to use this list or the newer copy that counts shifts, and I couldn't find the newer copy.
- "Back to start" said I had unsaved changes while the status bar said "Autosave: saved". Which is it?
- I couldn't find a Recent projects list anywhere on the start screen (not at the top, not scrolled down), even though that's how I always reopen my project. Scrolling with the mouse over the left side didn't move the page either; only the End key did.
- "Hops" is jargon; I guessed it means "steps away". A plain word like "steps" or "people away" would be nicer.
- The Neighborhood list only shows ids (v01, v03...), not names, so I couldn't read off who James should call.
- The color box gave no picker or list of colors; I just guessed typing "orange" would work. It did.

## Follow-up

Facilitator: On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen.

Grace: 4. The coloring part itself was calm -- search, click James, Neighborhood, 2, new layer, orange, and the "16 of 24 nodes" key let me check my count. The middle was where I lost my footing. The moment I was least sure what to do was right after I clicked Discard and landed on the start screen (screenshots 11 to 16). On the screen was the start page: "Open a file" at the top, a demo picture of a graph, the Sample library further down, sample graphs and a usage-data box at the very bottom. What was not on the screen was a Recent projects list, which is how I always reopened my project, and so no way to the newer copy of the list that counts shifts. I scrolled with the mouse and nothing moved except the demo picture, pressed End, Home, PageDown, even opened the file chooser -- and I had just thrown away my project after a "Discard unsaved changes?" box that disagreed with "Autosave: saved". At that point I honestly did not know if my work was gone or where to look, and if it had gone on one more try I would have stopped for the day and emailed the vendor.
