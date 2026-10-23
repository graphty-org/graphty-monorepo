# Session r5-s08b -- Jordan, marketing network analyst (returning user)

Task as given: the Les Miserables network is open; each tie counts the chapters two characters share. Without taking any character or tie off the drawing, point out on the drawing every tie of 10 or more shared chapters, and say how many there are.

All commands run with:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs <args> on session folder tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s08b

## Step 01 (start, already done)
01.png: Les Miserables open, PageRank run selected on the left, right panel shows its Style tab (Fill color by PageRank, Size 1 to 3). Rows on the left: Selection, PageRank, Everything. Nothing about the ties yet.
Me: "OK, the ties. I have never marked ties by a number. I usually color things from the Style tab of Everything, so I'll start there and see if there is an edge section."

## Step 02
Command: --step --click "Everything"
02.png: Everything's Style tab, with a Nodes / Edges switch at the top. Nodes shown: Color 6366F1, Size 1, Shape Icosphere.
Me: "There's an Edges switch. Fine. Let's see what the ties get."

## Step 03
Command: --step --click "Edges"
03.png: Edges view: Line Color A9A9A9 at 100%, Width 8, Pattern Solid, then Arrows and Label. A little chain-link icon sits beside Color and Width.
Me: "This paints every tie the same. I only want the heavy ones. What's the chain-link thing -- link it to a column?"

## Step 04
Command: --step --hover-at 1381,198
Tooltip: "Color by attribute".
Me: "Color by attribute -- that's a gradient over every tie, probably. Not quite 'mark the ten-plus ones', but maybe it lets me set a cutoff. Let's look."

## Step 05
Command: --step --click "Color by attribute"
05.png: a "Color by attribute" popover with a search and one attribute, shared_chapters.
Me: "Right, shared_chapters is the column. But a color ramp over all the ties won't give me a count, and nobody can read 'is that orange ten or nine'. I want the heavy ones picked out. The find box says it finds edges and values -- let me try asking it directly instead."

## Step 06
Command: --step --key Escape --click "Find nodes, edges, values" --type "shared_chapters >= 10"
06.png: the find box shows a hint "Start with = to select by a value:" and offers one row, =shared_chapters >= `10`, "Select its matches".
Me: "Oh, OK -- it understood me and rewrote it with an equals sign and backticks. Weird syntax, but fine. Select its matches."

## Step 07
Command: --step --click "Select its matches"
07.png: "13 edges selected" under the find box; the 13 ties are drawn thick blue on the map, everything else still there in gray. The right panel shows "13 edges selected", Values tab, Summary Edges 13, and a list of the selected edges with shared_chapters: MmeMagloire--Myriel 10, Thenardier--MmeThenardier 13, Thenardier--Valjean 12, Cosette--Valjean 31, Javert--Valjean 17, Marius--Gillenormand 12, Marius--Cosette 21, Marius--Valjean 19, Combeferre--Enjolras 15, Courfeyrac--Enjolras 17, Courfeyrac--Combeferre 13, Bossuet--Courfeyrac 12, Bossuet--Enjolras 10.
Me: "There it is. Thirteen. And the 10s are in, so it's 'ten or more', not 'more than ten' -- good, that's the first thing I'd check. Cosette and Valjean at 31 at the top, that's the one I'd expect, so I believe it. Nothing got taken off the map; the heavy ties are just blue. Most of them sit in the dense middle around Valjean plus the student group, and one long one goes down to the bottom hub."
Answer: 13 ties have 10 or more shared chapters; they are the blue ties on the drawing.

Command: --end
Session ended cleanly.

## Wrap-up (in character)

- Finished: yes. 13 ties of 10 or more shared chapters, picked out in blue on the full drawing, nothing hidden.
- Ease: 6 of 7.
- What confused me: I went to the Style tab first because that's where I color things, and it only offered one color for all ties or a color ramp by shared_chapters -- neither gives me "just the 10-plus ones" or a count. I got there by guessing that the find box would take a condition. It did, and rewrote my words into "=shared_chapters >= `10`" with backticks I would never type myself; the hint "Start with = to select by a value" is the only reason I'd know that next time. The payoff was great though: the count, the list with the numbers, and the ties lit on the map in one click. I would like to be able to keep that blue as a style for the deck instead of it being "a selection" that goes away when I click somewhere else -- for a VP slide I need it to stay put, and with a key that says "blue = 10+ chapters together". Also, the 13 being "edges" in the panel and "ties" in my head is fine; I'll live.
