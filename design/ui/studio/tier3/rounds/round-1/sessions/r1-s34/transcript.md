# Session r1-s34 -- Dev (student), task: bring in sources.graphml, size by campaign donations, say who gave the most

## Step 1 -- start
Command: `real.mjs --start <folder> empty`
Screenshot 01.png. Okay, big landing page: "Analyze any network." A big green "Open a file" button that says CSV, GraphML... GraphML is my file type, nice. I'll click "Open a file" and give it sources.graphml.

## Step 2 -- Open a file, upload sources.graphml
Command: `--step --click "Open a file" --upload sources.graphml`
Screenshot 02.png. Wait, it shows me a table first, "Open as a new graph". 24 nodes, 59 edges. There's a "donations" column and it says "whole number" under it -- good, so it read the numbers as numbers, not text (the tutorial warned about that). I can see Harlan Development 250000 at the top. Okay, I'll click "Load" at the bottom right.

## Step 3 -- Load
Command: `--step --click "Load"`
Screenshot 03.png. Oh nice, there's the drawing already, three clumps, all blue balls, no names. Right side has numbers (24 nodes, 59 edges). Now I need to size nodes by donations -- in the tutorial that's "Ranking" then size. I don't see "Ranking" here. The right panel has a "Style" tab next to "Values", so I'll try "Style".

## Step 4 -- Style tab
Command: `--step --click "role=tab:Style"`
Screenshot 04.png. Hmm, this Style is only the canvas: background color, lighting, labels. Nothing about node size. Wait. On the left there's "Style layers" with "Everything 24" -- maybe that's all my nodes. I'll click "Everything".

## Step 5 -- Everything layer
Command: `--step --click "Everything"`
Screenshot 05.png. Okay now there's "Shape" and "Size 1". That's the size! But it's just one number for everyone. Next to it is a little chain-link icon. In Gephi I'd pick the column to rank by. Maybe the link means "link to a column"? I'll hover it to see what it says.

## Step 6 -- hover the link icon
Command: `--step --hover-at 1381,320`
Screenshot 06.png. Tooltip says "Node size by attribute". Yes, that's the ranking thing! (I was looking for "Ranking", here it's "by attribute".) Clicking it.

## Step 7 -- Node size by attribute
Command: `--step --click "Node size by attribute"`
Screenshot 07.png. A little list pops up: "Fixed size", then under Data: "donations 0 to 250,000". That's exactly my column. I'll click "donations".

## Step 8 -- choose donations
Command: `--step --click "donations"`
Screenshot 08.png. Oh nice, that's it! One node is really big now (bottom middle), a couple are medium, and there's a little key at the top "Size: donations 0 ... 250,000". Size says "From 1 to 3". But there are no names on anything, so I don't know who the big one is. I'll click the big ball to see who it is.

## Step 9 -- click the biggest node
Command: `--step --click-at 776,549`
Screenshot 09.png. Wait, the view jumped and zoomed toward it, but okay -- it has a yellow ring and the right side shows: name Harlan Development, kind company, donations 250,000. That matches the top of the table I saw at import, and the key's top end is 250,000, so this is the biggest one. Done.

Essay sentence: "Sized by campaign donations, Harlan Development (a company) stands out as the largest donor, with 250,000 in donations."

## End (in character)
- Did I finish? Yes. sources.graphml is in, nodes are sized by donations so the big donors stand out, and the biggest donor is Harlan Development with 250,000.
- How easy: 6 out of 7.
- What confused me:
  - I was looking for "Ranking" like in the tutorial. The Style tab on the right first showed only canvas stuff (background, lighting), with nothing about nodes. I only found node size by guessing that the "Everything" layer on the left meant all my nodes.
  - The size-by-column button is just a little chain-link icon with no word; I only knew what it was after hovering ("Node size by attribute").
  - No names are drawn on the nodes, so the picture alone does not tell you who the big one is -- I had to click it. For my essay figure I'd still need to find how to turn on labels.
  - Clicking the node moved and zoomed the whole view, which made me jump a bit.
  - "Size: From 1 to 3" -- not sure what 1 and 3 mean (units?), but the biggest ball looked clearly biggest, so I trusted it.
