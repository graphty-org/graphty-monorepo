# Session r4-s14 -- Ruth, returning

Task: the Strozzi want a message carried to the Pazzi, only between families joined by marriage,
through as few families as possible. Which families does it pass through, in order?

Session folder: tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s14 (in the studio worktree).
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/

## Step 1 -- start

    node design/ui/studio/tool/real.mjs --start <session> setup:florentine-ranked.txt

01.png: Florentine families is open. Left panel: a find box "Find nodes, edges, values", Selection,
a PageRank row (15), Everything. Right panel shows PageRank style. Dots with no names on them.
"No names on the drawing. Fifteen dots -- fifteen families, I'll take that for now. Start with a name."

## Step 2 -- find Strozzi

    node design/ui/studio/tool/real.mjs --step <session> --click "Find nodes, edges, values" --type "Strozzi"

02.png: Nodes 1 (Strozzi); Edges 4: Castellani -- Strozzi, Peruzzi -- Strozzi, Strozzi -- Ridolfi,
Strozzi -- Bischeri. "Four marriages. Written down. None of them is Pazzi, so the message needs at
least one stop in between. I've never asked this thing how two people are linked -- the analysis
button in the toolbar is where I ranked people before. I'll look there."

## Step 3 -- hover the flask

    --hover-at 615,864   -> button "Analyze", tooltip "Analyze Shift+A"

## Step 4 -- open Analyze

    --click "Analyze"

04.png: a list with "Filter analyses" box. Recent: PageRank. "Rank nodes and edges": Degree,
Betweenness, Edge betweenness, Closeness, PageRank, Eigenvector, Katz, HITS, All-pairs distance...
"These are rankings. I want a route from one family to another. I'll type 'path' in the filter."

## Step 5 -- filter "path"

    --type "path"

05.png: "Find paths and edge sets": Shortest path (Start here) "The fewest steps, or the shortest path
by weight, between two nodes."; Guided route "Select 2 nodes first". "'The fewest steps ... between
two nodes.' That is my question word for word. Shortest path."

## Step 6 -- Shortest path

    --click "Shortest path"

06.png: a form: From "Where the path starts", To "Where the path ends", Weight None, Advanced,
Find path. "Plain enough. Weight None -- good, I want fewest families, not anything weighted.
From: Strozzi."

## Step 7 -- type Strozzi in From

    --type "Strozzi"

07.png: a suggestion list under From with one entry, Strozzi. "Take it."

## Step 8 -- Enter

    --key Enter

08.png: From reads Strozzi; focus moved to To. "Good, it moved me on by itself. To: Pazzi."

## Step 9 -- type Pazzi in To

    --type "Pazzi"

09.png: suggestion Pazzi under To. "There it is. Enter, then Find path."

## Step 10 -- Enter

    --key Enter

10.png: From Strozzi, To Pazzi, Weight None; focus on Find path. "Find path."

## Step 11 -- Find path

    --click "Find path"

11.png: right panel "Shortest path", Values tab. Summary: Path 5 nodes, 4 edges. Nodes in order:
1 Strozzi, 2 Ridolfi, 3 Medici, 4 Salviati, 5 Pazzi. Made with: Shortest path, From Strozzi, To
Pazzi, Weight None, "Each edge counts as 1." The path is drawn black on the map; a "Shortest path
4 hops" row joined the left list.
"Names, in order, numbered. Reading aloud: Strozzi, Ridolfi, Medici, Salviati, Pazzi. Three families
in between. 'Each edge counts as 1' -- so it counted marriages, not anything else. Says who? Says
the panel, and it tells me what it counted. Strozzi -- Ridolfi I already saw in Strozzi's tie list
(step 2). Let me check the other end: who is Pazzi married to?"

## Step 12 -- check Pazzi

    --click "Find nodes, edges, values" --key Control+a --type "Pazzi"

12.png: Nodes 1 Pazzi; Edges 1: Salviati -- Pazzi. "Pazzi married into one family only, the Salviati.
So the last link, Salviati to Pazzi, holds -- and any route at all has to come in through the
Salviati. One more: the middle link, Ridolfi to Medici."

