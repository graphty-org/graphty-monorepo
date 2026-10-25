# Session r4-s54 -- Ruth, returning

Task: go to the Medici family, read what the program knows about them, see which families they married into; say who and how many.

Session folder (screenshots, session.json): /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s54

All commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and S=<session folder above>.

## Step 0 -- start

`node design/ui/studio/tool/real.mjs --start $S setup:florentine-ranked.txt` -> 01.png

01.png: "Florentine families" is open. Left: a find box, a "PageRank" run with 15, "Everything". The drawing is 15 orange balls, no names on them. A legend for PageRank size and color. Right panel shows the PageRank run's Style. No names anywhere yet. As before: type the name into the find box.

## Step 1 -- type the name

`--step $S --click "Find nodes, edges, values" --type "Medici"` -> 02.png

02.png: the list under the box says "Nodes 1: Medici" and "Edges 6": Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati. That already reads like six marriages. But the edge list has a scrollbar, so I am not sure six is all of them. Next: click the Medici row and read the right-hand panel, which is where I read ties before.

## Step 2 -- open Medici

`--step $S --click "Medici"` -> refused as ambiguous (the node row and six tie rows all contain "Medici"); no change (03.png). A person would just click the top row, so:
`--step $S --click "Medici#1"` -> 04.png

04.png: the big dark ball in the middle gets a yellow ring. Right panel: "Medici, Node". Values tab: id Medici, name Medici, Degree 6 (with an arrow). Results: PageRank 0.1458, #1 of 15. The list of who they are tied to that I used before is not shown; Degree 6 has an arrow, so the names are probably behind it. Next: click Degree.

## Step 3 -- the connections

`--step $S --click "Degree"` -> 05.png

05.png: "Medici and 6 connections", Hops 1 selected, then six names: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. Six balls get yellow rings on the drawing, and "Selection" on the left says 7 (Medici plus six). The six names match the six ties the search showed. 6 = 6 = 7 minus 1: the counts agree three ways. Next: check one link from the other side -- click Ridolfi and see whether Medici is listed among theirs.

## Step 4 -- check one link from the other side

`--step $S --click "Ridolfi"` -> 06.png

06.png: clicking the name jumped to Ridolfi: Node, Degree 3, PageRank 0.06957 #6 of 15. The ring moved to a ball left of Medici, joined to it by a line. Ridolfi's names are behind Degree again. Next: click Degree to see if Medici is among Ridolfi's three.

## Step 5 -- Ridolfi's ties

`--step $S --click "Degree"` -> 07.png

07.png: "Ridolfi and 3 connections": Medici, Strozzi, Tornabuoni. Medici is there, so the Medici-Ridolfi link holds from both sides. Tornabuoni is in both lists too, which fits. I have my answer; ending.

## End

`--end $S` -> "session ended", no further request.

## In my own words (Ruth)

- **Did I finish?** Yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi, Salviati and Tornabuoni. The program also told me their PageRank is 0.1458, #1 of 15, and that their id and name are both "Medici". That is all it holds on them -- no dates, no other facts.
- **How I know it is all of them:** three counts agree -- the search showed "Edges 6", the panel says Degree 6 and lists six names, and the selection counter says 7 (Medici plus six). I checked one link from the other side: Ridolfi's list includes Medici. It held.
- **Ease:** 6 of 7. Five steps, no dead ends.
- **What confused me:**
  - The list of connections, which is what I came back for, is no longer on the person's page; I had to guess that the arrow next to "Degree 6" opens it. It did, but the word "Degree" does not say "names inside".
  - The drawing still has no names on it. The yellow rings show which balls are Medici's in-laws, but I cannot tell which ball is which family without clicking each one.
  - Clicking a name in the connections list moved me to that family's page at once. Handy, but it took me away from the Medici list without asking; "Back to Medici" was only there while I stayed in the list.
