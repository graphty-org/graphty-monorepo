# Session r1-s56 -- Jordan (returning marketing analyst), task T12R, prompt B (Florentine families)

Build: 946256efb876 (frozen copy tier2-r1d4-946256efb). Tool: real.mjs.

Prompt: "You have used this program a few times. The ready-made network of the leading families of
Renaissance Florence and the marriages between them is already open. Go to the Medici family, read
what the program knows about them, and see which families they married into. Tell us who they are
and how many."

## Start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/ node real.mjs --start r1-s56 setup:florentine-ranked.txt

01.png: The Florentine network is up, sized and colored by PageRank (a PageRank row in the left list,
its Style panel on the right). No names drawn on the dots. Familiar shell. I'll do what I always do
for one customer: type the name in the find box.

## Step 2

    node real.mjs --step r1-s56 --click "Find nodes, edges, values" --type "Medici"

02.png: Find box shows Nodes 1 (Medici) and Edges 6: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni,
Albizzi, Salviati. That already looks like the marriages. The canvas did not highlight anything.
Next: click the Medici result to open the family itself and read what the program knows.

## Step 3

    node real.mjs --step r1-s56 --click "Medici"
    (tool: ambiguous, 7 matches, took the first -- the node "Medici")

03.png: Medici is highlighted yellow in the middle (the biggest dot). Right panel: id Medici, name
Medici, Degree 6 with an arrow, and under Results PageRank 0.1458, #1 of 15. Good -- that's "what
the program knows". Next: open Degree 6, which I remember is the list of connections.

## Step 4

    node real.mjs --step r1-s56 --click "Degree"

04.png: Right panel switched to "Medici's 6 connections" with a "Back to Medici" link. The list:
Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The six families light up in yellow
on the canvas around the Medici, and Selection on the left now says 7 (Medici plus six). It matches
the six "Medici -- X" ties the find box showed in step 2. There's a new "Hops 1 2 3" row and a
"Filter to neighbors" button above the list I don't remember; I left them alone since 1 is already
picked and I only want direct marriages. Done.

## End

    node real.mjs --end r1-s56

## Debrief (in character)

- **Finished:** yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati, Tornabuoni. What the program knows about them: id and name "Medici", degree 6, and
  PageRank 0.1458, ranked #1 of 15.
- **Ease:** 7 of 7. Same three moves as my customer-circle routine: find box, click the name, open
  Degree. Four steps, no detours.
- **What confused me:**
  - Nothing blocked me. The find box already gave the answer as six "Medici -- X" edges before I
    clicked anything, which was a nice confirmation, though the edge rows list the pair in mixed
    order ("Acciaiuoli -- Medici" vs "Medici -- Barbadori"), so scanning for the other family takes
    a second.
  - The "Hops 1 2 3" row and "Filter to neighbors" are new to me. Hops looked like it might change
    the list, so I was briefly unsure whether 1 meant "direct ties only"; the count "6 connections"
    matching Degree 6 settled it. Neither got in the way.
  - The panel title says "Neighborhood" under Medici while the row I clicked said "Degree" -- two
    names for the same thing, minor.
  - The node labels are not drawn on the canvas, so without the find box I could not have spotted
    the Medici dot by eye (it is the biggest one, but I only know that because PageRank is #1).
