# Session r5-s50b -- Ruth, returning

Task: which families are at most two marriages away from the Medici; how many, not counting the Medici; then show only the Medici and those families.

Commands use `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node design/ui/studio/tool/real.mjs` with the session folder `tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s50b` (written below as `$R` and `$S`).

## Step 1 (01.png, given)
Florentine families is open, colored and sized by a PageRank run (15 in the row). No names on the dots. Left panel has a find box. I start where I always start: type "Medici" into the find box.
Command: `$R --step $S --click "Find nodes, edges, values" --type "Medici"` -> 02.png

## Step 2 (02.png)
Search found 1 node, Medici, and 6 edges: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. Six direct marriages; I write them down. Now I need the second ring. I click the Medici result to open its panel.
Command: `$R --step $S --click "role=option:Medici"` -> 03.png

## Step 3 (03.png)
Medici selected, right panel: Degree 6, PageRank 0.1458, #1 of 15. Degree 6 matches the six edges. 15 families in all. I want something like "neighbors of neighbors". I try the three-dot menu at the top of the Medici panel.
Command: `$R --step $S --click-at 1419,74` -> 04.png ("Node actions")

## Step 4 (04.png)
Menu: Neighborhood (G), Path between..., Frame selection, Add note. "Neighborhood" is the word I want. I click it.
Command: `$R --step $S --click "Neighborhood"` -> 05.png

## Step 5 (05.png)
"Medici and 6 connections", Hops 1 / 2 / 3, a "Filter to neighbors" button and the six names, matching my list from the search. Selection says 7 (Medici plus six). Two marriages away = 2 hops. I click 2.
Command: `$R --step $S --click "2"` -> 06.png

## Step 6 (06.png)
"Medici and 11 connections". Names, read aloud: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. That is 11, not counting the Medici; Selection reads 12, which is the 11 plus the Medici. Five new ones: Castellani, Ginori, Guadagni, Pazzi, Strozzi. Says who? The list does not say through whom each one is reached. I check one: Pazzi. I search "Pazzi" in the find box to see who they married.
Command: `$R --step $S --click "Find nodes, edges, values" --type "Pazzi"` -> 07.png

## Step 7 (07.png)
Pazzi has one edge: Salviati -- Pazzi. And Medici -- Salviati was in my first search. So Pazzi is two marriages out, through the Salviati. The link held. The neighborhood panel stayed put behind my search, good. Now the drawing: I click "Filter to neighbors".
Command: `$R --step $S --click "Filter to neighbors"` -> 08.png

## Step 8 (08.png)
Top bar now reads "12 of 15 nodes" with a filter icon. I count the dots myself: 12. Three gone: the lone one at the right and the two at the bottom. The legend now says "PageRank, full graph", so it tells me the colors were computed before the filter, not after -- that is the thing I worry about, and it said so. The dots carry no names, so I cannot confirm from the drawing alone which three families were dropped; the panel's list of 11 names is my record. That answers both parts. I end the session.
Command: `$R --end $S` -> session ended.

## At the end (Ruth, in her own words)

- **Did I finish?** Yes. 11 families are at most two marriages from the Medici, not counting the Medici: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. The drawing now shows only those and the Medici: "12 of 15 nodes", and I counted 12 dots.
- **Checked link:** Pazzi -- Salviati -- Medici. Held: the find box showed Pazzi's one marriage, to the Salviati, and the Salviati married the Medici.
- **Ease:** 6 of 7. The "Neighborhood" entry in the person's three-dot menu, with Hops 1/2/3 and a list of names, was exactly the question in the program's own words. The 1-hop list matched the six edges search had shown me, which saved a check. The legend saying "full graph" after the filter told me when the colors were counted.
- **What confused me / what I missed:**
  - I had to find "Neighborhood" behind a three-dot menu; nothing on the person's panel said it was there.
  - The 2-hop list does not say through whom each family is reached. I had to search Pazzi by hand to see the Salviati in the middle. For print I need the "via" family next to each name.
  - "Medici and 11 connections" -- "connections" for families two marriages out is loose; they are not connected to the Medici, they are connected to someone who is.
  - After filtering, the dots carry no names, so the drawing alone does not show which three families were dropped. I can't confirm that from the picture; I took it from the list.
