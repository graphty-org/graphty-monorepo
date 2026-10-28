# Session r5-s52b -- Nadia, level-1 alert reviewer (returning user)

Task: the Florentine families network is open. Count the families at most two marriages away from the Medici (not counting the Medici), then change the drawing so it shows only the Medici and those families.

Commands use:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node .../design/ui/studio/tool/real.mjs --step <session folder> ...

## 01.png (start)
The Florentine network is open, colored and sized by a PageRank run. No names drawn on the dots. Left panel has the find box, Selection, PageRank, Everything. Right panel shows the PageRank style. As usual I will type the name into the find box first.

## Step 1 -> 02.png
Command: `--step <folder> --click "Find nodes, edges, values" --type "Medici"`
Find box shows Nodes 1 (Medici) and Edges 6: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. That is the first ring -- six families married to the Medici. I will click Medici to open its connections list, like I do with an alerted account.

## Step 2 -> 03.png
Command: `--step <folder> --click "role=option:Medici"`
Medici is selected and ringed in yellow, right panel shows Degree 6 and PageRank #1 of 15. I need the second ring too. Reading six lists one by one is what I usually do, but maybe the "..." menu up top has something like "select connections". Trying it.

## Step 3 -> 04.png
Command: `--step <folder> --click-at 1419,73` (Node actions)
Menu: Neighborhood, Path between..., Frame selection, Add note. "Neighborhood" sounds like the families around the Medici. Clicking it.

## Step 4 -> 05.png
Command: `--step <folder> --click "Neighborhood"`
"Medici and 6 connections", Hops 1 / 2 / 3, a "Filter to neighbors" button, and the six names. Selection count says 7. "Hops" -- one hop from what? Here it must mean marriages away from the Medici. Two marriages = 2. Clicking 2.

## Step 5 -> 06.png
Command: `--step <folder> --click-at 1350,178` (Hops 2)
"Medici and 11 connections", Selection 12 (Medici plus 11). List: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. So the answer is 11 families. Three dots on the canvas are not ringed. Now to show only these I will press "Filter to neighbors".

## Step 6 -> 07.png
Command: `--step <folder> --click "Filter to neighbors"`
Top bar now says "12 of 15 nodes" with a filter icon; the three outlying dots are gone and the twelve left are all ringed. The legend says "PageRank, full graph", and the "15" next to PageRank suggests the data itself is still there -- this looks like only the view changed, which is what I want. The button grayed out after use. Done; ending.

## End
Command: `--end <folder>` -- session ended.

## In my own words
- Finished: yes. 11 families are at most two marriages from the Medici (Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni). The drawing now shows only those 11 and the Medici ("12 of 15 nodes").
- Ease: 6 of 7. Six steps, about two minutes. That is faster than reading six connection lists and writing the chain down.
- What confused me:
  - "Neighborhood" sits under a "..." button. I only found it because I was poking around. I would not have looked there on a busy day.
  - "Hops" made me stop: one hop from what? Here it plainly counts from the Medici, but the panel never says "marriages away from Medici".
  - "Filter to neighbors" grayed out after I pressed it, and nothing on that panel told me how to undo it. The "12 of 15 nodes" up top was the only clue that it was a view filter and not a change to the data. For QA I would want one line I can copy, such as "Showing Medici and 11 families within 2 links".
  - The count I needed ("11 connections") does not count the Medici, but the Selection row says 12. I had to work out which number was the answer.
