# Session r2-s26 -- Ruth (returning reporter), Florentine families

Prompt: "You have used this program a few times. The ready-made network of marriages between the
leading families of Renaissance Florence is already open. The Strozzi want a message carried to the
Pazzi, passed only between families joined by marriage, through as few families as possible. Which
families does it pass through, in order?"

Build: the frozen build named on the first line of criteria.md (8f0d5a6f7791).
All commands run from design/ui/studio/tier2 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/ and
R=rounds/round-2/sessions/r2-s26.

## Start

`node ../tool/real.mjs --start $R setup:florentine-ranked.txt` -> 01.png

01.png: The map of Florentine families, colored and sized by PageRank -- a run I did earlier, it seems.
Fifteen balls, no names on any of them. The left panel has a find box, Selection, PageRank (15) and
Everything. Right panel shows PageRank's Style. Toolbar at the bottom: a flask, a chart-ish icon, 3D,
a magnifier.

Ruth: "No names on the dots. Fine. I start where I always start -- the find box. Strozzi."

## Step 2

`--step $R --click "Find nodes, edges, values" --type "Strozzi"` -> 02.png

02.png: The find box lists Nodes 1 (Strozzi) and Edges 4: Castellani, Peruzzi, Ridolfi, Bischeri.
Good -- names, not dots. Strozzi married into four families.

Ruth: "Four ties. Now the other end -- who did the Pazzi marry?"

## Step 3

`--step $R --click "Find nodes, edges, values" --key Control+a --type "Pazzi"` -> 03.png

03.png: Pazzi has one tie only: Salviati -- Pazzi. So any message to the Pazzi has to come through
the Salviati.

Ruth: "One door in. Salviati. Who did the Salviati marry?"

## Step 4

`--step $R --click "Find nodes, edges, values" --key Control+a --type "Salviati"` -> 04.png

04.png: Salviati has two ties: Medici and Pazzi. So the tail of any chain is ... Medici, Salviati,
Pazzi.

Ruth: "So it runs through the Medici. Does any of the Strozzi's four in-laws -- Castellani, Peruzzi,
Ridolfi, Bischeri -- touch the Medici? Medici next."

## Step 5

`--step $R --click "Find nodes, edges, values" --key Control+a --type "Medici"` -> 05.png

05.png: Medici, Edges 6: Acciaiuoli, Barbadori, Ridolfi, Tornabuoni, Albizzi, Salviati.

Ruth works it out on her pad:
- Strozzi's in-laws: Castellani, Peruzzi, Ridolfi, Bischeri.
- Pazzi's only in-law: Salviati. Salviati's: Medici, Pazzi.
- Medici's in-laws include Ridolfi -- and Ridolfi is also on the Strozzi list. Ridolfi is the only
  family on both lists.
- Could it be shorter? Three ties would need a Strozzi in-law married to the Salviati; the Salviati
  married only the Medici and the Pazzi, and the Strozzi did not marry the Medici. So no.

Answer: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi. It passes through the Ridolfi, the Medici
and the Salviati: three families in between, four marriages.

Checks one link: "Strozzi -- Ridolfi" was on the Strozzi list in 02.png, and "Medici -- Ridolfi" on
the Medici list here. Held.

Ruth: "Done. I did it with the find box and a pencil, though. The program never told me this was the
fewest -- I proved it by elimination. Fine on fifteen families; on my board list it would be an
evening."

Prompt A declared done. Follow-up given: "The Peruzzi now want a message carried to the Ginori the
same way. Which families does it pass through, in order?"

Ruth: "Ginori. Let me see who they married."

## Step 6

`--step $R --click "Find nodes, edges, values" --key Control+a --type "Ginori"` -> 06.png

06.png: Ginori, one tie: Albizzi -- Ginori. Same shape as before: one door in.

Ruth: "Again by hand? This is the second time. Before I do another round of pencil work, let me see
whether the analysis button -- the one I used for ranking -- has anything for how two families are
linked."

## Step 7

`--step $R --click-at 680,864` (the flask; the tool says button "Analyze") -> 07.png