## Step 13 -- check Ridolfi

    --click "Find nodes, edges, values" --key Control+a --type "Ridolfi"

13.png: Ridolfi, Edges 3: Medici -- Ridolfi, Strozzi -- Ridolfi, Ridolfi -- Tornabuoni. "Both of
Ridolfi's links in the chain are real marriages on the program's own list. Three of four links
checked against the tie lists: Strozzi-Ridolfi, Ridolfi-Medici, Salviati-Pazzi. Good enough to
take to the desk. Ending."

## Step 14 -- --end

    node design/ui/studio/tool/real.mjs --end <session>

Answered with a further request: "The Peruzzi now want a message carried to the Ginori the same way.
Which families does it pass through, in order?" "Same again, Peruzzi to Ginori. Back to Analyze."

## Step 15 -- Analyze again

    --click "Analyze"

14.png: the list again, Shortest path now first under Recent. "Handy. Click it."

## Step 16 -- Shortest path (from Recent)

    --click-at 501,448   -> option "Shortest path ..."

15.png: the empty form again, focus in From. "Same as before: Peruzzi, Enter, Ginori, Enter."

## Step 17 -- Peruzzi to Ginori

    --type "Peruzzi" --key Enter --type "Ginori"

16.png: From Peruzzi; To shows Ginori with the suggestion Ginori open. "Enter, then Find path."

## Step 18 -- Find path

    --key Enter --click "Find path"

17.png: Path 5 nodes, 4 edges. Nodes in order: 1 Peruzzi, 2 Bischeri, 3 Guadagni, 4 Albizzi,
5 Ginori. From Peruzzi, To Ginori, Weight None, "Each edge counts as 1." New path drawn black on
the right side of the map.
"Peruzzi, Bischeri, Guadagni, Albizzi, Ginori. Written down. I notice the left list still shows one
'Shortest path 4 hops' row and the Strozzi chain is gone from the map and the panel -- this run
seems to have replaced the first one rather than sitting beside it. I have the first chain in my
notes, so no harm today, but I'd have liked both kept. Check the Ginori end."

## Step 19 -- check Albizzi

    --click "Find nodes, edges, values" --key Control+a --type "Albizzi"

18.png: Albizzi, Edges 3: Medici -- Albizzi, Albizzi -- Ginori, Albizzi -- Guadagni. "Two links of
the chain in one look: Guadagni-Albizzi and Albizzi-Ginori. They hold. Done. Ending."


## Step 20 -- --end

    node design/ui/studio/tool/real.mjs --end <session>

Session ended.

## Ruth's verdict

**Did I finish?** Yes, both.

- Strozzi to Pazzi: Strozzi, Ridolfi, Medici, Salviati, Pazzi (three families in between, 4 marriages).
  Checked Strozzi-Ridolfi, Ridolfi-Medici and Salviati-Pazzi against each family's own tie list.
- Peruzzi to Ginori: Peruzzi, Bischeri, Guadagni, Albizzi, Ginori (three in between, 4 marriages).
  Checked Guadagni-Albizzi and Albizzi-Ginori against Albizzi's tie list.

**Ease: 6 of 7.**

What helped: typing "path" in the analysis list found "Shortest path -- the fewest steps ... between
two nodes", which was my question in plain words. The From and To boxes took names and moved me on
by themselves. The answer came as names, numbered in order, with "Each edge counts as 1" telling me
what was counted. That is a result I can check, and I did.

What confused me or I'd want:

- The second run replaced the first. After Peruzzi-Ginori, the Strozzi-Pazzi chain was gone from
  the map and the panel, and the left list still showed a single "Shortest path 4 hops" row. I had
  it written down, but a reporter running several chains wants them side by side, each named by its
  two ends, not one row that silently changes meaning. I can't confirm from the screen whether the
  first run is kept somewhere.
- Neither run says whether it is the only shortest chain or one of several of the same length. For
  Pazzi I could work it out (Pazzi married only the Salviati; Ginori married only the Albizzi), but
  the program did not tell me. An editor will ask "is that the only route?".
- Small: the drawing still has no names on the dots, so the black line on the map is only useful
  after reading the panel. Not a blocker; the panel names everything.
