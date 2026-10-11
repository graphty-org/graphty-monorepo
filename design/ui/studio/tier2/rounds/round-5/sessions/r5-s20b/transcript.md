# Session r5-s20b -- Analyst Alex (returning user)

Task: Strozzi to Pazzi, fewest families, passing only through marriages. Which families, in order?

## Step 1 (01.png, given)
Florentine families is open, colored and sized by PageRank. No names on the dots. I need a shortest path. I'd normally search "shortest path" -- the flask icon at the bottom looks like the algorithms. Trying that.

## Step 2 -- `--hover-icon 1` (02.png)
Wanted the flask tooltip, got "Main menu". Wasted step, my fault.

## Step 3 -- `--click-at 615,864` (03.png)
Flask is "Analyze". A list with a filter box: Degree, Betweenness, Closeness... Filter box has focus. I'll type "shortest".

## Step 4 -- `--type "shortest"` (04.png)
"Shortest path -- the fewest steps between two nodes." Exactly. Clicking it.

## Step 5 -- `--click "Shortest path"` (05.png)
From / To / Weight form, From has focus. Typing "Strozzi".

## Step 6 -- `--type "Strozzi"` (06.png)
One match, Strozzi. Picking it.

## Step 7 -- `--click "role=option:Strozzi"` (07.png)
From = Strozzi, focus jumped to To on its own. Nice. Typing "Pazzi".

## Step 8 -- `--type "Pazzi"` (08.png)
Pazzi offered. Pick it, then Find path (weight None is right -- marriages, fewest families).

## Step 9 -- `--click "role=option:Pazzi" --click "Find path"` (09.png)
Path drawn in black on the picture, and the right panel lists "Nodes in order": Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5. "5 nodes, 4 edges", weight None, "each edge counts as 1". That's the answer and it's in text I can copy into a slide. Ending.

## --end (first)
Next request: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?"

## Step 10
Same thing again with different ends. I'll open Analyze again and see if Shortest path is under Recent.
Command: `--click "Analyze"` (10.png). Shortest path is at the top under Recent. Clicking it.
Command: `--click "Shortest path#2"` (11.png) -- tool said ambiguous, nothing happened. Clicking the Recent row directly at 600,455.

## Step 11 -- `--click-at 600,455` (12.png)
Fresh empty form, From focused. Type Peruzzi.

## Step 12 -- `--type "Peruzzi"` (13.png)
Peruzzi offered. Pick it, type Ginori in To.

## Step 13 -- `--click "role=option:Peruzzi" --type "Ginori"` (14.png)
Peruzzi set, Ginori offered. Pick it and Find path.

## Step 14 -- `--click "role=option:Ginori" --click "Find path"` (15.png)
Nodes in order: Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5. 4 hops, weight None. Path drawn in black. Note the left list still shows one "Shortest path" row -- the Strozzi-to-Pazzi run looks like it was replaced rather than kept beside it. I wrote the first answer down, so fine, but if I needed both on screen for a slide I'd be annoyed. Ending.

## --end (second): session ended.

## In my words, at the end
- Finished: yes, both.
  - Strozzi to Pazzi: Strozzi, Ridolfi, Medici, Salviati, Pazzi (4 hops).
  - Peruzzi to Ginori: Peruzzi, Bischeri, Guadagni, Albizzi, Ginori (4 hops).
- Ease: 6 of 7. Typing "shortest" into the Analyze filter found it right away. Picking From and To by typing the family name worked, and the cursor moved on to To by itself. "Nodes in order" with numbers is exactly the list I'd paste into a slide.
- What took longest or confused me:
  - The dots have no family names on them, so the black path on the picture means nothing to me without the side panel. Without "Nodes in order" I couldn't have answered from the picture at all.
  - The second run replaced the first. The left list shows one "Shortest path" row, and the Strozzi-Pazzi answer is gone from the screen. I'd expected the two to sit side by side, the way two runs would in a notebook.
  - Nothing says whether a second path of the same length exists. If a director asks "is that the only way?", I don't have an answer.
  - Running it again took 3 clicks plus typing (Analyze, the Recent entry, then the form). That's fine for something I do once, but if I did it every week I'd want to edit From and To on the existing run.