07.png: A list with a "Filter analyses" box. Recent: PageRank. "Rank nodes and edges": Degree,
Betweenness ("sit on the most shortest paths between others"), Edge betweenness, Closeness,
PageRank, Eigenvector, Katz, HITS, All-pairs distance ("How far each node is from all the
others"). All of these rank everybody. None reads "how are these two linked". The list scrolls.

Ruth: "These all score everyone. I want two particular families. The filter box -- try my own word:
linked."

## Step 8

`--step $R --type "linked"` -> 08.png

08.png: Only "Find groups": Louvain ("densely linked groups") and Leiden. Groups, not a chain
between two families.

Ruth: "Not that. Try 'between' -- that is the word I would use: what lies between the Peruzzi and
the Ginori."

## Step 9

`--step $R --key Control+a --type "between"` -> 09.png

09.png: Now a section "Find paths and edge sets": "Shortest path -- Start here -- The fewest steps,
or the shortest path by weight, between two nodes." and "Guided route -- Select 2 nodes first"
(grayed). Betweenness and Edge betweenness above.

Ruth: "'The fewest steps between two nodes.' Those are my words -- fewest, between two. That is the
one. It was not in the first list I saw without scrolling, and 'linked' did not find it; 'between'
did. Click it."

## Step 10

`--step $R --click "Shortest path"` -> 10.png

10.png: A form: From ("Where the path starts"), To ("Where the path ends"), Weight: None, Advanced,
and a "Find path" button. Clear enough.

Ruth: "From: Peruzzi."

## Step 11

`--step $R --click "Where the path starts" --type "Peruzzi"` -> 11.png

11.png: A suggestion under the From box: "Peruzzi". Pick it.

## Step 12

`--step $R --click-at 559,679` (option "Peruzzi") -> 12.png

12.png: From holds "Peruzzi"; the cursor has moved to To on its own. Nice.

Ruth: "To: Ginori."

## Step 13

`--step $R --type "Ginori"` -> 13.png

13.png: Suggestion "Ginori" under To. Pick it, then Find path. Weight stays None -- marriages have no
weight; I want the fewest families.

## Step 14

`--step $R --click-at 555,733 --click "Find path"` -> 14.png

14.png: The panel on the right now reads "Shortest path", Values tab: Summary "Path: 5 nodes, 4
edges". "Nodes in order": Peruzzi 1, Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5. "Made with":
Shortest path, From Peruzzi, To Ginori, Weight None, "Each edge counts as 1." The map shows the five
families and four ties in black, and the legend says "On the path". Left panel: "Shortest path, 4
hops".

Ruth: "Names, in order, numbered. And it says what it counted -- each marriage counts as one. That
is what I needed the first time. Peruzzi, Bischeri, Guadagni, Albizzi, Ginori: through the Bischeri,
the Guadagni and the Albizzi. The last link, Albizzi -- Ginori, I already saw in the find box
(06.png). Let me check a middle one myself: did the Bischeri marry the Guadagni?"

## Step 15

`--step $R --click "Find nodes, edges, values" --key Control+a --type "Bischeri"` -> 15.png

15.png: Bischeri, Edges 3: Peruzzi -- Bischeri, Strozzi -- Bischeri, Bischeri -- Guadagni. Both of
Bischeri's links on the chain are there. Held.

Ruth: "Held. Follow-up answer: the Peruzzi to the Ginori passes through the Bischeri, the Guadagni
and the Albizzi, in that order -- four marriages.

Now that I know the program does this, I want it to check my pencil work on the first one,
Strozzi to Pazzi. Back to the analysis button."

## Step 16

`--step $R --click "Analyze"` -> 16.png

16.png: The list now has Shortest path under Recent, at the top. Good.

## Step 17

`--step $R --click-at 565,448` (Recent: Shortest path) -> 17.png

17.png: An empty Shortest path form again. Fine -- new question.

## Step 18

`--step $R --click "Where the path starts" --type "Strozzi"` -> 18.png

18.png: Suggestion "Strozzi". Pick it; focus should hop to To as before.

## Step 19

`--step $R --click-at 557,679 --type "Pazzi"` -> 19.png

19.png: From Strozzi, To shows "Pazzi" with its suggestion.

## Step 20

`--step $R --click-at 553,733 --click "Find path"` -> 20.png

20.png: Nodes in order: Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5. "5 nodes, 4 edges",
From Strozzi, To Pazzi, each edge counts as 1. Same as my pencil. The black chain on the map runs
from the top-left dot down through the big Medici dot to the bottom-left.

Ruth notices: the left list still shows one "Shortest path, 4 hops" line, and the right panel now
holds only the Strozzi chain. The Peruzzi-to-Ginori chain I ran a minute ago is no longer listed
anywhere I can see. "So asking a second question wiped the first answer? I have it on my pad, but if
I had not written it down I would have to run it again. I would want to keep both chains for the
editor."

## End

`node ../tool/real.mjs --end $R` -- the tool printed the follow-up request word for word (the
Peruzzi to the Ginori), which had already been answered in steps 6 to 15 of this session, so
`--end` was run a second time to close the session.

## In character: wrap-up

**Did I finish?** Yes, both.

- Strozzi to Pazzi: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi. The message passes through
  the Ridolfi, the Medici and the Salviati -- four marriages. Worked out first by hand from the find
  box, then confirmed by the program's Shortest path.
- Follow-up, Peruzzi to Ginori: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori. Through the
  Bischeri, the Guadagni and the Albizzi -- four marriages. Checked Albizzi -- Ginori and both
  Bischeri links myself in the find box; they held.

**Ease: 5 of 7.** Once I found Shortest path, it was the best thing in the program: names in
order, numbered, "each edge counts as 1", From and To written back to me. That saves me a check.
Getting there was the hard part.

**What confused me:**

1. I did not know the program could answer "how are these two linked" at all. The first time I
   did the whole thing by hand with the find box -- fine on fifteen families, an evening on my
   board list. Nothing near the find box or a family's tie list says "how is this one linked to
   another?".
2. In the analysis list, the first screenful is all ranking measures that score everybody. Shortest
   path sits below them, under "Find paths and edge sets", out of sight until you scroll. My first
   word, "linked", found only the grouping methods (Louvain, Leiden); only "between" turned it up.
3. "Shortest path", "nodes", "edges", "4 hops" -- not my words, but the line under it ("The fewest
   steps ... between two nodes") was, and that is what decided it.
4. Running a second chain replaced the first one. The Peruzzi-to-Ginori answer vanished from the
   panel and the list when I ran Strozzi-to-Pazzi. I had to trust my pad.
5. "Guided route -- Select 2 nodes first" was grayed out; I did not know what it was or how it
   differed from Shortest path, and I did not need it.
6. The dots still carry no names on the map; the black chain is only readable through the list on
   the right. The list is what I trust anyway.
