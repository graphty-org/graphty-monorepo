# Session r1-s03 -- Dana Okafor (returning user)

Task: staff in orange; people who never finished food-safety training out of the picture (not deleted). Report how many people remain and how many are orange.

## Step 1 (start)
Command: REAL_DIST=... REAL_TIER=5 node .../real.mjs --start <folder> setup:volunteers.txt
Screenshot 01.png: the volunteers graph is open. Everything is already in shades of orange-brown -- "Color: PageRank" from my friend's earlier work. 24 nodes. Left: Style layers (Hovered, Selected, Pinned, PageRank, Everything). Problem already: if staff should be "orange", the whole picture is orange already. First I want to see the columns -- last month I filtered in the Data place, so I'll go there.

## Step 2
Command: --step --click "Data"
Screenshot 02.png: Data place. Data sources (volunteers.graphml, 24 / 63), Attributes (collapsed?), and a Filters section with a "+". That's where I did the filter card last month. I'll add a filter first for the training.

## Step 3
Command: --step --click-at 276,333 (Add filter)
Screenshot 03.png: A filter editor with a table underneath -- good, tables I read. Columns: role (board/staff/volunteer), hours, trained (Yes/No). A list on the right lets me pick "trained". Picking it.

## Step 4
Command: --step --click-at 1189,316 (option "trained")
Screenshot 04.png: Filter now "trained pick yes or no". There's a Value... box and an "Except" switch. I want to keep the people who are trained, so I'll pick Yes in Value.

## Step 5
Command: --step --click-at 1280,190 (Value combobox "trained is")
Screenshot 05.png: Yes / No list. Picking Yes so only the trained people stay.

## Step 6
Command: --step --click-at 1178,226 (option "Yes")
Screenshot 06.png: "trained Yes -- 15 of 24", top bar says 15 of 24 nodes, 25 of 63 edges. 9 "No match" greyed out. That's what I want. Clicking Done.

## Step 7
Command: --step --click "Done"
Screenshot 07.png: Filter saved, "Nodes showing 15 of 24". Nobody deleted -- full graph still says 24. Half the job. Now the orange: everything is orange-brown from PageRank, so staff won't stand out. Going back to Graph where the Style layers list is, to add a layer for staff.

## Step 8
Command: --step --click-at 28,75 (Graph)
Screenshot 08.png: Style layers: Hovered, Selected, Pinned, PageRank (15), Everything (15). There's a "+" next to Style layers. I'll add a layer for staff.

## Step 9
Command: --step --click-at 276,122 (Add a layer or a folder)
Screenshot 09.png: menu: Layer, Folder, Hover highlight, Analyze... Picking Layer.

## Step 10
Command: --step --click-at 178,158 (Layer)
Screenshot 10.png: New "Layer 1" above PageRank, name field selected. Right side: "Which nodes 15 of 15 -- All nodes", and Fill etc. I'll name it Staff, then set Which nodes.

## Step 11
Command: --step --type "Staff" --key Enter --click "Which nodes"
Screenshot 11.png: Layer is now called Staff. Same picker as the filter -- familiar. Picking "role".

## Step 12
Command: --step --click-at 941,244 (role)
Screenshot 12.png: role values with counts: volunteer 9, staff 4, board 2 (adds to 15, so it already counts only the people still in the picture). Ticking staff.

## Step 13
Command: --step --click-at 904,215 (staff checkbox)
Screenshot 13.png: "Staff 4 of 15", table lists James Carter, Hannah Weiss, Ken Ito, Ben Adler -- all trained Yes. Good. Clicking Done, then Fill to set orange.

## Step 14
Command: --step --click "Done"
Screenshot 14.png: Staff layer, 4 nodes, "role staff". No color yet. Clicking the "+" next to Fill.

## Step 15
Command: --step --click-at 1404,401 (Add to node fill)
Screenshot 15.png: A "Color" box appeared, empty, with a small swatch. Clicking into it.

## Step 16
Command: --step --click-at 1320,435 (Node color, not set)
Screenshot 16.png: Just a text cursor, no color palette popped up. I'll type "orange" and press Enter, like Excel color names.

## Step 17
Command: --step --type "orange" --key Enter
Screenshot 17.png: It understood "orange" -> FFA500. Legend says "Color: Staff, 4 of 15 nodes". Four dots are now yellow-orange. But honestly they don't stand out -- everyone else is orange-brown from my friend's PageRank coloring. Nice trick that typing a word works. To make staff actually stand out I'll switch off the PageRank coloring with its eye (hiding a color, not deleting people).

## Step 18
Command: --step --click-at 276,280 (Hide PageRank)
Screenshot 18.png: Now it reads: 4 orange dots, the other 11 blue. Legend "Color: Staff, 4 of 15 nodes". Top bar "15 of 24 nodes, 25 of 63 edges". I counted the dots myself too: 4 orange, 11 blue = 15. Done.

## Wrap-up (in character, Dana)

Did I finish? Yes.
- People still in the picture: 15 (of 24; the 9 with trained = No are filtered out, not deleted -- full graph still says 24).
- Of those, in orange: 4 (James Carter, Hannah Weiss, Ken Ito, Ben Adler -- all staff, all trained).

Ease: 6 out of 7.

What went well: the filter card was where I left it last month, and the column picker showed role and trained with value counts. The table under the picker is the best part -- I could check the names myself. Typing "orange" into the color box just worked.

What confused me / friction:
- The picture was already orange from my friend's PageRank coloring, so my "orange" staff didn't stand out at all until I found the eye on the PageRank row. Nothing told me that; I had to guess. Someone in a hurry would ship a slide where "staff in orange" is invisible.
- Clicking the Color box gave me only a text cursor, no palette. I guessed that typing a color name works; it did, but a swatch list would be faster than guessing hex codes.
- "Which nodes" -- fine once you've seen it, but I'd call them people.
- Small grey text (the "4 of 15 nodes" under the legend, "Edges: not styled") is hard to read without my glasses.
- Not sure whether hiding PageRank changes what my friend sees next time she opens her project -- is that saved into her file?

## Follow-up

Facilitator: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: what did you notice the drawing do while you were choosing who goes in orange, and what did you take it to mean? Would you rather it had shown something else?"

Dana: 3. Mostly calm -- the filter card and the column picker were where I expected, and the table told me who was who. It went up a notch at one moment.

Least sure: right after I typed "orange" in the Color box (screenshot 17). The Staff layer said "Color: Staff, 4 of 15 nodes", the box said FFA500, and the drawing was still a field of orange-brown dots from my friend's PageRank coloring. I could not see which four were mine. I looked at the legend, then the layer list on the left, and the only thing that looked like it might help was the eye on the PageRank row. Nothing on screen told me "another layer is covering your color" -- I guessed, and I was not sure the eye would not also hide the people.

While choosing (screenshots 12-13): when the "Which nodes" picker opened, the orange-brown went away and every dot turned the same green. When I ticked "staff", eleven dots faded to a pale lilac and four stayed solid green, and the table below dropped to the same four names. I took it to mean "these four are the ones this layer will paint" -- a preview of who is picked, not the final color. That part was clear and I liked that the dots and the table agreed.

Would I rather it showed something else? Partly. Green when I am about to make them orange is a little odd -- for a second I wondered whether green was the color it was going to give them. And it showed my four standing out nicely in the preview, then when I clicked Done they sank back into the orange-brown. I would rather it had shown me, while picking, what the picture will really look like with my layer on top of what is already there -- or warned me that PageRank colors every node and will compete with mine. Names next to the four solid dots, on hover at least, would also help me match them to the table without counting.
