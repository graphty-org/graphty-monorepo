# Session r1-s55 -- Nadia (L1 alert reviewer), task: bring in volunteers.graphml, color board/staff/volunteers, name the board color

## Step 1 (start)
Command: REAL_DIST=... REAL_TIER=3 node design/ui/studio/tool/real.mjs --start <folder> empty
Sees: a landing page with a big green "Open a file" button, and a sample network spinning on the right. Fine -- "Open a file" is what I want.

## Step 2
Command: --step --click "Open a file" --upload volunteers.graphml
Sees: a preview table, 24 nodes and 63 edges, with a "role" column: board, staff, volunteer. Good, that is the column I need. Pressing Load bottom right.

## Step 3
Command: --step --click "Load"
Sees: the graph is in, 24 dots all the same blue, three clumps. Right panel has "Style" and "Values" tabs. Coloring sounds like Style, so I click Style.

## Step 4
Command: --step --click "role=tab:Style"
Sees: that Style tab is about the canvas background and labels, not the dots. On the left there's "Style layers" with a row "Everything 24". That's all 24 people, so I'll click it and see if it lets me color by role.

## Step 5
Command: --step --click "Everything"
Sees: Fill > Color 6366F1 for all nodes. There's a little chain-link icon next to the color box. Maybe that ties the color to a column. Hovering it to see what it says.

## Step 6
Command: --step --hover-at 1381,483
Sees: tooltip "Node color by attribute". That's exactly it. Clicking it.

## Step 7
Command: --step --click "Node color by attribute"
Sees: a list of columns: name, role (3 values), hours, trained, phone. "role, 3 values" is board/staff/volunteer. Clicking role.

## Step 8
Command: --step --click-at 1015,623  (option "role, 3 values")
Sees: the dots changed color right away and a key popped up top left, "Color: role": volunteer = orange/amber, staff = light blue, board = dark green (teal). I can count about four dark green dots. That's the task done. Stopping here.

## Wrap-up (in character, Nadia)
- Did I finish? Yes. File loaded, nodes colored by role, and the key says board is the DARK GREEN (teal) color; staff is light blue, volunteers are orange.
- Ease: 6 out of 7. About eight clicks, well under my five-to-ten-minute budget.
- What confused me:
  - The first "Style" tab on the right (with nothing selected) is only about the canvas background and labels. I expected node colors there and had to find the "Everything" layer on the left instead. "Everything" did not obviously read as "all the dots" until I clicked it.
  - The chain-link icon next to Color is what does "color by a column", but it only says so on hover. I would not have guessed a link icon means that.
  - The key (legend) is good -- that is the part I'd screenshot for the file. The board's dark green and the volunteers' orange are distinct; staff light blue is fine too.
  - Did I change the data or just the view? It looks like just the view (a style layer), but nothing told me in words.
