# Session r1-s01 -- Grace, returning

Task: staff stand out in orange; people who never finished food-safety training out of the picture (not deleted). Report how many people remain and how many are orange.

## Step 1 (start)
Command: `REAL_DIST=... REAL_TIER=5 node .../real.mjs --start <folder> setup:volunteers.txt` -> 01.png
Notes: My volunteers project is open: 24 nodes, 63 edges, colored by PageRank (orange to brown). Problem already: everyone is orange-ish from the ranking. I need to see which column says who is staff and who finished training. I'll go to the Data place, like last month.

## Step 2
Command: `--step <folder> --click "Data"` -> 02.png
Notes: Data place shows volunteers.graphml with 24 people and 63 links, and a Filters section with a plus. Before filtering I want to see the columns -- which says staff and which says training. I'll open the table button in the bottom toolbar.

## Step 3
Command: `--step <folder> --click-at 793,840` (Table) -> 03.png
Notes: The table shows columns: role (board / staff / volunteer) and trained (Yes / No). Good, plain words. So: hide trained = No, color role = staff orange. First the hiding -- I'll use the Filters plus in the Data place, like when I narrowed to trained people last month.

## Step 4
Command: `--step <folder> --click-at 276,333` (Add filter) -> 04.png
Notes: A filter editor opened, "24 of 24", with a list of columns: role, hours, trained... I'll pick "trained".

## Step 5
Command: `--step <folder> --click-at 1189,316` (trained) -> 05.png
Notes: The filter is "trained pick yes or no" with a Value box. I'll open Value and pick Yes, so only trained people stay.

## Step 6
Command: `--step <folder> --click-at 1279,190` (Value list) -> 06.png
Notes: Yes / No. I pick Yes.

## Step 7
Command: `--step <folder> --click-at 1178,226` (Yes) -> 07.png
Notes: "15 of 24 nodes, 25 of 63 edges". 9 under "No match" -- the 9 who said No. 15 + 9 = 24, everyone accounted for. I'll press Done.

## Step 8
Command: `--step <folder> --click "Done"` -> 08.png
Notes: Filter kept: "15 of 24 nodes, 25 of 63 edges", Full graph still 24 -- nobody deleted. Now the orange. Trouble: the PageRank coloring already makes everybody orange/brown, so staff won't stand out. I've never picked by hand who gets a color. Style layers in the Graph place had a plus -- I'll try that.

## Step 9
Command: `--step <folder> --click "Graph"` -> 09.png
Notes: Style layers: Hovered, Selected, Pinned, PageRank (15), Everything (15). I'll press the plus next to Style layers to make a new one for staff.

## Step 10
Command: `--step <folder> --click-at 276,122` (Add a layer or a folder) -> 10.png
Notes: Menu: Layer, Folder, Hover highlight, Analyze. I want "Layer".

## Step 11
Command: `--step <folder> --click-at 178,158` (Layer) -> 11.png
Notes: "Layer 1" appeared above PageRank, its name is highlighted for typing. Right panel: "Which nodes: All nodes 15 of 15", Fill with a plus. I'll name it Staff, then open "Which nodes".

## Step 12
Command: `--step <folder> --type "Staff" --key Enter --click "Which nodes"` -> 12.png
Notes: Layer is named Staff. The "Which nodes" picker looks just like the filter one. I'll pick role.

## Step 13
Command: `--step <folder> --click-at 941,244` (role) -> 13.png
Notes: role values with counts: volunteer 9, staff 4, board 2 -- adds to 15, so these are the people still showing. I tick staff.

## Step 14
Command: `--step <folder> --click-at 903,215` (staff) -> 14.png
Notes: "4 of 15": James Carter, Hannah Weiss, Ken Ito, Ben Adler -- all staff, all trained. Done, then Fill plus to give them orange.

## Step 15
Command: `--step <folder> --click "Done"` -> 15.png
Notes: Staff layer shows 4, "role staff". Now Fill plus.

## Step 16
Command: `--step <folder> --click-at 1404,401` (Add to node fill) -> 16.png
Notes: A "Color" box appeared, empty. I'll click the little swatch to see if there's a palette to pick orange from.

## Step 17
Command: `--step <folder> --click-at 1268,435` (Pick node color) -> 17.png
Notes: A color picker. Swatches at the bottom: purple, grays, blue, yellow, black -- no orange. I'll type an orange code into the Hex box, like I do in PowerPoint: FF8000.

## Step 18
Command: `--step <folder> --click-at 1110,744 --key Control+a --type "FF8000" --key Enter` -> 18.png
Notes: The key says "Color: Staff, 4 of 15 nodes". But honestly the staff don't stand out -- everybody else is orange-to-brown from the PageRank coloring. For the meeting I'll switch the PageRank coloring off with its eye (not delete it, I want it back for the board slide).

## Step 19
Command: `--step <folder> --click-at 276,280` (Hide PageRank) -> 19.png
Notes: Now it reads: four orange dots, everyone else blue. Key says "Color: Staff, 4 of 15 nodes". Top bar: "15 of 24 nodes, 25 of 63 edges". Counting the canvas: 4 orange. The untrained 9 are out of the picture but still in the data (Full graph 24). Autosave says saved. Done.

## End of session (in character)

- Did I finish? Yes. 15 people are still in the picture; 4 of them are orange (staff: James Carter, Hannah Weiss, Ken Ito, Ben Adler). The 9 who never finished food-safety training are filtered out, not deleted (24 still in the full graph).
- Ease: 6 of 7.
- What confused me:
  - Coloring staff orange at first did nothing visible -- my old PageRank coloring was already orange-to-brown, so the staff blended in. I had to think to switch the PageRank layer off with its eye. Nothing told me my new color was clashing.
  - The color picker's quick swatches had no orange; I had to know a hex code. Many of my colleagues would not.
  - Filter names like "trained pick yes or no" are a bit odd, but the "15 of 24" and "No match 9" counts let me check against my spreadsheet right away, which I liked.
  - "Which nodes" for the layer looked just like the filter, so I knew what to do -- nice.

## Follow-up

Question: "On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen. Then: what did you notice the drawing do while you were choosing who goes in orange, and what did you take it to mean? Would you rather it had shown something else?"

Answer (Grace): 3. Mostly I knew the next step -- the filter and the "Which nodes" picker worked the same way, and the counts let me check myself against my spreadsheet. The moment I was least sure was right after I typed FF8000 into the color box: the key on the right said "Color: Staff, 4 of 15 nodes", so the program told me it had worked, but the drawing was still a sea of orange-to-brown dots from my old PageRank coloring. I could not see four orange people anywhere. I sat there wondering whether my color had taken, whether I had picked the wrong people, or whether I had to save something. Only after a bit did I guess the PageRank layer was painting over the same look, and I tried its eye.

While I was choosing who goes in orange, the little drawing in the middle of the picker was all green dots at first. When I ticked "staff", four dots stayed solid green and the other eleven went pale and faded, and the left side said "role staff" and "No match 11". I took it to mean "these four are the ones your layer will touch" -- a preview of the pick, not the final colors. That part was clear and I liked it; it matched the four names in the table under it.

What I would rather have seen: the green was just a "you picked these" color, so it told me nothing about how they would actually look in my real drawing. If it had shown the four in the color they would end up -- or at least warned me that another coloring (PageRank) already colors these same people, so mine might not show -- I would have known before I left the picker that orange would blend in. Also there was a "Group colors / Styled" switch at the top I never touched; maybe "Styled" did that, but nothing told me so.
