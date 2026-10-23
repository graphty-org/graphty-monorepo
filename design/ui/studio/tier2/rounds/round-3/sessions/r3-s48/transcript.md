# Session r3-s48 transcript (Ruth, returning)

Task: the Florentine marriages network is open. Which families are at most two marriages away
from the Medici (not counting the Medici)? How many? Then change the drawing so it shows only the
Medici and those families.

Every command ran from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ node design/ui/studio/tool/real.mjs`;
`<session>` below is the session folder. Screenshots 01.png to 08.png sit beside this file.

## Step 1 -- start

    --start <session> setup:florentine-ranked.txt

01.png: "Florentine families" open, a PageRank run selected in the left panel (15), its Style tab
on the right. Dots, no names on the drawing. Toolbar at the bottom: flask, a chart icon, 3D,
magnifier. I start with a name: "Medici" in the find box.

## Step 2

    --step <session> --click "Find nodes, edges, values" --type "Medici"

02.png: the list shows Nodes 1 (Medici) and Edges 6: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni,
Albizzi, Salviati. That is one marriage away: 6 families. Written down. Now I click Medici to see
the right-hand panel I used before.

## Step 3

    --step <session> --click "role=option:Medici"

03.png: Medici selected, right panel Values: Degree 6, PageRank 0.1458, #1 of 15. Selection count 1.
Degree 6 matches the six edges. There is a "..." button at the top right of the panel; maybe it
can take in the neighbors. I open it.

## Step 4

    --step <session> --click-at 1419,74      (button "Node actions")

04.png: menu: Neighborhood (G), Path between... (P), Frame selection (F), Add note (N).
"Neighborhood" is the word for my question. I pick it.

## Step 5

    --step <session> --click "Neighborhood"

05.png: "Medici and 6 connections", Hops 1 / 2 / 3, a "Filter to neighbors" button, and the six
names listed alphabetically -- the same six as the edge list. Selection now 7. "Hops 2" is exactly
"at most two marriages away". I click 2.

## Step 6

    --step <session> --click "2"

06.png: "Medici and 11 connections". Names: Acciaiuoli, Albizzi, Barbadori, Castellani, Ginori,
Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. I count 11 aloud; Selection says 12 =
Medici + 11. The five new ones (Castellani, Ginori, Guadagni, Pazzi, Strozzi) are not in the
Medici's own edge list, so they are the second-marriage families. Answer: 11. Three dots on the
drawing are not highlighted, which fits 15 - 12 = 3. Now "Filter to neighbors" to make the drawing
only these.

## Step 7

    --step <session> --click "Filter to neighbors"

07.png: the top bar now says "12 of 15 nodes" with a filter icon; three dots are gone, 12
highlighted dots left. The legend says "PageRank, full graph" -- good, it tells me the sizes were
counted over all 15, not the 12. The button greys out. Now I check one link: Pazzi is in the list
but did not marry a Medici, so who connects them? I type Pazzi in the find box.

## Step 8

    --step <session> --click "Find nodes, edges, values" --type "Pazzi"

08.png: Pazzi has one edge: Salviati -- Pazzi. Salviati -- Medici was in the Medici edge list at
step 2. So Pazzi is two marriages away through Salviati. The link held. The drawing still shows
"12 of 15 nodes". I have my answer and the drawing; I end.

## Step 9 -- end

    --end <session>

The session ended with no further request.

## In character, at the end

- **Did I finish?** Yes. 11 families, not counting the Medici: Acciaiuoli, Albizzi, Barbadori,
  Castellani, Ginori, Guadagni, Pazzi, Ridolfi, Salviati, Strozzi, Tornabuoni. The drawing shows
  only those 11 and the Medici ("12 of 15 nodes").
- **Ease: 6 of 7.** Neighborhood with a Hops control is the question I had, in names, with a count
  and a one-click filter. I checked Pazzi through Salviati and it held.
- **What confused me or slowed me:**
  - Neighborhood lives behind an unlabeled "..." on the panel. I found it only because I went
    looking; I would not have guessed it from the main screen.
  - The list does not say which families are one marriage away and which are two. I worked that
    out by comparing against the Medici's own edge list. For print I want "through whom" next to
    each second-step name.
  - The drawing still has no names on it. The answer is in names in the panel, so it did not stop
    me, but the filtered picture alone is not something I could hand an editor.
  - After filtering, "Filter to neighbors" just greys out. The top bar's "12 of 15 nodes" told me
    it worked; I did not see where to undo it here, and I did not need to.

## Note on the tool (not in character)

`--end` copied the session folder from `tmp/studio-sessions/...` into this folder and replaced
the folder's contents, deleting the transcript written here during the session; it was rewritten
after `--end`. The briefing command also wrote the session folder under `tmp/studio-sessions/`
rather than the path the task named, so the transcript was written to a folder that `--end` later
overwrote.
