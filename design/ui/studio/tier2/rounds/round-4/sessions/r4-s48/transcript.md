# Session r4-s48 transcript (Tom, returning user)

Task: how many families are at most two marriages from the Medici (not counting the Medici), then make the drawing show only the Medici and those families.

## Start

`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:florentine-ranked.txt` -> 01.png

01.png: the Florentine families map, orange balls sized by PageRank, a legend top left. No names on the balls. Left panel: Selection, PageRank (15), Everything; a search box "Find nodes, edges, values". Toolbar at the bottom.

## Step 2
Said: "No names on any of these balls. I'll type Medici into the search box."
`--step <session> --click "Find nodes, edges, values" --type "Medici"` -> 02.png
Saw: Nodes 1 (Medici), Edges 6: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. So six families married straight in. That is the first ring. Now I need the families married to those.

## Step 3
Said: "I'll click the Medici row and see if it offers anything about who's nearby."
`--step <session> --click "role=option:Medici"` (or the Medici row)
`--click "Medici"` -> 03.png: refused as ambiguous (7 matches), nothing happened.
`--step <session> --click "Medici#1"` -> 04.png
Saw: Medici is picked (glowing big ball in the middle), right side says Degree 6, PageRank 0.1458 #1 of 15. Selection says 1. Nothing about families two steps out.

## Step 4
Said: "There's a three-dot menu next to Medici's name on the right. Maybe it has something like 'show who's connected'."
`--step <session> --click-at 1419,74`
-> 05.png: a menu: Neighborhood, Path between..., Frame selection, Add note.

## Step 5
Said: "Neighborhood. That sounds like who's around the Medici. Trying it."
`--step <session> --click "Neighborhood"`
-> 06.png: "Medici and 6 connections", Hops 1 / 2 / 3, a "Filter to neighbors" button, the six names listed, and they glow on the drawing. Selection now 7.

## Step 6
Said: "Hops 1, 2, 3. Two marriages away -- that should be 2."
`--step <session> --click "2"`
-> 07.png: "Medici and 11 connections". Listed: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. I counted the list myself: 11. Selection says 12, which is the 11 plus the Medici. Three balls on the drawing are not lit. So the answer is 11.

## Step 7
Said: "Eleven. Now the drawing should have only these. 'Filter to neighbors' is the only button that sounds like that. Filter, not delete, so I'll try it."
`--step <session> --click "Filter to neighbors"`
-> 08.png: the three unlit balls are gone; 12 balls left, all lit. Top bar now says "12 of 15 nodes" with a filter mark. The legend now says "PageRank, full graph". The button went grey. The icon on the PageRank row changed to a little clock-like arrow, which I did not touch.

## Step 8
Said: "That's it. Twelve on the drawing, the Medici plus the eleven. The top says 12 of 15, so I know the other three are only hidden, not gone. I'm done."
`--end <session>`
-> session ended (copied to the design sessions folder).

## Wrap-up, in character

- Did I finish? Yes. Eleven families are at most two marriages from the Medici: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. The drawing now shows only the Medici and those eleven ("12 of 15 nodes").
- Ease: 6 of 7.
- What confused me:
  - The balls have no names on them, so I could not tell which one was the Medici until I searched. Picking the Medici out of the search list took two tries: the first time it did nothing because every marriage line also says Medici.
  - "Neighborhood" was tucked behind the three dots; I only found it because I tried the dots. Once there, "Hops 1 2 3" and the count "Medici and 11 connections" were clear, and the list let me count the names myself.
  - "Selection 12" on the left and "11 connections" on the right are both right once you count the Medici, but for a second they looked like they disagreed.
  - After filtering, the legend says "PageRank, full graph" and the PageRank row's icon changed. I did not touch the ranking. I would want to know whether the sizes are still from all fifteen families or just these twelve; I'd probably ask her about that bit.
  - "Filter" did not sound like it would delete anything, and "12 of 15" up top told me the other three are only hidden. That part was reassuring.
