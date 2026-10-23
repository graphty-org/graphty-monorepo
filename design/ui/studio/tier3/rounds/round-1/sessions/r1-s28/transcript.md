# Session r1-s28 -- Explorer Elena, sources.graphml task

## Step 1 (start)
Command: `REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <folder> empty` -> 01.png
Notes: Landing page. Big green "Open a file" button saying "CSV, GraphML, ..." -- my file is .graphml, so that's the one. Pretty spinning dots on the right.

## Step 2
Command: `--step <folder> --click "Open a file" --upload sources.graphml` -> 02.png
Notes: A spreadsheet-looking preview. Top says "sources: 24 nodes, 59 edges", and the bottom says "the load makes 24 nodes and 59 edges". So 24 sources and 59 ties, I think (I guess "edges" are the ties?). There's a "kind" column: company, person, agency -- good, that's what I need for the blue part. Clicking the green "Load".

## Step 3
Command: `--step <folder> --click "Load"` -> 03.png
Notes: Ooh, three little clumps of dots. Right side says Nodes 24, Edges 59 -- same as the preview, nothing went missing. So: 24 sources, 59 ties. Hmm, all the dots are already kind of blue-purple... does that count? Probably not, the people need to stay "as they are" and they all look the same. The three clumps must be companies, agencies and people (guess). I'll type "company" in the search box at the top left to find the companies.

## Step 4
Command: `--step <folder> --click "Find nodes, edges, values" --type "company"` -> 04.png
Notes: It found 6 nodes, all "kind: company", but it shows them as s01, s04... not their names. Weird, the preview had "Harlan Development". Under "Values" there's "kind is company (6)" -- that sounds like all of them at once. Clicking that.

## Step 5
Command: `--step <folder> --click "kind is company (6)"` -> 05.png
Notes: Six dots got yellow rings, right side says "6 nodes selected", kind company (6). The picture slid over to the right a bit -- hey, I was looking at that. Companies are spread across two clumps, so my clump guess was wrong. Now I need the agencies too. I'll search "agency" and try shift-clicking its row so it adds to what I have, like in a spreadsheet.

## Step 6
Command: `--step <folder> --click "Find nodes, edges, values" --type "agency"` -> 06.png
Notes: 4 agencies. Companies still selected (6). Shift-clicking "kind is agency (4)" to hopefully add them.

## Step 7
Command: `--step <folder> --shift-click "kind is agency (4)"` -> 07.png
Notes: Yes! "10 nodes selected", kind: company (6), agency (4). The picture shifted around again though. Now how do I make them blue... there's a "Style" tab on the right next to "Values". Trying that.

## Step 8
Command: `--step <folder> --click "role=tab:Style"` -> 08.png
Notes: Style tab says the first style I set makes a layer for the 10 selected. Options: Shape, Visibility, Text, Fill, Effects, Rendering. No "Color"... In Slides the color thing is "Fill color", so Fill it is.

## Step 9
Command: `--step <folder> --click "Fill"` -> 09.png (refused: ambiguous, nothing happened)
Notes: Tool said "Fill" matched several things. I'll just click the little + next to Fill.

## Step 10
Command: `--step <folder> --click-at 1404,301` ("Add to node fill") -> 10.png
Notes: A Color box opened with "6366F1" -- that's a code, not a color name. It says "Not set yet: the first color you pick makes the layer". Wait, they are already sort of blue-purple. Is that blue? Not really, more purple. I'll click the little color square to get a picker.

## Step 11
Command: `--step <folder> --click-at 1268,335` ("Pick node color") -> 11.png
Notes: A color picker popped up, like in Slides. Little color squares at the bottom: purple, grey, a real blue, yellow, black. Clicking the real blue one.

## Step 12
Command: `--step <folder> --click-at 1031,697` ("blue 0077BB") -> 12.png
Notes: "Made a layer for the 10 selected nodes." The ringed dots turned a deeper blue, the others stayed purple-ish. A box top-left says "Color: 10 nodes, 10 of 24 nodes". The picture slid again. I want to see it without the yellow rings, so I'll click an empty bit of the background.

## Step 13
Command: `--step <folder> --click-at 450,600` (empty canvas) -> 13.png
Notes: Rings gone. 10 dots are a teal-ish blue, the other 14 (the people) stayed the purple-blue they started as. Counts on the right still say Nodes 24, Edges 59. Part of the picture is cut off on the right side now, it drifted over. The little box at the top says "Color: 10 nodes" -- it doesn't say "companies and agencies", so if I showed this in a meeting nobody would know what the blue means. Also the "blue" and the default purple-blue look kind of similar from far away. But I think I'm done. Stopping here.

## End of session (in character)

**Did I finish?** Yes, I think so. The file has 24 sources and 59 ties (the app calls them "nodes" and "edges" -- I'm assuming edges are the ties). All 6 companies and 4 agencies are now blue, and the 14 people were left alone.

**How easy, 1 (very difficult) to 7 (very easy):** 5.

**What confused me:**
- The words "nodes" and "edges" -- I had to guess that sources = nodes and ties = edges. Nothing said so.
- The search results list the dots as "s01, s04..." instead of their names like "Harlan Development", even though the preview table showed the names.
- I wasn't sure shift-click would add the agencies to the companies; I just tried it like a spreadsheet and it worked. Nothing on screen told me that.
- There's no "Color" button -- it's under "Fill". And the color box shows a code (6366F1) instead of a color name. The little swatches in the picker saved me.
- All the dots started out purple-blue already, so at first I wondered whether they were already "blue". After my change the difference between my blue and the starting purple is not huge.
- The picture kept sliding around every time I selected something, and in the end part of it was off the right edge.
- The little label says "Color: 10 nodes", not "companies and agencies", so the picture alone wouldn't explain itself in a meeting.
