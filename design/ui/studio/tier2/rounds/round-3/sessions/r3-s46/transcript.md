# Session r3-s46 -- transcript

Participant: Nadia (level-1 alert reviewer), returning user.
Build: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/
Every command below is `REAL_DIST=<that dir> node design/ui/studio/tool/real.mjs ...` with the session folder as `<session>`.

Task: the Florentine marriages network is open. Which families are at most two marriages from the Medici? How many, not counting the Medici? Then change the drawing to show only the Medici and those families.

## Step 0 -- start

`--start <session> setup:florentine-ranked.txt` -> 01.png

01.png: Florentine families open, PageRank run selected, sizes and colors by PageRank. No names on the dots. Left: find box, Selection, PageRank (15), Everything. "No names on the dots. Same as always -- I'll type Medici into the find box."

## Step 1 -- find Medici

`--step <session> --click "Find nodes, edges, values" --type "Medici"` -> 02.png

02.png: Nodes 1 (Medici), Edges 6: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. That is the first marriage ring -- six families. "Good, that part I can read off." Now I need the second ring. Next: click Medici to open it and look for anything about "two away".

## Step 2 -- open Medici

`--step <session> --click "Medici"` -> 03.png, refused as ambiguous (the node and its six edges all carry the name), nothing happened.
`--step <session> --click "Medici#1"` -> 04.png

04.png: Medici selected, ringed in yellow on the canvas. Right panel: id, name, Degree 6 with an arrow, PageRank #1 of 15. Selection count 1. "Degree 6 matches the six edges. Where is the 'two away' bit?" Next: the three-dot menu on the Medici panel -- the only thing here that looks like it does more.

## Step 3 -- node actions menu

`--step <session> --click-at 1419,74` (button "Node actions") -> 05.png

05.png: menu with Neighborhood (G), Path between... (P), Frame selection (F), Add note (N). "Neighborhood -- sounds like who they're tied to. Never used it." Next: click Neighborhood.

## Step 4 -- Neighborhood

`--step <session> --click "Neighborhood"` -> 06.png

06.png: panel "Medici and 6 connections", Hops 1 / 2 / 3 (1 on), a "Filter to neighbors" button, and the six names. Selection count went to 7 and those seven dots are ringed. "Hops. One hop from Medici, I guess -- so two marriages away should be 2." Next: click 2.

## Step 5 -- two hops

`--step <session> --click-at 1350,178` (label "2") -> 07.png

07.png: "Medici and 11 connections". List: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. Selection count 12 (11 plus Medici). Three dots are not ringed. "So it's 11, not counting the Medici. That's the number for the file. Under a minute -- before, I'd have read six lists one after another and written the names down." Next: "Filter to neighbors" for the drawing. Not sure whether that deletes the other families or only hides them.

## Step 6 -- filter to neighbors

`--step <session> --click "Filter to neighbors"` -> 08.png

08.png: the three outlying dots are gone; the top bar now reads "12 of 15 nodes" with a funnel icon. The button is grayed out. The legend now says "PageRank, full graph", and the PageRank row on the left shows a different, clock-like icon. "12 of 15 -- Medici plus my 11. So it's hiding, not deleting? '12 of 15' says the other 3 are still in there." Next: hover the "12 of 15 nodes" to make sure I didn't throw data away before QA asks.

## Step 7 -- check the filter

`--step <session> --hover-at 297,20` -> 09.png
Printed: button "Filter: 12 of 15 nodes"; tooltip "Showing only: "within 2 hops of Medici". Click to open Filters, where you can turn it off."

"Good: it's a view filter, it says what it is, and I can turn it off. That's what I'd write in the file." Done.

`--end <session>`

## End of session, in character

- Finished: yes. 11 families within two marriages of the Medici (Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni); the drawing now shows only those 12 (filter "within 2 hops of Medici", 12 of 15 nodes).
- Ease: 6 of 7.
- What confused me:
  - Clicking "Medici" in the search results was refused because the edges carry the name too; I had to pick the first one. In real use I'd just click the top row, but it cost a step.
  - "Neighborhood" lives behind the three-dot menu on the node panel. I only found it because that was the only menu there. Nothing on the panel itself says "who is two away".
  - "Hops" -- I guessed one hop means one marriage from the Medici. The list growing from 6 to 11 at 2 made it make sense, but the word alone didn't tell me.
  - After filtering, the legend says "full graph" and the PageRank row changed its icon. I don't know if that means my ranking is now stale or wrong for the 12 families. QA would ask which numbers the picture shows.
  - I wasn't sure whether "Filter to neighbors" removed families from the data until I hovered the count in the top bar. The tooltip answered it; I'd like that said before I click, not after.
