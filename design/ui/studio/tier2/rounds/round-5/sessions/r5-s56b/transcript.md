# Session r5-s56b -- Jordan, marketing network analyst (returning)

Task: the Florentine families network is open. Go to the Medici, read what the program knows about them, see which families they married into; say who and how many.

Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/

## 01.png (start)
Florentine families open, PageRank run selected, sized and colored by PageRank, legend top-left. No labels on the nodes, so I cannot spot the Medici by eye. Find box at the top of the left panel -- that is what I always use for one customer's circle.

## Step 1
`node design/ui/studio/tool/real.mjs --step <session> --click "Find nodes, edges, values" --type "Medici"` -> 02.png
The find box answered straight away: Nodes 1 (Medici), Edges 6 -- Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. That already reads like the marriage list. Now I'll click the Medici row to see what the program knows about them.

## Step 2
`--click-at 115,153` (the Medici row in the find results) -> 03.png
Medici highlighted on the map (the big dark one in the middle -- figures, they are #1). Right panel, Values: id Medici, name Medici, Degree 6 (with an arrow), Results: PageRank 0.1458, #1 of 15. That is all the data has on them -- no attributes beyond the name. Degree 6 matches the six edges the find box listed. I'll click Degree to see whether it lists the families.

## Step 3
`--click-at 1400,242` (Degree 6 arrow) -> 04.png
Opens "Neighborhood": "Medici and 6 connections", Hops 1/2/3, Filter to neighbors, and the list: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. All six highlighted on the map and Selection now says 7 (Medici plus six). Same six as the find box. That's my answer; I don't need the 2-hop thing.

`node design/ui/studio/tool/real.mjs --end <session>`

## Wrap-up (in character)
- Finished: yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. What the program knows about them: just id and name (Medici), degree 6, and PageRank 0.1458 -- ranked #1 of 15, the biggest, darkest node in the middle.
- Ease: 7/7. Three clicks. The find box already gave me the six ties before I even opened the family, and the Degree arrow gave the same six as a clean list. Two routes agreeing is what makes me trust it.
- Confusion: small things. The Degree arrow doesn't look like a button -- I only tried it because I'm used to it. The find box lists ties as "Medici -- Barbadori" edges, so I had to read past the Medici part on each. The data has nothing else on the families (no wealth, no seats), so "what the program knows" is thin, but that's the file, not the tool. Still no names on the map itself -- for a slide I'd want labels on, which is the usual fight.
