# Session r1-s36 -- Nadia (L1 alert reviewer), task: sources.graphml, size by donations, who gave most

## Step 1 (start)
Command: REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty
Saw: landing page, big green "Open a file" button (says GraphML). Next: click it and give it sources.graphml.

## Step 2
Command: --step --click "Open a file" --upload sources.graphml
Saw: "Open as a new graph" preview, 24 nodes, 59 edges, with a donations column (Harlan Development 250000 so far). OK, I can see the numbers already. Next: click Load.

## Step 3
Command: --step --click "Load"
Saw: graph drawn, all dots the same blue, no names on them. Right panel has Style / Values tabs. Next: click Style, looking for a size setting.

## Step 4
Command: --step --click "role=tab:Style"
Saw: canvas background, lighting, labels -- nothing about node size. On the left there are "Style layers": Hovered, Selected, Everything (24). Next: click "Everything", maybe that is where node look is set.

## Step 5
Command: --step --click "Everything"
Saw: Node style with Shape and Size = 1. A little chain-link icon next to Size. Maybe that ties size to a column? Next: hover that icon to see what it says.

## Step 6
Command: --step --hover-at 1380,320
Saw: tooltip "Node size by attribute". That's what I want. Next: click it.

## Step 7
Command: --step --click "Node size by attribute"
Saw: a picker with "donations 0 to 250,000" under Data. Max is 250,000 -- that matches Harlan Development from the preview. Next: pick donations.

## Step 8
Command: --step --click "donations"
Saw: sizes changed, legend "Size: donations 0 - 250,000", one big ball at the bottom right, a couple medium. But no names on the dots -- I can't tell who the big one is. Next: click the big ball.

## Step 9
Command: --step --click-at 776,549
Saw: the big ball got a yellow ring and the right panel shows s01, name Harlan Development, kind company, donations 250,000. The camera also slid over when I clicked, so the picture moved under me. Answer found; stopping here.

## End (in character)
Did I finish? Yes. Harlan Development (s01, a company) gave the most: 250,000. Next biggest by size look like the medium balls (Northgate Capital 90,000 from the preview table).

Ease: 6 of 7. Nine steps, about the length of one alert.

What confused me / what QA would ask:
- After I loaded the file, every dot looked the same and none had a name on it. I had to click the biggest one to learn who it was. For an alert file I'd want the names drawn, at least on the big ones, so one screenshot says it.
- Size lives under a layer called "Everything" on the left. I only clicked it because nothing else looked right; the first Style tab I opened (right side) was about the canvas, not the dots.
- The size control was a tiny chain-link icon; I only knew because of the tooltip "Node size by attribute". Once open, the picker was clear: donations, 0 to 250,000.
- "Selected 1" appeared in the layers list after my click -- I wasn't sure whether clicking changed anything or just highlighted. And the view jumped when I clicked the node.
- Honestly the import preview table already showed me 250,000 for Harlan; I could have answered from that without drawing anything, if it were sortable.
