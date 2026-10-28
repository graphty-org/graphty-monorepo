# Transcript r1-s56 -- Analyst Alex

## Step 1 (start)
Command: REAL_DIST=... REAL_TIER=3 node .../real.mjs --start <session> empty
Saw: landing page, "Open a file" big green button, "It never leaves your computer." under it -- good, that answers my data question. Free and open source, MIT -- no purchase request.
Next: click "Open a file" and give it sources.graphml.

## Step 2
Command: --step --click "Open a file" --upload sources.graphml
Saw: an import preview, "24 nodes, 59 edges", counts up front -- that's what I want. There's a "kind" column with company/person/agency. That's what I'll color by. "Local only" at the top too.
Next: click Load.

## Step 3
Command: --step --click "Load"
Saw: graph drawn, all nodes same blue-purple. Right panel says Nodes 24, Edges 59 -- matches the preview. Left has "Style layers" (developer-speak, skip for now). Right panel has a "Style" tab.
Next: open the Style tab on the right to find a "color by" control.

## Step 4
Command: --step --click "role=tab:Style"
Saw: only canvas background, lighting, labels. Nothing about node color. Hm.
Next: the left list has "Everything 24" -- 24 is my node count, so maybe that's where node color is. Click it.

## Step 5
Command: --step --click "Everything"
Saw: node style panel. Fill > Color 6366F1, a single color. There's a little chain-link icon next to it. In Gephi this would be the "partition" tab. Maybe the link means "drive it from a column".
Next: hover the link icon next to Color to see what it says.

## Step 6
Command: --step --hover-at 1381,483
Saw: tooltip "Node color by attribute". That's it.
Next: click it.

## Step 7
Command: --step --click "Node color by attribute"
Saw: a picker listing my columns; "kind -- 3 values". Exactly right.
Next: click "kind".

## Step 8
Command: --step --click "kind"
Saw: nodes recolored in three colors and a legend popped up top-left, titled "Color: kind": person = orange, company = light blue, agency = teal green. Orange/blue/teal -- not a red-vs-green legend, so I can actually tell them apart. Green and blue are a bit close but fine.
Done. Stopping here.

## Wrap-up (in character)
- Finished: yes. Brought sources.graphml in (24 nodes, 59 edges -- the preview showed the counts before I even loaded, and the Values panel repeated them). Colored nodes by the "kind" column.
- Answer: the companies are the LIGHT BLUE nodes (person = orange, agency = teal green), per the legend "Color: kind".
- Ease: 6 out of 7.
- What took longest / confused me:
  - The right panel's "Style" tab with the whole graph selected only showed canvas background and labels -- I expected node color there. I had to guess that the "Everything" row under "Style layers" was where node color lives. "Style layers" reads like developer-speak; I only clicked "Everything" because its 24 matched my node count.
  - The color-by-column control is an unlabeled chain-link icon next to the color swatch; I found it only by hovering. In Gephi it's a named "Partition" tab. Once found, the column list with "kind -- 3 values" was great.
  - Clicks: Load, Everything, link icon, kind -- 3 clicks after loading, OK for a weekly task once I know where it is.
  - Good: "It never leaves your computer" right under Open a file, and "Local only" at the top -- answered my data question before I asked. Legend appeared on its own, with a title naming the column.
