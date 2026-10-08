# Session r1-s12 -- "Names on every dot", Les Miserables

Participant: Dev, a third-year history student in a digital-methods course. He has followed one
network tutorial video (import, layout, size by degree, communities, centrality, labels, export)
and has never used this program.

Task, as given: "Right now no names are written on the drawing. Get every character's name
written next to its dot." (Les Miserables sample.)

Start: empty app. Commands run from `design/ui/studio` as
`node tool/real.mjs <args> rounds/round-1/sessions/r1-s12`.

Note: the start waited about 45 minutes for a free browser slot.

## Steps

1. `--start empty` -> 01.png. Start page: Open project or file, New from data, Recent projects
   (empty), Samples on the right (Les Miserables, 77 characters, and three others). A usage-data
   banner at the bottom.
   Think-aloud: "I'll say no to the data question, then take the Les Miserables sample."

2. `--step --click "No thanks"` -> 02.png. Banner gone.

3. `--step --click "Les Miserables"` -> 03.png. The drawing: blue dots, gray lines, no names.
   Left panel: search box, "Selection", "Everything". Right panel: "Graph", tabs Style and
   Values (Values open: 77 nodes, 254 edges).
   Think-aloud: "The tutorial calls this step 'labels'. I don't see that word. Labels are how
   it looks, so Style."

4. `--step --click "Style"` -> 04
