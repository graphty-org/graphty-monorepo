# Session r3-s56 -- transcript

Participant: Jordan, marketing network analyst, returning user.
Task: the Florentine marriage network is open. Go to the Medici family, read what the program
knows about them, and see which families they married into. Say who they are and how many.

All commands ran with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/
and `node design/ui/studio/tool/real.mjs`, on this session's own folder (written `<session>` below).

## Start

    --start <session> setup:florentine-ranked.txt

01.png: the Florentine families graph is open, colored and sized by a PageRank run (listed on the
left with 15). No names are drawn on the nodes. There is a find box at the top left -- I've used
that before to look at one customer's circle. I'll type Medici there.

## Step 2

    --step <session> --click "Find nodes, edges, values" --type "Medici"

02.png: the find box lists "Nodes 1: Medici" and "Edges 6": Acciaiuoli, Barbadori, Ridolfi,
Tornabuoni, Albizzi, Salviati, each paired with Medici. That already looks like the marriage list.
Next I'll click the Medici row to see what the program knows about the family itself.

## Step 3

    --step <session> --click "Medici"

Refused as ambiguous (7 matches: the node row and the six edge rows, which all contain "Medici");
03.png unchanged. I meant the node row, the first one.

## Step 4

    --step <session> --click "Medici#1"

04.png: Medici is selected (yellow glow on the biggest node in the middle) and the right panel
shows its Values: id Medici, name Medici, Degree 6 with an arrow, and Results: PageRank 0.1458,
#1 of 15. So the Medici are the most central family in the network, with six ties. I'll click
Degree to read who those six are, the way I read a customer's list of connections.

## Step 5

    --step <session> --click "Degree"

05.png: the panel now reads "Medici and 6 connections", Hops 1 selected, with a list: Acciaiuoli,
Albizzi, Barbadori, Ridolfi, Salviati, Tornabuoni. The six neighbors light up yellow on the map,
and Selection on the left now counts 7 (Medici plus six). Same six names as the find box's edge
list, so I trust it. That's my answer.

## End

    --end <session>

Session ended normally; no further request.

## Debrief (in character)

- **Finished?** Yes. The Medici married into 6 families: Acciaiuoli, Albizzi, Barbadori, Ridolfi,
  Salviati and Tornabuoni. The program knows their id and name (both "Medici"), that they have 6
  connections (degree 6), and that they rank #1 of 15 on the PageRank run (0.1458) -- the most
  influential family in this network.
- **Ease:** 6 of 7. Find box, click, read the list -- same path I use for a customer's circle.
- **What confused me:**
  - Typing "Medici" in the find box lists the six ties as edges right away, which answered the
    question before I even opened the family -- handy, but the node row and the edge rows look
    alike, and I had to be careful to pick the node itself (the plain "Medici" row).
  - The summary says "Degree 6", which is network jargon; I only knew to click it because the
    little arrow suggested it opened something. For a VP I'd translate that to "married into six
    families".
  - The panel doesn't say these connections are marriages; I'm relying on knowing the dataset.
